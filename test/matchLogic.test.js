const {
  isScheduleConfirmed,
  matchRowStatus,
  formatStatus,
  formatMatchDate,
  findNextJornadaName,
  hasActiveFilters,
} = require('../public/matchLogic');

function buildMatch(overrides = {}) {
  return {
    jornada: 'Jornada 1',
    date: '31/10/2026',
    isoDate: '2026-10-31',
    isoDateTime: '2026-10-31T18:00:00.000Z',
    time: '18:00',
    field: 'Font Verda',
    homeTeam: 'CR SPARTANS',
    awayTeam: 'RC ALT EMPORDÀ',
    status: 'pending',
    score: null,
    ...overrides,
  };
}

describe('isScheduleConfirmed', () => {
  test('is confirmed when there is a real time and a field', () => {
    expect(isScheduleConfirmed(buildMatch())).toBe(true);
  });

  test('is not confirmed without a field', () => {
    expect(isScheduleConfirmed(buildMatch({ field: null }))).toBe(false);
  });

  test('is not confirmed without a time', () => {
    expect(isScheduleConfirmed(buildMatch({ time: null }))).toBe(false);
  });

  test('a placeholder time of 00:00 does not count as confirmed', () => {
    expect(isScheduleConfirmed(buildMatch({ time: '00:00' }))).toBe(false);
  });
});

describe('matchRowStatus', () => {
  test('postponed matches are always "ajornat", even with a time and field', () => {
    expect(matchRowStatus(buildMatch({ status: 'postponed' }))).toBe('ajornat');
  });

  test('played matches are "jugat"', () => {
    expect(matchRowStatus(buildMatch({ status: 'played', score: '24-10' }))).toBe('jugat');
  });

  test('pending matches with a confirmed schedule are "confirmat"', () => {
    expect(matchRowStatus(buildMatch({ status: 'pending' }))).toBe('confirmat');
  });

  test('pending matches without a confirmed schedule are "pendent"', () => {
    expect(matchRowStatus(buildMatch({ status: 'pending', time: null, field: null }))).toBe('pendent');
  });
});

describe('formatStatus', () => {
  test('a played match shows the score and the "Jugat" tag', () => {
    const html = formatStatus(buildMatch({ status: 'played', score: '24 - 10' }));
    expect(html).toContain('24 - 10');
    expect(html).toContain('tag-jugat');
    expect(html).toContain('Jugat');
  });

  test('a postponed match shows "Ajornat" and no score', () => {
    const html = formatStatus(buildMatch({ status: 'postponed' }));
    expect(html).toContain('tag-ajornat');
    expect(html).toContain('Ajornat');
    expect(html).not.toContain('score');
  });

  test('a confirmed match shows its time and "Confirmat"', () => {
    const html = formatStatus(buildMatch({ status: 'pending' }));
    expect(html).toContain('18:00');
    expect(html).toContain('tag-confirmat');
    expect(html).toContain('Confirmat');
  });

  test('a match without a confirmed schedule shows "Per confirmar"', () => {
    const html = formatStatus(buildMatch({ status: 'pending', time: null, field: null }));
    expect(html).toContain('tag-pendent');
    expect(html).toContain('Per confirmar');
  });
});

describe('formatMatchDate', () => {
  test('formats a valid isoDate as uppercase weekday + day + month', () => {
    const result = formatMatchDate(buildMatch({ isoDate: '2026-10-31' }));
    expect(result).toMatch(/^[A-ZÇ]{2,4} 31 OCT$/);
  });

  test('falls back to the raw date string when isoDate is missing or invalid', () => {
    expect(formatMatchDate(buildMatch({ isoDate: undefined, date: '31/10/2026' }))).toBe('31/10/2026');
    expect(formatMatchDate(buildMatch({ isoDate: 'not-a-date', date: '31/10/2026' }))).toBe('31/10/2026');
  });
});

describe('findNextJornadaName', () => {
  test('returns the jornada of the first group that has a match today or later', () => {
    const matches = [
      buildMatch({ jornada: 'Jornada 1', isoDate: '2026-10-01' }),
      buildMatch({ jornada: 'Jornada 2', isoDate: '2026-10-15' }),
      buildMatch({ jornada: 'Jornada 3', isoDate: '2026-11-05' }),
    ];
    expect(findNextJornadaName(matches, '2026-10-20')).toBe('Jornada 3');
  });

  test('returns null when every match is in the past', () => {
    const matches = [
      buildMatch({ jornada: 'Jornada 1', isoDate: '2026-10-01' }),
      buildMatch({ jornada: 'Jornada 2', isoDate: '2026-10-15' }),
    ];
    expect(findNextJornadaName(matches, '2026-11-01')).toBeNull();
  });

  test('picks the jornada whose group contains a future match even when dates interleave', () => {
    // Jornada 2 has a makeup match later than Jornada 3's first match, but
    // Jornada 2 still counts as the "next" jornada because, as a group, it
    // already has a match on/after today.
    const matches = [
      buildMatch({ jornada: 'Jornada 1', isoDate: '2026-10-01' }),
      buildMatch({ jornada: 'Jornada 2', isoDate: '2026-10-05' }),
      buildMatch({ jornada: 'Jornada 3', isoDate: '2026-10-12' }),
      buildMatch({ jornada: 'Jornada 2', isoDate: '2026-10-20' }),
    ];
    expect(findNextJornadaName(matches, '2026-10-10')).toBe('Jornada 2');
  });
});

describe('hasActiveFilters', () => {
  test('is false when there is neither a team nor a date', () => {
    expect(hasActiveFilters('', '')).toBe(false);
  });

  test('is true when a team is selected', () => {
    expect(hasActiveFilters('CR SPARTANS', '')).toBe(true);
  });

  test('is true when a date is selected', () => {
    expect(hasActiveFilters('', '2026-10-31')).toBe(true);
  });
});
