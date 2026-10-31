const path = require('path');
const { loadTeamLogos, applyLocalLogo } = require('../teamLogos');

describe('applyLocalLogo', () => {
  const logos = { 'CR SPARTANS': '/team-logos/cr-spartans.jpg' };

  test('prefers the local logo when the team has one cached', () => {
    expect(applyLocalLogo('CR SPARTANS', 'https://matchready.es/remote.png', logos)).toBe(
      '/team-logos/cr-spartans.jpg'
    );
  });

  test('falls back to the remote URL when the team has no local logo', () => {
    expect(applyLocalLogo('UNKNOWN TEAM', 'https://matchready.es/remote.png', logos)).toBe(
      'https://matchready.es/remote.png'
    );
  });

  test('falls back to null when there is neither a local logo nor a remote URL', () => {
    expect(applyLocalLogo('UNKNOWN TEAM', null, logos)).toBeNull();
  });

  test('falls back to the remote URL when the team name is missing', () => {
    expect(applyLocalLogo(null, 'https://matchready.es/remote.png', logos)).toBe(
      'https://matchready.es/remote.png'
    );
  });
});

describe('loadTeamLogos', () => {
  test('returns the parsed mapping when the file exists', () => {
    const fixture = path.join(__dirname, 'fixtures', 'team-logos-sample.json');
    expect(loadTeamLogos(fixture)).toEqual({ 'CR SPARTANS': '/team-logos/cr-spartans.jpg' });
  });

  test('returns an empty object when the file is missing', () => {
    expect(loadTeamLogos(path.join(__dirname, 'fixtures', 'does-not-exist.json'))).toEqual({});
  });
});
