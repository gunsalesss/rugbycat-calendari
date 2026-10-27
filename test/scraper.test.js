const fs = require('fs');
const path = require('path');
const {
  scrapeCalendarHtml,
  scrapeClassificationHtml,
  fetchMatches,
  fetchCompetitionData,
} = require('../scraper');

const SAMPLE_HTML = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'calendar-sample.html'),
  'utf8'
);

describe('scrapeCalendarHtml', () => {
  const matches = scrapeCalendarHtml(SAMPLE_HTML);

  test('parses every match row from every jornada', () => {
    expect(matches).toHaveLength(4);
  });

  test('sorts matches chronologically by date/time', () => {
    const isoDateTimes = matches.map((m) => m.isoDateTime);
    const sorted = [...isoDateTimes].sort();
    expect(isoDateTimes).toEqual(sorted);
  });

  test('parses a played match with score, referee and field', () => {
    const match = matches.find((m) => m.homeTeam === 'TEAM A' && m.awayTeam === 'TEAM B');
    expect(match).toMatchObject({
      jornada: 'Jornada 1',
      date: '01/01/2026',
      time: '12:00',
      isoDate: '2026-01-01',
      status: 'played',
      score: '20 - 10',
      referee: 'Ref One',
      field: 'CAMP A',
    });
    expect(match.homeLogoUrl).toBe('https://matchready.es/rugbycat/web/uploads/club/images/upload-a.png');
    expect(match.actPdfUrl).toBe(
      'https://matchready.es/rugbycat/web/ca/public/competition/match_pdf/1001/act/'
    );
  });

  test('parses a postponed match', () => {
    const match = matches.find((m) => m.homeTeam === 'TEAM C' && m.awayTeam === 'TEAM D');
    expect(match.status).toBe('postponed');
    expect(match.score).toBeNull();
  });

  test('parses a pending match with no referee, camp or score', () => {
    const match = matches.find((m) => m.homeTeam === 'TEAM A' && m.awayTeam === 'TEAM C');
    expect(match.status).toBe('pending');
    expect(match.score).toBeNull();
    expect(match.referee).toBeNull();
    expect(match.field).toBeNull();
    expect(match.actPdfUrl).toBeNull();
  });

  test('keeps matches grouped under their own jornada', () => {
    const jornada2Match = matches.find((m) => m.homeTeam === 'TEAM B' && m.awayTeam === 'TEAM D');
    expect(jornada2Match.jornada).toBe('Jornada 2');
  });
});

describe('scrapeClassificationHtml', () => {
  const standings = scrapeClassificationHtml(SAMPLE_HTML);

  test('parses every standings row', () => {
    expect(standings).toHaveLength(2);
  });

  test('parses a standings row with all its stats', () => {
    expect(standings[0]).toMatchObject({
      position: 1,
      team: 'TEAM A',
      played: 2,
      won: 2,
      drawn: 0,
      lost: 0,
      pointsFor: 30,
      pointsAgainst: 10,
      pointsDiff: 20,
      triesFor: 4,
      triesAgainst: 1,
      offensiveBonus: 2,
      defensiveBonus: 0,
      leaguePoints: 10,
    });
    expect(standings[0].logoUrl).toBe(
      'https://matchready.es/rugbycat/web/uploads/club/images/upload-a.png'
    );
  });

  test('sorts standings by position', () => {
    expect(standings.map((s) => s.position)).toEqual([1, 2]);
  });
});

describe('fetchMatches / fetchCompetitionData (playoff placeholders)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_HTML),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('fetchMatches appends the Semifinal and Final placeholders at the end', async () => {
    const matches = await fetchMatches();
    expect(matches).toHaveLength(6);

    const placeholders = matches.filter((m) => m.isPlaceholder);
    expect(placeholders).toHaveLength(2);
    expect(placeholders.map((m) => m.jornada)).toEqual(['Semifinal', 'Final']);
    for (const p of placeholders) {
      expect(p.homeTeam).toBe('A determinar');
      expect(p.awayTeam).toBe('A determinar');
    }

    const isoDateTimes = matches.map((m) => m.isoDateTime);
    expect(isoDateTimes).toEqual([...isoDateTimes].sort());
  });

  test('fetchCompetitionData returns both matches and classification', async () => {
    const { matches, classification } = await fetchCompetitionData();
    expect(matches.length).toBeGreaterThan(0);
    expect(classification).toHaveLength(2);
  });

  test('throws a descriptive error when the request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(fetchMatches()).rejects.toThrow(/503/);
  });
});
