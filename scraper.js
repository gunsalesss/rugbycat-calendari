const cheerio = require('cheerio');

const SOURCE_URL = 'https://matchready.es/rugbycat/web/ca/public/calendar/56/37/combined/calendar/';
const BASE_URL = 'https://matchready.es';

function parseDateTime(dateText, timeText) {
  // dateText: dd/mm/yyyy, timeText: hh:mm
  const [day, month, year] = dateText.split('/').map(Number);
  const [hour, minute] = timeText.split(':').map(Number);
  const iso = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const isoDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return { isoDate, isoDateTime: iso.toISOString() };
}

function scrapeCalendarHtml(html) {
  const $ = cheerio.load(html);
  const matches = [];

  $('.workingDayRow').each((_, dayEl) => {
    const jornada = $(dayEl).find('.portlet-title h4').first().text().trim();

    $(dayEl)
      .find('tbody.calendarEventsTable > tr.eventRow')
      .each((__, row) => {
        const $row = $(row);
        const cells = $row.find('> td');

        const dateCell = $(cells[0]);
        const dateCellHtml = dateCell.html() || '';
        const [dateTextRaw, timeTextRaw] = dateCellHtml
          .split('<br>')
          .map((part) => part.replace(/<[^>]+>/g, '').trim());
        const dateText = (dateTextRaw || '').trim();
        const timeText = (timeTextRaw || '').trim();

        const homeCell = $(cells[1]);
        const homeTeam = homeCell.find('font').first().text().trim();
        const referee = homeCell.find('small.text-success').first().text().trim() || null;

        const homeLogo = $(cells[2]).find('img').attr('src');
        const homeLogoUrl = homeLogo ? BASE_URL + homeLogo : null;

        const resultCell = $(cells[3]);
        const resultLink = resultCell.find('a font').first().text().trim();
        const postponed = resultCell.find('.text-danger').first().text().trim();
        let status = 'pending';
        let score = null;
        if (resultLink) {
          status = 'played';
          score = resultLink;
        } else if (postponed) {
          status = 'postponed';
        }

        const awayLogo = $(cells[4]).find('img').attr('src');
        const awayLogoUrl = awayLogo ? BASE_URL + awayLogo : null;

        const awayCell = $(cells[5]);
        const awayTeam = awayCell.find('font').first().text().trim();
        const field = awayCell.find('small.text-success').first().text().trim() || null;

        const actPdfPath = $(cells[6]).find('a.fa-file-pdf-o').attr('href');
        const actPdfUrl = actPdfPath ? BASE_URL + actPdfPath : null;

        if (!dateText || !homeTeam || !awayTeam) return;

        const { isoDate, isoDateTime } = parseDateTime(dateText, timeText || '00:00');

        matches.push({
          jornada,
          date: dateText,
          time: timeText || null,
          isoDate,
          isoDateTime,
          homeTeam,
          awayTeam,
          homeLogoUrl,
          awayLogoUrl,
          field,
          referee,
          status,
          score,
          actPdfUrl,
        });
      });
  });

  matches.sort((a, b) => a.isoDateTime.localeCompare(b.isoDateTime));
  return matches;
}

// Dates de la fase final, encara sense equips assignats: no les publica Matchready
// fins que se sap qui hi juga, així que les afegim a mà.
const PLAYOFF_MATCHDAYS = [
  { jornada: 'Semifinal', date: '11/04/2027' },
  { jornada: 'Final', date: '18/04/2027' },
];

function buildPlayoffMatches() {
  return PLAYOFF_MATCHDAYS.map(({ jornada, date }) => {
    const { isoDate, isoDateTime } = parseDateTime(date, '00:00');
    return {
      jornada,
      date,
      time: null,
      isoDate,
      isoDateTime,
      homeTeam: 'A determinar',
      awayTeam: 'A determinar',
      homeLogoUrl: null,
      awayLogoUrl: null,
      field: null,
      referee: null,
      status: 'pending',
      score: null,
      actPdfUrl: null,
      isPlaceholder: true,
    };
  });
}

function scrapeClassificationHtml(html) {
  const $ = cheerio.load(html);
  const standings = [];

  $('#classificationTab table tbody tr').each((_, row) => {
    const cells = $(row).find('> td');
    if (cells.length < 14) return;

    const position = Number($(cells[0]).text().trim());
    const team = $(cells[1]).find('span').first().text().trim();
    const logo = $(cells[1]).find('img').attr('src');
    const logoUrl = logo ? BASE_URL + logo : null;
    const num = (i) => Number($(cells[i]).text().trim());

    standings.push({
      position,
      team,
      logoUrl,
      played: num(2),
      won: num(3),
      drawn: num(4),
      lost: num(5),
      pointsFor: num(6),
      pointsAgainst: num(7),
      pointsDiff: num(8),
      triesFor: num(9),
      triesAgainst: num(10),
      offensiveBonus: num(11),
      defensiveBonus: num(12),
      leaguePoints: num(13),
    });
  });

  standings.sort((a, b) => a.position - b.position);
  return standings;
}

async function fetchCompetitionHtml() {
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalendariRugbyBot/1.0)' },
  });
  if (!res.ok) {
    throw new Error(`Error descarregant dades de Matchready: ${res.status}`);
  }
  return res.text();
}

function withPlayoffMatches(matches) {
  return [...matches, ...buildPlayoffMatches()].sort((a, b) => a.isoDateTime.localeCompare(b.isoDateTime));
}

async function fetchMatches() {
  const html = await fetchCompetitionHtml();
  return withPlayoffMatches(scrapeCalendarHtml(html));
}

async function fetchCompetitionData() {
  const html = await fetchCompetitionHtml();
  return {
    matches: withPlayoffMatches(scrapeCalendarHtml(html)),
    classification: scrapeClassificationHtml(html),
  };
}

module.exports = {
  fetchMatches,
  fetchCompetitionData,
  scrapeCalendarHtml,
  scrapeClassificationHtml,
  SOURCE_URL,
};
