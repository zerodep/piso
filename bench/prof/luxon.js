import { DateTime } from 'luxon';

import { iterations, sources } from './sources.js';

let parsed = 0;
for (const source of sources) {
  for (let i = 0; i < iterations; i++) {
    if (DateTime.fromISO(source).isValid) parsed++;
  }
}
console.log(`luxon parsed ${parsed} dates`);
