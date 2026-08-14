import { fileURLToPath } from 'node:url';

import { parseDuration } from '@0dep/piso';
import { Temporal } from '@js-temporal/polyfill';
import { parse as parseIso8601Duration } from 'iso8601-duration';
import { Duration } from 'luxon';

import { runSuite } from '../runner.js';

const duration = 'P1Y2M10DT2H30M';
const fractional = 'PT0.5H';

export default async function suite() {
  await runSuite(`Duration: ${duration}`, {
    '@0dep/piso parseDuration': () => parseDuration(duration),
    'iso8601-duration parse': () => parseIso8601Duration(duration),
    'luxon Duration.fromISO': () => Duration.fromISO(duration),
    'temporal Duration.from': () => Temporal.Duration.from(duration),
  });

  await runSuite(`Duration fractional: ${fractional}`, {
    '@0dep/piso parseDuration': () => parseDuration(fractional),
    'iso8601-duration parse': () => parseIso8601Duration(fractional),
    'luxon Duration.fromISO': () => Duration.fromISO(fractional),
    'temporal Duration.from': () => Temporal.Duration.from(fractional),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await suite();
