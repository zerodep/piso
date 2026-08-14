import { fileURLToPath } from 'node:url';

import { parseInterval } from '@0dep/piso';
import { Interval } from 'luxon';

import { runSuite } from '../runner.js';

const startEnd = '2007-03-01T13:00:00Z/2008-05-11T15:30:00Z';
const startDuration = '2007-03-01T13:00:00Z/P1Y2M10DT2H30M';
const durationEnd = 'P1Y2M10DT2H30M/2008-05-11T15:30:00Z';

export default async function suite() {
  await runSuite(`Interval start/end: ${startEnd}`, {
    '@0dep/piso parseInterval': () => parseInterval(startEnd),
    'luxon Interval.fromISO': () => Interval.fromISO(startEnd),
  });

  await runSuite(`Interval start/duration: ${startDuration}`, {
    '@0dep/piso parseInterval': () => parseInterval(startDuration),
    'luxon Interval.fromISO': () => Interval.fromISO(startDuration),
  });

  await runSuite(`Interval duration/end: ${durationEnd}`, {
    '@0dep/piso parseInterval': () => parseInterval(durationEnd),
    'luxon Interval.fromISO': () => Interval.fromISO(durationEnd),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await suite();
