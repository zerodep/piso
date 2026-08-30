import { fileURLToPath } from 'node:url';

import { parseDuration, parseInterval } from '@0dep/piso';
import { Temporal } from '@js-temporal/polyfill';
import { parse as parseIso8601Duration, toSeconds } from 'iso8601-duration';
import { DateTime, Duration, Interval } from 'luxon';

import { runSuite } from '../runner.js';

const start = new Date(Date.UTC(2007, 2, 1, 13));
const duration = 'P1Y2M10DT2H30M';
const timeDuration = 'PT2H30M';
const negative = '-P1D';
const startDuration = '2007-03-01T13:00:00Z/P1Y2M10DT2H30M';
const durationEnd = 'P1Y2M10DT2H30M/2008-05-11T15:30:00Z';
const startEnd = '2007-03-01T13:00:00Z/2008-05-11T15:30:00Z';

const temporalStart = Temporal.Instant.fromEpochMilliseconds(start.getTime()).toZonedDateTimeISO('UTC');

// iso8601-duration end() applies in local time, so it is left out of the UTC expire at comparison
const durationExpireAt = {
  '@0dep/piso parseDuration().getExpireAt': () => parseDuration(duration).getExpireAt(start).getTime(),
  'luxon DateTime.plus(Duration.fromISO)': () => DateTime.fromJSDate(start, { zone: 'utc' }).plus(Duration.fromISO(duration)).toMillis(),
  'temporal ZonedDateTime.add(Duration.from)': () => temporalStart.add(Temporal.Duration.from(duration)).epochMilliseconds,
};

const negativeExpireAt = {
  '@0dep/piso parseDuration().getExpireAt': () => parseDuration(negative).getExpireAt(start).getTime(),
  'luxon DateTime.plus(Duration.fromISO)': () => DateTime.fromJSDate(start, { zone: 'utc' }).plus(Duration.fromISO(negative)).toMillis(),
  'temporal ZonedDateTime.add(Duration.from)': () => temporalStart.add(Temporal.Duration.from(negative)).epochMilliseconds,
};

const durationMilliseconds = {
  '@0dep/piso parseDuration().toMilliseconds': () => parseDuration(timeDuration).toMilliseconds(start),
  'iso8601-duration toSeconds(parse())': () => toSeconds(parseIso8601Duration(timeDuration), start) * 1000,
  'luxon Duration.fromISO().toMillis': () => Duration.fromISO(timeDuration).toMillis(),
  'temporal Duration.from().total': () => Temporal.Duration.from(timeDuration).total('milliseconds'),
};

const intervalStartDuration = {
  '@0dep/piso parseInterval().getExpireAt': () => parseInterval(startDuration).getExpireAt().getTime(),
  'luxon Interval.fromISO().end': () => Interval.fromISO(startDuration, { setZone: true }).end.toMillis(),
};

const intervalDurationEnd = {
  '@0dep/piso parseInterval().getStartAt': () => parseInterval(durationEnd).getStartAt().getTime(),
  'luxon Interval.fromISO().start': () => Interval.fromISO(durationEnd, { setZone: true }).start.toMillis(),
};

const intervalStartEnd = {
  '@0dep/piso parseInterval().getExpireAt': () => parseInterval(startEnd).getExpireAt().getTime(),
  'luxon Interval.fromISO().end': () => Interval.fromISO(startEnd, { setZone: true }).end.toMillis(),
};

/**
 * Assert every case in a suite produces the same result, so the timings compare like with like
 * @param {string} title
 * @param {Record<string, () => number>} cases
 */
function verify(title, cases) {
  const results = Object.entries(cases).map(([name, fn]) => [name, fn()]);
  const [, expected] = results[0];
  for (const [name, result] of results) {
    if (result !== expected) throw new Error(`${title}: ${name} produced ${result}, expected ${expected}`);
  }
  return cases;
}

export default async function suite() {
  await runSuite(`Duration expire at: ${duration}`, verify('duration expire at', durationExpireAt));
  await runSuite(`Negative duration expire at: ${negative}`, verify('negative duration expire at', negativeExpireAt));
  await runSuite(`Duration milliseconds: ${timeDuration}`, verify('duration milliseconds', durationMilliseconds));
  await runSuite(`Interval start/duration expire at: ${startDuration}`, verify('interval start/duration', intervalStartDuration));
  await runSuite(`Interval duration/end start at: ${durationEnd}`, verify('interval duration/end', intervalDurationEnd));
  await runSuite(`Interval start/end expire at: ${startEnd}`, verify('interval start/end', intervalStartEnd));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await suite();
