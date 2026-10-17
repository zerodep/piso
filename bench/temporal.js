import { Temporal as jsTemporal } from '@js-temporal/polyfill';
import { Temporal as temporalPolyfill } from 'temporal-polyfill/implementation';

/** Native Temporal when the runtime ships one (Node 26 and later), otherwise undefined */
const native = /** @type {typeof jsTemporal | undefined} */ (globalThis.Temporal);

/**
 * Temporal implementations to compare: both polyfills always, the native global when present
 * - js-temporal is the `@js-temporal/polyfill` package, the TC39 champions' reference polyfill
 * - temporal-polyfill is the `temporal-polyfill` package, imported from its `/implementation` entry because the
 *   default entry returns the native Temporal when the runtime has one, which would duplicate the native column
 * @type {{name: string, Temporal: typeof jsTemporal}[]}
 */
export const implementations = [
  { name: 'js-temporal', Temporal: jsTemporal },
  { name: 'temporal-polyfill', Temporal: /** @type {typeof jsTemporal} */ (/** @type {unknown} */ (temporalPolyfill)) },
];
if (native) implementations.push({ name: 'native temporal', Temporal: native });

/**
 * Build one case per Temporal implementation, keyed by implementation name and optional label
 * @template T
 * @param {(Temporal: typeof jsTemporal) => T} make called once per implementation with its Temporal namespace
 * @param {string} [label] appended to the implementation name, e.g. 'Instant.from'
 * @returns {Record<string, T>}
 */
export function temporalCases(make, label) {
  /** @type {Record<string, T>} */
  const cases = {};
  for (const { name, Temporal } of implementations) {
    cases[label ? `${name} ${label}` : name] = make(Temporal);
  }
  return cases;
}
