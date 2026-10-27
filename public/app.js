const teamSelect = document.getElementById('team');
const dateInput = document.getElementById('date');
const dateButton = document.getElementById('dateButton');
const searchBtn = document.getElementById('search');
const clearBtn = document.getElementById('clear');
const statusEl = document.getElementById('status');
const matchesEl = document.getElementById('matches');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const classificationStatusEl = document.getElementById('classificationStatus');
const classificationEl = document.getElementById('classification');
const calendarControls = document.getElementById('calendarControls');

let datePicker;

async function loadTeams() {
  const res = await fetch('/api/teams');
  const data = await res.json();
  for (const team of data.teams) {
    const opt = document.createElement('option');
    opt.value = team;
    opt.textContent = team;
    teamSelect.appendChild(opt);
  }
}

async function loadAvailableDates(team) {
  const params = new URLSearchParams();
  if (team) params.set('team', team);
  const res = await fetch(`/api/dates?${params.toString()}`);
  const data = await res.json();

  const currentValue = datePicker.input.value;
  datePicker.set('enable', data.dates);

  if (currentValue && !data.dates.includes(currentValue)) {
    datePicker.clear();
  }
}

function updateDateButtonLabel(dateStr) {
  if (!dateStr) {
    dateButton.textContent = 'Tria una jornada';
    dateButton.classList.remove('active-date');
    return;
  }
  const [year, month, day] = dateStr.split('-');
  dateButton.textContent = `${day}/${month}/${year}`;
  dateButton.classList.add('active-date');
}

function initDatePicker() {
  datePicker = flatpickr('.date-picker-wrap', {
    wrap: true,
    dateFormat: 'Y-m-d',
    locale: typeof flatpickr !== 'undefined' && flatpickr.l10ns.cat ? 'cat' : undefined,
    positionElement: dateButton,
    enable: [],
    onChange: (selectedDates, dateStr) => {
      updateDateButtonLabel(dateStr);
      loadMatches();
    },
  });
}

function isScheduleConfirmed(match) {
  return Boolean(match.time && match.time !== '00:00' && match.field);
}

function matchRowStatus(match) {
  if (match.status === 'postponed') return 'ajornat';
  if (match.status === 'played') return 'jugat';
  return isScheduleConfirmed(match) ? 'confirmat' : 'pendent';
}

function formatStatus(match) {
  const state = matchRowStatus(match);
  if (state === 'jugat') {
    return `<div class="score">${match.score}</div><div class="status-label tag-jugat">Jugat</div>`;
  }
  if (state === 'ajornat') {
    return `<div class="status-label tag-ajornat">Ajornat</div>`;
  }
  if (state === 'confirmat') {
    return `<div class="time">${match.time}</div><div class="status-label tag-confirmat">Confirmat</div>`;
  }
  return `<div class="status-label tag-pendent">Per confirmar</div>`;
}

