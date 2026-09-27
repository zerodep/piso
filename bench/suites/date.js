import { fileURLToPath } from 'node:url';

import { getDate } from '@0dep/piso';
import { DateTime } from 'luxon';

import { runSuite } from '../runner.js';
import { temporalCases } from '../temporal.js';

const dateTime = '2024-03-26T12:30:15.5+02:00';
const utcDateTime = '2025-03-26T12:30:15.5Z';
const dateOnly = '2024-03-26';

export default async function suite() {
  await runSuite(`Date with time and offset: ${dateTime}`, {
    '@0dep/piso getDate': () => getDate(dateTime),
    'luxon DateTime.fromISO': () => DateTime.fromISO(dateTime),
    ...temporalCases((Temporal) => () => Temporal.Instant.from(dateTime), 'Instant.from'),
    'new Date': () => new Date(dateTime),
  });

  await runSuite(`UTC Date with time: ${utcDateTime}`, {
    '@0dep/piso getDate': () => getDate(utcDateTime),
    'luxon utcDateTime.fromISO': () => DateTime.fromISO(utcDateTime),
    ...temporalCases((Temporal) => () => Temporal.Instant.from(utcDateTime), 'Instant.from'),
    'new Date': () => new Date(utcDateTime),
  });

  await runSuite(`Date only: ${dateOnly}`, {
    '@0dep/piso getDate': () => getDate(dateOnly),
    'luxon DateTime.fromISO': () => DateTime.fromISO(dateOnly),
    ...temporalCases((Temporal) => () => Temporal.PlainDate.from(dateOnly), 'PlainDate.from'),
    'new Date': () => new Date(dateOnly),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await suite();
