// Descarrega l'escut de cada equip des de Matchready, el redimensiona
// (es mostra a només ~24-30px a la web, pero els originals pesen fins a
// centenars de KB) i el desa a public/team-logos/, per servir-lo des
// d'aquest repo en comptes de carregar-lo cada vegada des de matchready.es.
// Actualitza team-logos.json amb el mapa equip -> ruta local.
//
// Ús: node scripts/download-team-logos.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { fetchCompetitionHtml, scrapeClassificationHtml } = require('../scraper');
const { DEFAULT_MAPPING_FILE } = require('../teamLogos');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'team-logos');
const MAX_SIZE = 128; // px; es mostra molt mes petit, pero deixa marge per a pantalles retina

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function downloadAndResize(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const original = Buffer.from(await res.arrayBuffer());
  const resized = await sharp(original)
    .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  fs.writeFileSync(destPath, resized);
  return { originalSize: original.length, resizedSize: resized.length };
}

async function main() {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const html = await fetchCompetitionHtml();
  const classification = scrapeClassificationHtml(html);
  const mapping = {};
  let totalBefore = 0;
  let totalAfter = 0;

  for (const { team, logoUrl } of classification) {
    if (!logoUrl) {
      console.warn(`[sense escut] ${team}`);
      continue;
    }

    const filename = `${slugify(team)}.png`;
    const destPath = path.join(OUTPUT_DIR, filename);

    try {
      const { originalSize, resizedSize } = await downloadAndResize(logoUrl, destPath);
      totalBefore += originalSize;
      totalAfter += resizedSize;
      mapping[team] = `/team-logos/${filename}`;
      console.log(
        `[ok] ${team} -> ${filename} (${Math.round(originalSize / 1024)} KB -> ${Math.round(resizedSize / 1024)} KB)`
      );
    } catch (err) {
      console.warn(`[error] ${team}: ${err.message}`);
    }
  }

  fs.writeFileSync(DEFAULT_MAPPING_FILE, `${JSON.stringify(mapping, null, 2)}\n`);
  console.log(`\nDesats ${Object.keys(mapping).length} escuts a ${OUTPUT_DIR}`);
  console.log(`Pes total: ${Math.round(totalBefore / 1024)} KB -> ${Math.round(totalAfter / 1024)} KB`);
  console.log(`Mapa escrit a ${DEFAULT_MAPPING_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