function formatMatchDate(m) {
  try {
    const d = new Date(`${m.isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return m.date;
    const weekday = d.toLocaleDateString('ca-ES', { weekday: 'short' }).replace('.', '');
    const month = d.toLocaleDateString('ca-ES', { month: 'short' }).replace('.', '');
    return `${weekday} ${d.getDate()} ${month}`.toUpperCase();
  } catch {
    return m.date;
  }
}

function teamBlock(name, logoUrl, side) {
  return `
    <div class="team ${side}">
      ${logoUrl ? `<img src="${logoUrl}" alt="${name}" onerror="this.style.display='none'">` : ''}
      <span>${name}</span>
    </div>`;
}

function buildMatchCard(m) {
  const card = document.createElement('div');
  card.className = 'match-row status-' + matchRowStatus(m);

  card.innerHTML = `
    <div class="mr-date">${formatMatchDate(m)}</div>
    ${teamBlock(m.homeTeam, m.homeLogoUrl, 'home')}
    <div class="result">${formatStatus(m)}</div>
    ${teamBlock(m.awayTeam, m.awayLogoUrl, 'away')}
    <div class="meta">
      <span>${m.time && m.time !== '00:00' ? m.time : 'Hora per confirmar'}</span>
      <span>${m.field || 'Camp per confirmar'}</span>
      ${m.referee ? `<span>Àrbitre: ${m.referee}</span>` : ''}
      ${m.actPdfUrl ? `<span><a href="${m.actPdfUrl}" target="_blank" rel="noopener">Acta PDF</a></span>` : ''}
    </div>
  `;
  return card;
}

function renderMatches(matches) {
  matchesEl.innerHTML = '';

  if (!matches.length) {
    matchesEl.innerHTML = '<p class="empty">No hi ha partits amb aquests filtres.</p>';
    return;
  }

  const groups = new Map();
  for (const m of matches) {
    if (!groups.has(m.jornada)) groups.set(m.jornada, []);
    groups.get(m.jornada).push(m);
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  let dividerInserted = false;

  for (const [jornada, group] of groups) {
    const isFutureGroup = group.some((m) => m.isoDate >= todayIso);
    if (isFutureGroup && !dividerInserted) {
      const divider = document.createElement('div');
      divider.id = 'nextJornadaDivider';
      divider.className = 'jornada-divider';
      divider.textContent = 'Propera jornada';
      matchesEl.appendChild(divider);
      dividerInserted = true;
    }

    const section = document.createElement('div');
    section.className = 'jornada-group';

    const title = document.createElement('h2');
    title.textContent = jornada || 'Sense jornada';
    section.appendChild(title);

    for (const m of group) {
      section.appendChild(buildMatchCard(m));
    }

    matchesEl.appendChild(section);
  }
}

function scrollToNextJornada() {
  const divider = document.getElementById('nextJornadaDivider');
  if (divider) {
    divider.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateClearButtonState() {
  clearBtn.disabled = !teamSelect.value && !dateInput.value;
}

async function loadMatches() {
  updateClearButtonState();
  const team = teamSelect.value;
  const date = dateInput.value;

  const params = new URLSearchParams();
  if (team) params.set('team', team);
  if (date) params.set('date', date);

  statusEl.textContent = 'Carregant...';
  try {
    const res = await fetch(`/api/matches?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconegut');

    const parts = [];
    parts.push(team ? `Equip: ${team}` : 'Tots els equips');
    parts.push(date ? `Data: ${date}` : 'Calendari sencer');
    parts.push(`${data.count} partit(s)`);
    statusEl.textContent = parts.join(' · ');

    renderMatches(data.matches);
  } catch (err) {
    statusEl.textContent = '';
    matchesEl.innerHTML = `<p class="empty">Error carregant el calendari: ${err.message}</p>`;
  }
}

function renderClassification(standings) {
  if (!standings.length) {
    classificationEl.innerHTML = '<p class="empty">No hi ha classificació disponible.</p>';
    return;
  }

  const rows = standings
    .map(
      (s) => `
    <tr>
      <td>${s.position}</td>
      <td class="team-cell">
        ${s.logoUrl ? `<img src="${s.logoUrl}" alt="${s.team}" onerror="this.style.display='none'">` : ''}
        <span>${s.team}</span>
      </td>
      <td>${s.played}</td>
      <td>${s.won}</td>
      <td>${s.drawn}</td>
      <td>${s.lost}</td>
      <td>${s.pointsFor}</td>
      <td>${s.pointsAgainst}</td>
      <td>${s.pointsDiff}</td>
      <td>${s.triesFor}</td>
      <td>${s.triesAgainst}</td>
      <td>${s.offensiveBonus}</td>
      <td>${s.defensiveBonus}</td>
      <td class="points">${s.leaguePoints}</td>
    </tr>`
    )
    .join('');

  classificationEl.innerHTML = `
    <div style="overflow-x:auto">
      <table class="classification-table">
        <thead>
          <tr>
            <th>#</th><th>Equip</th><th>J</th><th>G</th><th>E</th><th>P</th>
            <th>PF</th><th>PC</th><th>DP</th><th>AF</th><th>AC</th><th>BO</th><th>BD</th><th>Punts</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function loadClassification() {
  classificationStatusEl.textContent = 'Carregant...';
  try {
    const res = await fetch('/api/classification');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconegut');

    classificationStatusEl.textContent = data.cachedAt
      ? `Actualitzat: ${new Date(data.cachedAt).toLocaleString('ca-ES')}`
      : '';
    renderClassification(data.classification);
  } catch (err) {
    classificationStatusEl.textContent = '';
    classificationEl.innerHTML = `<p class="empty">Error carregant la classificació: ${err.message}</p>`;
  }
}

function switchTab(tab) {
  tabBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  tabPanels.forEach((panel) =>
    panel.classList.toggle('active', panel.id === (tab === 'calendar' ? 'calendarTab' : 'classificationTabPanel'))
  );
  calendarControls.style.display = tab === 'calendar' ? '' : 'none';
  if (tab === 'classification') loadClassification();
}

tabBtns.forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

searchBtn.addEventListener('click', loadMatches);
clearBtn.addEventListener('click', () => {
  teamSelect.value = '';
  datePicker.clear(true);
  loadAvailableDates('');
});
teamSelect.addEventListener('change', () => {
  loadAvailableDates(teamSelect.value);
  loadMatches();
});

const DEFAULT_TEAM = 'CR SPARTANS';

initDatePicker();
loadTeams()
  .then(() => {
    if ([...teamSelect.options].some((opt) => opt.value === DEFAULT_TEAM)) {
      teamSelect.value = DEFAULT_TEAM;
    }
    return loadAvailableDates(teamSelect.value);
  })
  .then(loadMatches)
  .then(scrollToNextJornada);
