const express = require('express');
const path = require('path');
const { fetchCompetitionData, SOURCE_URL } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuts

let cache = { matches: null, classification: null, fetchedAt: 0 };

async function getData() {
  const isStale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
  if (!cache.matches || isStale) {
    const data = await fetchCompetitionData();
    cache = { ...data, fetchedAt: Date.now() };
  }
  return cache;
}

async function getMatches() {
  return (await getData()).matches;
}

// Un partit "placeholder" (semifinal/final sense equips assignats) es manté
// sempre a la llista, encara que es filtri per un equip concret.
function filterByTeam(matches, team) {
  if (!team) return matches;
  return matches.filter((m) => m.isPlaceholder || m.homeTeam === team || m.awayTeam === team);
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/teams', async (req, res) => {
  try {
    const matches = await getMatches();
    const teams = Array.from(
      new Set(
        matches
          .filter((m) => !m.isPlaceholder)
          .flatMap((m) => [m.homeTeam, m.awayTeam])
      )
    ).sort((a, b) => a.localeCompare(b, 'ca'));
    res.json({ teams, source: SOURCE_URL });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/dates', async (req, res) => {
  try {
    const { team } = req.query;
    const matches = filterByTeam(await getMatches(), team);

    const dates = Array.from(new Set(matches.map((m) => m.isoDate))).sort();
    res.json({ dates, source: SOURCE_URL });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/matches', async (req, res) => {
  try {
    const { team, date } = req.query;
    let matches = filterByTeam(await getMatches(), team);

    if (date) {
      matches = matches.filter((m) => m.isoDate === date);
    }

    res.json({ matches, count: matches.length, source: SOURCE_URL, cachedAt: cache.fetchedAt });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/classification', async (req, res) => {
  try {
    const { classification, fetchedAt } = await getData();
    res.json({ classification, source: SOURCE_URL, cachedAt: fetchedAt });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Calendari rugby escoltant a http://localhost:${PORT}`);
});
