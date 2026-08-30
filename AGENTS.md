# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@0dep/piso` is a zero-dependency ISO 8601 parser for intervals, dates, and durations. Published as dual ESM/CJS with hand-maintained TypeScript declarations. Source of truth is a single file: `src/index.js`. The repo is an npm workspace: the root package plus a private `bench/` workspace for benchmarks and cross-library comparison.

## Non-negotiables

- **Never commit.** Leave changes in the working tree — the maintainer reviews and commits.
- **Test-first.** Bug fixes and behavior changes start with a failing mocha test in `test/*-test.js` that reproduces the issue before `src/index.js` is touched. Pure behavior-preserving refactors (e.g. perf work) don't need new tests — the ~14k-test suite is the regression net — but must be verified against it and profiled.
- **Keep coverage at 100%.** Run `npx c8 --reporter=text mocha` after touching `src/index.js`. An uncovered branch is either dead code — check every call site, remove it, and re-run the bench since these helpers sit in hot loops — or a missing test, which is written first. Use `--reporter=json` and `coverage/coverage-final.json` to pinpoint which arm of a ternary is unhit.
- **Speed is a feature.** The package parses dates 6–7× and intervals 6–11× faster than luxon, and durations faster than luxon and iso8601-duration (see README Benchmarking — those claims are backed by executed `npm run bench` runs, so re-verify them after perf-sensitive changes). Do not introduce regex into the parser, do not allocate in the hot path (no `.split`, `.match`, `.slice` over the source, string building for numbers), and preserve the `idx`/`c`/`parsed` cursor pattern. Character classes are checked with charCode helpers (`isDigit`, `isWeekday`) or equality helpers (`isDatePrefix`, `isFraction`), digit runs accumulate numerically (`digitValue`, `twoDigits`, `POW10`), and valid-char sets are hoisted module constants — never rebuild them per call. Beware extracting helpers into the hottest loops: a shared dispatch function once regressed 15% by breaking V8 inlining. When changing perf-sensitive code, profile with `node --prof <script>` then `node --prof-process isolate-*.log` — not `console.time` micro-benchmarks.

## Commands

- `npm test` — run mocha suite. `posttest` chains lint, `tsc -p test`, dist build, and `texample` (runs README JS code blocks as live tests, so README examples must be runnable).
- `npm run bench` — tinybench throughput comparison against luxon, iso8601-duration, and temporal (workspace `bench/`).
- `npm run compare` — executes every README capability table row against each library and prints ✓/✗ from actual behavior. The README Benchmarking tables mirror this output — keep them in sync.
- `npm run lint` — eslint (with cache) + prettier check.
- `tsc -p test` — type-check test files (`test/tsconfig.json`, `checkJs` over JSDoc). TypeScript is pinned to `^6` — v7 breaks `dts-buddy`.
- The package is isomorphic. Root `tsconfig.json` sets `"types": []` and `"lib": ["es2017"]` on purpose: `src/` must type-check against ECMAScript built-ins only, so any reference to Node (`process`, `Buffer`) or DOM (`window`) globals is a type error. Don't add `node` or `dom` there; tests opt into `node`/`chai`/`mocha` in `test/tsconfig.json`.
- `npm run dist` — rollup ESM→CJS (`lib/index.cjs`) plus `dts-buddy` regen of `types/index.d.ts`. Run after any change to `src/index.js` before publishing.
- `npm run cov:html` / `npm run test:lcov` — coverage via c8 over `src`.
- Single test: `npx mocha test/interval-test.js` or `npx mocha --grep "pattern"`.
- Tests run with `TZ=Europe/Stockholm` (set in `test/setup.js`); local-time behavior is asserted against this zone, so don't assume UTC.

## Architecture

### Single-file parser
All runtime code lives in `src/index.js` (~1700 lines). It exports three constructor functions — `ISOInterval`, `ISODate`, `ISODuration` — plus thin functional wrappers (`parseInterval`, `parseDuration`, `getDate`, `getExpireAt`, `getStartAt`) and week helpers (`getUTCWeekNumber`, `getUTCWeekOneDate`, `getUTCLastWeekOfYear`, `getISOWeekString`). Prototype methods (not class syntax) — preserve this style when editing.

