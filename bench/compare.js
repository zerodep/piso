import { getDate, parseDuration, parseInterval } from '@0dep/piso';
import { Temporal } from '@js-temporal/polyfill';
import { parse as parseIsoDuration, toSeconds } from 'iso8601-duration';
import { DateTime, Duration, Interval } from 'luxon';

const OK = '✓';
const FAIL = '✗';

/**
 * Evaluate one capability case against one library
 * @param {{mode?: 'rejects', verify?: (value: any) => boolean}} c capability case
 * @param {() => any} parse library parse call, throws when the source is rejected
 * @returns {string} table cell
 */
function evaluate(c, parse) {
  let value;
  try {
    value = parse();
  } catch {
    return c.mode === 'rejects' ? OK : `${FAIL} rejected`;
  }
  if (c.mode === 'rejects') return `${FAIL} accepted`;
  if (c.verify && !c.verify(value)) return `${FAIL} wrong result`;
  return OK;
}

/**
 * Print a capability table
 * @param {string} title table title
 * @param {Record<string, (source: string) => any>} libs map of library name -> parse function
 * @param {{name: string, source: string, mode?: 'rejects', verify?: (value: any) => boolean}[]} cases
 */
function compare(title, libs, cases) {
  const rows = cases.map((c) => {
    const row = { Capability: c.name, Source: c.source };
    for (const [name, parse] of Object.entries(libs)) {
      row[name] = evaluate(c, () => parse(c.source));
    }
    return row;
  });

  console.log(`\n${title}`);
  console.table(rows);
}

function utc(Y, M, D, h = 0, m = 0, s = 0, ms = 0) {
  return Date.UTC(Y, M, D, h, m, s, ms);
}

/** Same wall-clock time in the local zone, since sources without offset resolve to local time */
function local(Y, M, D, h = 0, m = 0, s = 0, ms = 0) {
  const date = new Date(2000, 0, 1, h, m, s, ms);
  date.setFullYear(Y, M, D);
  return date.getTime();
}

/** Accept either UTC or local interpretation of a source without zone designator */
function anyOf(...times) {
  return (ms) => times.includes(ms);
}

/** Duration applied with local-zone calendar math may drift a DST hour from UTC math — both are valid readings */
function near(expected, ms) {
  return Math.abs(ms - expected) <= 3600000;
}

function validDate(date) {
  if (isNaN(date.getTime())) throw new RangeError('invalid date');
  return date.getTime();
}

/** Instant covers sources with offset or Z, PlainDateTime the rest, resolved in the local zone like the other parsers */
function temporalDate(source) {
  try {
    return Temporal.Instant.from(source).epochMilliseconds;
  } catch {
    return Temporal.PlainDateTime.from(source).toZonedDateTime(Temporal.Now.timeZoneId()).epochMilliseconds;
  }
}

compare(
  'Interval',
  {
    piso: (source) => {
      const interval = parseInterval(source);
      return { start: interval.getStartAt().getTime(), end: interval.getExpireAt().getTime(), repeat: interval.repeat };
    },
    luxon: (source) => {
      const interval = Interval.fromISO(source);
      if (!interval.isValid) throw new RangeError(interval.invalidReason);
      return { start: interval.start.toMillis(), end: interval.end.toMillis() };
    },
  },
  [
    {
      name: 'start/end',
      source: '2007-03-01T13:00:00Z/2008-05-11T15:30:00Z',
      verify: (v) => v.start === utc(2007, 2, 1, 13) && v.end === utc(2008, 4, 11, 15, 30),
    },
    {
      name: 'start/duration',
      source: '2007-03-01T13:00:00Z/P1Y2M10DT2H30M',
      verify: (v) => v.start === utc(2007, 2, 1, 13) && near(utc(2008, 4, 11, 15, 30), v.end),
    },
    {
      name: 'duration/end',
      source: 'P1Y2M10DT2H30M/2008-05-11T15:30:00Z',
      verify: (v) => near(utc(2007, 2, 1, 13), v.start) && v.end === utc(2008, 4, 11, 15, 30),
    },
    {
      name: 'Repeating interval',
      source: 'R5/2008-03-01T13:00:00Z/P2Y',
      verify: (v) => v.repeat === 5,
    },
    {
      name: 'Start date only',
      source: '2026-09-01T10:00:00Z',
      verify: (v) => v.start === utc(2026, 8, 1, 10) && v.end === utc(2026, 8, 1, 10),
    },
    {
      name: 'Relative end date',
      source: '2007-11-13/15',
      verify: (v) => anyOf(local(2007, 10, 15), utc(2007, 10, 15))(v.end),
    },
  ],
);

