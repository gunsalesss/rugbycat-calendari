const request = require('supertest');

jest.mock('../scraper', () => ({
  SOURCE_URL: 'https://matchready.es/fake-source/',
  fetchCompetitionData: jest.fn(),
}));

const MOCK_MATCHES = [
  {
    jornada: 'Jornada 1',
    date: '01/01/2026',
    time: '12:00',
    isoDate: '2026-01-01',
    isoDateTime: '2026-01-01T12:00:00.000Z',
    homeTeam: 'TEAM A',
    awayTeam: 'TEAM B',
    homeLogoUrl: null,
    awayLogoUrl: null,
    field: 'CAMP A',
    referee: 'Ref One',
    status: 'played',
    score: '20 - 10',
    actPdfUrl: null,
  },
  {
    jornada: 'Jornada 2',
    date: '10/01/2026',
    time: '16:00',
    isoDate: '2026-01-10',
    isoDateTime: '2026-01-10T16:00:00.000Z',
    homeTeam: 'TEAM C',
    awayTeam: 'TEAM A',
    homeLogoUrl: null,
    awayLogoUrl: null,
    field: 'CAMP B',
    referee: null,
    status: 'pending',
    score: null,
    actPdfUrl: null,
  },
  {
    jornada: 'Final',
    date: '01/05/2026',
    time: null,
    isoDate: '2026-05-01',
    isoDateTime: '2026-05-01T00:00:00.000Z',
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
  },
];

const MOCK_CLASSIFICATION = [
  { position: 1, team: 'TEAM A', played: 2, leaguePoints: 10 },
  { position: 2, team: 'TEAM B', played: 1, leaguePoints: 5 },
];

describe('API de calendari i classificació', () => {
  let app;
  let scraper;

  beforeEach(() => {
    jest.resetModules();
    scraper = require('../scraper');
    scraper.fetchCompetitionData.mockResolvedValue({
      matches: MOCK_MATCHES,
      classification: MOCK_CLASSIFICATION,
    });
    app = require('../server');
  });

  test('GET /api/teams retorna els equips reals ordenats, sense els placeholders', async () => {
    const res = await request(app).get('/api/teams');
    expect(res.status).toBe(200);
    expect(res.body.teams).toEqual(['TEAM A', 'TEAM B', 'TEAM C']);
  });

  test('GET /api/matches sense filtres retorna tots els partits', async () => {
    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  test('GET /api/matches?team= filtra per equip però manté els placeholders', async () => {
    const res = await request(app).get('/api/matches').query({ team: 'TEAM B' });
    expect(res.status).toBe(200);
    const jornades = res.body.matches.map((m) => m.jornada);
    expect(jornades).toEqual(['Jornada 1', 'Final']);
  });

  test('GET /api/matches?date= filtra per data concreta', async () => {
    const res = await request(app).get('/api/matches').query({ date: '2026-01-10' });
    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(1);
    expect(res.body.matches[0].homeTeam).toBe('TEAM C');
  });

  test('GET /api/dates?team= inclou les dates dels placeholders', async () => {
    const res = await request(app).get('/api/dates').query({ team: 'TEAM B' });
    expect(res.status).toBe(200);
    expect(res.body.dates).toEqual(['2026-01-01', '2026-05-01']);
  });

  test('GET /api/classification retorna la classificació sencera', async () => {
    const res = await request(app).get('/api/classification');
    expect(res.status).toBe(200);
    expect(res.body.classification).toEqual(MOCK_CLASSIFICATION);
  });

  test('un error del scraper es tradueix en un 502 amb missatge', async () => {
    scraper.fetchCompetitionData.mockReset();
    scraper.fetchCompetitionData.mockRejectedValue(new Error('Error descarregant dades de Matchready: 503'));
    const res = await request(app).get('/api/matches');
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/503/);
  });
});