### Hand-written character-by-character parser
Parsing is a state machine over the source string, not regex. Each parser holds `source`, `idx`, `c` (current char), and `parsed` (consumed prefix used for error messages). Methods like `read()`, `peek()`, `consume()`, `consumeChar()` advance the cursor. `ISOInterval` delegates into nested `ISODate` / `ISODuration` parsers by passing its own `idx` as their `offset`, then resumes from the child's final `idx`. This is how `R5/2024-01-01T00:00Z/P1Y` is parsed in one pass without re-tokenizing. When fixing a bug, find the relevant `continue*` / `consume*` method by which character class it handles, not by ISO field name.

### Every variable-length field is digit-capped
There are no source length guards; instead each field caps its digits so the parser rejects any garbage within a bounded number of characters regardless of input size: unsigned years 8 digits, signed years 17, second fractions 17, duration designator values 17, interval repetitions 17. Exceeding a cap throws `RangeError: ISO 8601 <field> "<parsed>[c]" at <idx> exceeds N digits`. Consequently a valid duration never exceeds 129 characters and a valid interval 209 — both documented in the README. New variable-length syntax must follow this self-bounding pattern, not a length check.

### Interval type as a bitmask
`ISOInterval.type` is a 4-bit flag: `1 = Repeat`, `2 = StartDate`, `4 = Duration`, `8 = EndDate`. The enum is in `types/interfaces.d.ts` as `ISOIntervalType`. `getExpireAt` / `getStartAt` branch on `type & N`. New interval shapes mean adding a new flag combination, not a new code path — preserve the bitmask dispatch.

### Repeat semantics
`R-1` means infinite; `R0` and `R1` collapse to "once" and the `Repeat` flag is **not** set in those cases (see `parse()` after `consumeDuration`). `getExpireAt` walks repetitions forward from the start date (or backward from end date) until the next occurrence after `compareDate`. `Number.MAX_VALUE` is used as the iteration cap for `R-1`.

### Date/duration arithmetic respects Z vs local
`ISODate.toDate()` chooses UTC or local `Date` setters based on whether the source had a `Z` / offset (`result.Z`) or whether `enforceUTC` was passed. `ISODuration.applyDuration` and `ISODateDurationFunctions` propagate the `useUtc` flag. When changing date math, check both branches via `dateUTCFns` / `dateLocalFns`.

### Type declarations are generated, then committed
`types/index.d.ts` is generated by `dts-buddy` from JSDoc in `src/index.js`. `types/interfaces.d.ts` is the only hand-written `.d.ts`. Edit JSDoc + `interfaces.d.ts`, then `npm run dist`. Don't hand-edit `types/index.d.ts`. Prototype methods land in the generated declarations even when tagged `@internal` — prefer module-private functions for internals that shouldn't grow the public surface.

### Validation helpers
`validateDate`, `validateOrdinalDate`, `validateWeek`, `isLeapYear`, `getUTCDateFromWeek`, `getUTCDateFromOrdinalDate`, `getOrdinalDayOfYear` and the char-class/digit helpers (`isDigit`, `digitValue`, `twoDigits`, `isDatePrefix`, `isFraction`, `isWeekday`, `signedYear`) live at the bottom of `src/index.js`. Errors are `RangeError` with the consumed-so-far prefix in the message — either `Unexpected ISO 8601 <kind> character "<parsed>[c]" at <idx>` for a bad character or `... exceeds N digits` for a digit cap. Match these formats when adding new validation.

### Number parsing preserves exact semantics
Digit runs accumulate as integers (`value * 10 + digitValue(c)`); results equal `Number(string)` parsing bit-for-bit. Where accumulated integers could exceed 2^53 (signed years and second fractions at 16+ digits), the code falls back to slicing the digits from the source and `Number()` — keep that fallback when touching those paths.

## Benchmarking workspace
`bench/` is a private workspace (`npm install` at root wires it, `@0dep/piso` resolves to the repo root). `bench/suites/*.js` hold tinybench throughput suites, `bench/compare.js` the capability comparison. README Benchmarking numbers and ✓/✗ tables must reflect executed output from these scripts, not hand-estimates — re-run and update them when parser behavior or performance changes.

## Testing notes
- Mocha config is `.mocharc.json` (recursive, registers `chai/register-expect.js`).
- `test/years.json` is a fixture of week-number expectations spanning many years — used by `week-test.js`.
- `test/to-json-test.js` covers `toJSON` round-trips.
- `texample` (run as part of `posttest`) executes the JavaScript code fences in `README.md`. If you change a public API, update README examples or `npm test` will fail at the `posttest` step.