compare(
  'Duration to milliseconds',
  {
    piso: (source) => parseDuration(source).toMilliseconds(),
    'iso8601-duration': (source) => toSeconds(parseIsoDuration(source)) * 1000,
    luxon: (source) => {
      const duration = Duration.fromISO(source);
      if (!duration.isValid) throw new RangeError(duration.invalidReason);
      return duration.toMillis();
    },
    temporal: (source) => Temporal.Duration.from(source).total('milliseconds'),
  },
  [
    {
      name: 'Fractional time designator',
      source: 'PT0.5H',
      verify: (ms) => ms === 1800000,
    },
    {
      name: 'Invalid if more than one fraction',
      source: 'PT0.5H0.2S',
      mode: 'rejects',
    },
    {
      name: 'Invalid if fraction not on least designator',
      source: 'PT0.5H2S',
      mode: 'rejects',
    },
    {
      name: 'Year designator',
      source: 'P1Y',
      verify: (ms) => Number.isFinite(ms) && ms > 0,
    },
    {
      name: 'Fractional date designator',
      source: 'P0.5D',
      verify: (ms) => ms === 43200000,
    },
    {
      name: 'Comma as fraction separator',
      source: 'PT0,5H',
      verify: (ms) => ms === 1800000,
    },
    {
      name: 'Repeated duration instruction',
      source: 'R3/PT10H',
      verify: (ms) => ms === 36000000,
    },
    {
      name: 'Negative duration instruction',
      source: '-PT10H',
      verify: (ms) => ms === -36000000,
    },
  ],
);

compare(
  'Date',
  {
    piso: (source) => validDate(getDate(source)),
    luxon: (source) => {
      const date = DateTime.fromISO(source);
      if (!date.isValid) throw new RangeError(date.invalidReason);
      return date.toMillis();
    },
    temporal: (source) => temporalDate(source),
    [`node ${process.versions.node}`]: (source) => validDate(new Date(source)),
  },
  [
    {
      name: 'The 24:th hour',
      source: '2025-01-01T24:00',
      verify: anyOf(local(2025, 0, 2), utc(2025, 0, 2)),
    },
    {
      name: 'Year +10000',
      source: '+010000-01-01',
      verify: anyOf(local(10000, 0, 1), utc(10000, 0, 1)),
    },
    {
      name: 'Year 9999',
      source: '9999-01-01',
      verify: anyOf(local(9999, 0, 1), utc(9999, 0, 1)),
    },
    {
      name: 'Year only (YYYY)',
      source: '2024',
      verify: anyOf(local(2024, 0, 1), utc(2024, 0, 1)),
    },
    {
      name: 'BC dates',
      source: '-000001-01-01T00:00:00Z',
      verify: anyOf(utc(-1, 0, 1)),
    },
    {
      name: 'Week',
      source: '2024-W13-2',
      verify: anyOf(local(2024, 2, 26), utc(2024, 2, 26)),
    },
    {
      name: 'Ordinal date',
      source: '2024-086',
      verify: anyOf(local(2024, 2, 26), utc(2024, 2, 26)),
    },
    {
      name: 'Without separators',
      source: '20240326',
      verify: anyOf(local(2024, 2, 26), utc(2024, 2, 26)),
    },
    {
      name: 'Without offset minutes',
      source: '2024-03-26T12:00+02',
      verify: anyOf(utc(2024, 2, 26, 10)),
    },
    {
      name: 'Comma as fraction separator',
      source: '2024-03-26T12:30:15,5',
      verify: anyOf(local(2024, 2, 26, 12, 30, 15, 500), utc(2024, 2, 26, 12, 30, 15, 500)),
    },
    {
      name: 'Throw on invalid leap year',
      source: '2100-02-29',
      mode: 'rejects',
    },
    {
      name: 'Offset unicode minus (−)',
      source: '2024-02-03T08:06:30−02',
      verify: anyOf(utc(2024, 1, 3, 10, 6, 30)),
    },
    {
      name: 'Offset seconds',
      source: '2007-04-05T12:30+02:00:30',
      verify: anyOf(utc(2007, 3, 5, 10, 29, 30)),
    },
    {
      name: '36 fractions of a second',
      source: '2024-03-26T12:00:00.123456789012345678901234567890123456Z',
      verify: anyOf(utc(2024, 2, 26, 12, 0, 0, 123)),
    },
  ],
);
