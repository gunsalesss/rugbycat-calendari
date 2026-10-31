// Descarrega l'escut de cada equip des de Matchready i el desa a
// public/team-logos/, per servir-lo des d'aquest repo en comptes de
// carregar-lo cada vegada des de matchready.es. Actualitza team-logos.json
// amb el mapa equip -> ruta local.
//
// Ús: node scripts/download-team-logos.js

const fs = require('fs');
const path = require('path');
const { fetchCompetitionData } = require('../scraper');
const { DEFAULT_MAPPING_FILE } = require('../teamLogos');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'team-logos');

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function downloadLogo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { classification } = await fetchCompetitionData();
  const mapping = {};

  for (const { team, logoUrl } of classification) {
    if (!logoUrl) {
      console.warn(`[sense escut] ${team}`);
      continue;
    }

    const ext = path.extname(new URL(logoUrl).pathname) || '.png';
    const filename = `${slugify(team)}${ext}`;
    const destPath = path.join(OUTPUT_DIR, filename);

    try {
      await downloadLogo(logoUrl, destPath);
      mapping[team] = `/team-logos/${filename}`;
      console.log(`[ok] ${team} -> ${filename}`);
    } catch (err) {
      console.warn(`[error] ${team}: ${err.message}`);
    }
  }

  fs.writeFileSync(DEFAULT_MAPPING_FILE, `${JSON.stringify(mapping, null, 2)}\n`);
  console.log(`\nDesats ${Object.keys(mapping).length} escuts a ${OUTPUT_DIR}`);
  console.log(`Mapa escrit a ${DEFAULT_MAPPING_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
