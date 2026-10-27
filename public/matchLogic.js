(function (root) {
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

  function formatMatchDate(match) {
    try {
      const d = new Date(`${match.isoDate}T00:00:00`);
      if (Number.isNaN(d.getTime())) return match.date;
      const weekday = d.toLocaleDateString('ca-ES', { weekday: 'short' }).replace('.', '');
      const month = d.toLocaleDateString('ca-ES', { month: 'short' }).replace('.', '');
      return `${weekday} ${d.getDate()} ${month}`.toUpperCase();
    } catch {
      return match.date;
    }
  }

  function findNextJornadaName(matches, todayIso) {
    const groups = new Map();
    for (const m of matches) {
      if (!groups.has(m.jornada)) groups.set(m.jornada, []);
      groups.get(m.jornada).push(m);
    }

    for (const [jornada, group] of groups) {
      if (group.some((m) => m.isoDate >= todayIso)) {
        return jornada;
      }
    }

    return null;
  }

  function hasActiveFilters(team, date) {
    return Boolean(team) || Boolean(date);
  }

  const api = {
    isScheduleConfirmed,
    matchRowStatus,
    formatStatus,
    formatMatchDate,
    findNextJornadaName,
    hasActiveFilters,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MatchLogic = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
