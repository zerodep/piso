import { fileURLToPath } from 'node:url';

import { getDate } from '@0dep/piso';
import { Temporal } from '@js-temporal/polyfill';
import { DateTime } from 'luxon';

import { runSuite } from '../runner.js';

const dateTime = '2024-03-26T12:30:15.5+02:00';
const utcDateTime = '2025-03-26T12:30:15.5Z';
const dateOnly = '2024-03-26';

export default async function suite() {
  await runSuite(`Date with time and offset: ${dateTime}`, {
    '@0dep/piso getDate': () => getDate(dateTime),
    'luxon DateTime.fromISO': () => DateTime.fromISO(dateTime),
    'temporal Instant.from': () => Temporal.Instant.from(dateTime),
    'new Date': () => new Date(dateTime),
  });

  await runSuite(`UTC Date with time: ${utcDateTime}`, {
    '@0dep/piso getDate': () => getDate(utcDateTime),
    'luxon utcDateTime.fromISO': () => DateTime.fromISO(utcDateTime),
    'temporal Instant.from': () => Temporal.Instant.from(utcDateTime),
    'new Date': () => new Date(utcDateTime),
  });

  await runSuite(`Date only: ${dateOnly}`, {
    '@0dep/piso getDate': () => getDate(dateOnly),
    'luxon DateTime.fromISO': () => DateTime.fromISO(dateOnly),
    'temporal PlainDate.from': () => Temporal.PlainDate.from(dateOnly),
    'new Date': () => new Date(dateOnly),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await suite();
