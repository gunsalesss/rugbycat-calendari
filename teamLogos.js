const fs = require('fs');
const path = require('path');

const DEFAULT_MAPPING_FILE = path.join(__dirname, 'team-logos.json');

function loadTeamLogos(filePath = DEFAULT_MAPPING_FILE) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function applyLocalLogo(teamName, remoteUrl, logos) {
  return (teamName && logos[teamName]) || remoteUrl || null;
}

module.exports = { loadTeamLogos, applyLocalLogo, DEFAULT_MAPPING_FILE };
