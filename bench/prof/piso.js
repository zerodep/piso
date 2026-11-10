import { getDate } from '@0dep/piso';

import { iterations, sources } from './sources.js';

let parsed = 0;
for (const source of sources) {
  for (let i = 0; i < iterations; i++) {
    if (getDate(source)) parsed++;
  }
}
console.log(`piso parsed ${parsed} dates`);
