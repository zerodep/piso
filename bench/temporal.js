import { Temporal as polyfill } from '@js-temporal/polyfill';

/** Native Temporal when the runtime ships one (Node 26 and later), otherwise undefined */
const native = /** @type {typeof polyfill | undefined} */ (globalThis.Temporal);

/**
 * Temporal implementations to compare: the polyfill always, the native global when present
 * @type {{name: string, Temporal: typeof polyfill}[]}
 */
export const implementations = [{ name: 'temporal', Temporal: polyfill }];
if (native) implementations.push({ name: 'native temporal', Temporal: native });

/**
 * Build one case per Temporal implementation, keyed by implementation name and optional label
 * @template T
 * @param {(Temporal: typeof polyfill) => T} make called once per implementation with its Temporal namespace
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
