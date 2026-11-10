# Benchmarks

Throughput and capability comparison of `@0dep/piso` against [luxon](https://www.npmjs.com/package/luxon), [iso8601-duration](https://www.npmjs.com/package/iso8601-duration), the two Temporal polyfills [js-temporal](https://www.npmjs.com/package/@js-temporal/polyfill) and [temporal-polyfill](https://www.npmjs.com/package/temporal-polyfill), and native `Date`. All four libraries parse with regular expressions, piso reads the source character by character.

The numbers below are from an executed `npm run bench` on Node v26.13.0, Apple M3 Pro, macOS 27.0.1. Throughput is the tinybench average in operations per second, rounded, and the ratio in parentheses is piso divided by that library, so below 1× means the other library is faster. The ✓/✗ tables are the output of `npm run compare` on the same Node version.

Speed is not the only difference. A regular expression either matches or it does not, so the other libraries can only echo the input back when it is malformed. piso reads the source with a cursor and reports the offending character and its position, see [Error messages](#error-messages).

The ratios depend on the Node version. luxon spends most of its time copying objects, and V8 in Node 22 and later made object spread and clone considerably cheaper, so the margin over luxon is narrower on Node 24 and 26 than the 6–11 times measured on Node 20. Re-run before quoting.

The js-temporal column is the `@js-temporal/polyfill` package, the reference polyfill maintained by the proposal champions, at 0.5.1. The temporal-polyfill column is the `temporal-polyfill` package from fullcalendar, at 1.0.8. Its default entry returns the native Temporal when the runtime ships one, so `temporal.js` imports `temporal-polyfill/implementation` to measure the polyfill itself. The native temporal column is `globalThis.Temporal`, which Node 26 ships, and `npm run bench` and `npm run compare` add it only when the runtime has it. Native Temporal is 4–15 times faster than js-temporal and lands just below `new Date`: about twice as fast as piso on parsing dates and `P1Y2M10DT2H30M`, while piso is still ahead on the fractional `PT0.5H` parse, the negative duration expire at and `PT2H30M` milliseconds. The two polyfills and native accept and reject the same capability rows.

temporal-polyfill parses dates 2.2–2.5 times slower than piso and durations 3–6 times slower. Up to 1.0.6 durations were 100–200 times slower: `node --prof` put the time outside the parser, in a `_str_` debug property every new instance got from `toJSON()`, whose duration formatter calls `Number.prototype.toLocaleString` once per non-zero field. The debug string was only skipped when the bundle was minified, so it was on when running from `node_modules`. 1.0.7 also skips it when `globalThis.process` exists, so it is off under Node.

```sh
npm install
npm run bench
npm run compare
npm run prof
```

## Contents

<!-- toc -->

- [Interval](#interval)
- [Duration](#duration)
- [Applying durations and intervals](#applying-durations-and-intervals)
- [Date](#date)
- [Error messages](#error-messages)

<!-- /toc -->

## Interval

| Source                                      | piso  | luxon       |
| ------------------------------------------- | ----- | ----------- |
| `2007-03-01T13:00:00Z/2008-05-11T15:30:00Z` | 1.52M | 368k (4.1×) |
| `2007-03-01T13:00:00Z/P1Y2M10DT2H30M`       | 1.95M | 303k (6.4×) |
| `P1Y2M10DT2H30M/2008-05-11T15:30:00Z`       | 2.34M | 281k (8.3×) |

| Capability         | piso | luxon |
| ------------------ | ---- | ----- |
| start/end          | ✓    | ✓     |
| start/duration     | ✓    | ✓     |
| duration/end       | ✓    | ✓     |
| Repeating interval | ✓    | ❌    |
| Start date only    | ✓    | ❌    |
| Relative end date  | ✓    | ❌\*  |
| Month end clamped  | ✓    | ✓     |

> \* `2007-11-13/15` parses but the relative end resolves to a time of day instead of a date

## Duration

| Source           | piso  | iso8601-duration | luxon        | js-temporal  | temporal-polyfill | native temporal |
| ---------------- | ----- | ---------------- | ------------ | ------------ | ----------------- | --------------- |
| `P1Y2M10DT2H30M` | 3.77M | 2.89M (1.3×)     | 3.29M (1.1×) | 2.00M (1.9×) | 1.39M (2.7×)      | 8.65M (0.4×)    |
| `PT0.5H`         | 8.96M | 3.73M (2.4×)     | 5.52M (1.6×) | 1.97M (4.6×) | 1.58M (5.7×)      | 8.46M (1.1×)    |

| Capability                                  | piso | iso8601-duration | luxon | js-temporal | temporal-polyfill | native temporal |
| ------------------------------------------- | ---- | ---------------- | ----- | ----------- | ----------------- | --------------- |
| Fractional time designator                  | ✓    | ✓                | ✓     | ✓           | ✓                 | ✓               |
| Invalid if more than one fraction           | ✓    | ✓                | ❌    | ✓           | ✓                 | ✓               |
| Invalid if fraction not on least designator | ✓    | ✓                | ❌    | ✓           | ✓                 | ✓               |
| Year designator                             | ✓    | ✓                | ✓     | ❌          | ❌                | ❌              |
| Fractional date designator                  | ✓    | ❌               | ✓     | ❌          | ❌                | ❌              |
| Comma as fraction separator                 | ✓    | ✓                | ❌    | ✓           | ✓                 | ✓               |
| Repeated duration instruction               | ✓    | ❌\*             | ❌    | ❌          | ❌                | ❌              |
| Negative duration instruction               | ✓    | ❌\*             | ✓     | ✓           | ✓                 | ✓               |

> \* parses but the instruction is ignored

## Applying durations and intervals

Parsing is only half the job, so `suites/apply.js` measures the outcome: parse a duration and get its expire at date or milliseconds, parse an interval and get its expire at or start at date. Every library is verified to produce the same result before timing.

| Outcome                                       | piso  | luxon        | js-temporal  | temporal-polyfill | native temporal | iso8601-duration |
| --------------------------------------------- | ----- | ------------ | ------------ | ----------------- | --------------- | ---------------- |
| Duration `P1Y2M10DT2H30M` expire at from date | 1.21M | 585k (2.1×)  | 179k (6.8×)  | 661k (1.8×)       | 2.71M (0.4×)    | n/a\*            |
| Negative duration `-P1D` expire at from date  | 3.40M | 639k (5.3×)  | 193k (17.6×) | 590k (5.8×)       | 2.75M (1.2×)    | n/a\*            |
| Duration `PT2H30M` milliseconds               | 4.70M | 3.47M (1.4×) | 463k (10.2×) | 1.08M (4.4×)      | 4.27M (1.1×)    | 805k (5.8×)      |
| Interval start/duration expire at             | 757k  | 303k (2.5×)  | n/a          | n/a               | n/a             | n/a              |
| Interval duration/end start at                | 797k  | 302k (2.6×)  | n/a          | n/a               | n/a             | n/a              |
| Interval start/end expire at                  | 1.15M | 388k (3.0×)  | n/a          | n/a               | n/a             | n/a              |

\* iso8601-duration `end()` applies the duration in local time so it is not comparable with the UTC results of the others.

## Date

Native `new Date('2024-03-26')` is, of course, still faster — 2.3–3.1 times in the benchmark, with native Temporal about 2 times faster than piso. On the other hand `new Date('2024-03-26')` resolves to UTC while `new Date(2024, 2, 26)` does not. Not sure what to expect but IMHO `new Date('2024-03-26')` should be a local date.

| Source                        | piso  | luxon       | js-temporal  | temporal-polyfill | native temporal | `new Date`   |
| ----------------------------- | ----- | ----------- | ------------ | ----------------- | --------------- | ------------ |
| `2024-03-26T12:30:15.5+02:00` | 3.08M | 696k (4.4×) | 654k (4.7×)  | 1.22M (2.5×)      | 6.20M (0.5×)    | 7.90M (0.4×) |
| `2025-03-26T12:30:15.5Z`      | 3.28M | 683k (4.8×) | 1.24M (2.7×) | 1.50M (2.2×)      | 6.93M (0.5×)    | 7.64M (0.4×) |
| `2024-03-26`                  | 3.88M | 842k (4.6×) | 1.53M (2.5×) | 1.69M (2.3×)      | 8.89M (0.4×)    | 12.0M (0.3×) |

Parsing the three sources above one million times each under `node --prof` shows how the runtime shifts the ratio. `npm run prof` runs `prof/piso.js` and `prof/luxon.js` under the profiler, counts the ticks, and prints the table row for the current Node, with the processed profiles left in the temp directory it names. From Node 20 to 26 piso sheds about 14% of its ticks, luxon about 36%, and piso still finishes first on all three:

| Node    | piso              | luxon              | luxon / piso |
| ------- | ----------------- | ------------------ | ------------ |
| 20.20.2 | 893 ticks, 1.13 s | 4974 ticks, 6.24 s | 5.6×         |
| 24.22.2 | 798 ticks, 1.02 s | 3111 ticks, 3.91 s | 3.9×         |
| 26.13.0 | 772 ticks, 1.03 s | 3173 ticks, 4.04 s | 4.1×         |

Wall time includes process start and module loading, so the ratio is a little lower than the throughput ratio above.

| Capability                  | piso   | luxon | js-temporal | temporal-polyfill | native temporal | node 26 |
| --------------------------- | ------ | ----- | ----------- | ----------------- | --------------- | ------- |
| The 24:th hour              | ✓      | ✓     | ❌          | ❌                | ❌              | ✓       |
| Year +10000                 | ✓      | ✓     | ✓           | ✓                 | ✓               | ✓       |
| Year 9999                   | ✓      | ✓     | ✓           | ✓                 | ✓               | ✓       |
| Year only (`YYYY`)          | ✓      | ✓     | ❌          | ❌                | ❌              | ✓       |
| BC dates                    | ✓      | ✓     | ✓           | ✓                 | ✓               | ✓       |
| Week                        | ✓      | ✓     | ❌          | ❌                | ❌              | ❌      |
| Ordinal date                | ✓      | ✓     | ❌          | ❌                | ❌              | ❌      |
| Without separators          | ✓      | ✓     | ✓           | ✓                 | ✓               | ❌      |
| Without offset minutes      | ✓      | ✓     | ✓           | ✓                 | ✓               | ❌      |
| Comma as fraction separator | ✓      | ✓     | ✓           | ✓                 | ✓               | ❌      |
| Throw on invalid leap year  | ✓      | ✓     | ✓           | ✓                 | ✓               | ❌\*    |
| Offset unicode minus (−)    | ✓      | ❌    | ❌          | ❌                | ❌              | ❌      |
| Offset seconds              | ✓      | ❌    | ✓           | ✓                 | ✓               | ❌      |
| 36 fractions of a second    | ❌\*\* | ❌    | ❌          | ❌                | ❌              | ✓       |

> \* node is benevolent when parsing `2100-02-29` as `2100-03-01`<br/>
> \*\* piso accepts at most 17 fraction digits, more throws RangeError

## Error messages

What each library reports for a malformed source, from the last table `npm run compare` prints. piso throws `RangeError`, the Temporal polyfills and iso8601-duration throw, luxon returns an invalid instance whose `invalidReason` and `invalidExplanation` are shown. Native Temporal throws too, with a `Temporal error:` prefix and no echo of the input.

| Malformed                      | Source                                | piso                                                                                  | luxon                                                                                     | js-temporal                                             | temporal-polyfill                                   | native temporal                                                                         | iso8601-duration                         |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| Letter O for zero in minutes   | `2024-03-26T12:3O:15Z`                | `Unexpected ISO 8601 date character "2024-03-26T12:3[O]" at 15`                       | `unparsable: the input "2024-03-26T12:3O:15Z" can't be parsed as ISO 8601`                | `invalid RFC 9557 string: 2024-03-26T12:3O:15Z`         | `Cannot parse: 2024-03-26T12:3O:15Z`                | `Temporal error: Invalid character while parsing minute/second value in (0, 59] range.` | `invalid duration: 2024-03-26T12:3O:15Z` |
| Day out of range               | `2024-02-30T12:00:00Z`                | `ISO 8601 date day "2024-02-30[T]" at 10 is out of range 1-29`                        | `unit out of range: you specified 30 (of type number) as a day, which is invalid`         | `value out of range: 1 <= 30 <= 29`                     | `Invalid day: 30; must be between 1-29`             | `Temporal error: Parsed day value not in a valid range.`                                | `invalid duration: 2024-02-30T12:00:00Z` |
| Unknown duration designator    | `P1Y2M10DT2H30X`                      | `Unexpected ISO 8601 duration character "P1Y2M10DT2H30[X]" at 13`                     | `unparsable: the input "P1Y2M10DT2H30X" can't be parsed as ISO 8601`                      | `invalid duration: P1Y2M10DT2H30X`                      | `Cannot parse: P1Y2M10DT2H30X`                      | `Temporal error: Parsing ended abruptly.`                                               | ❌ accepted                              |
| Typo inside repeating interval | `R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM` | `Unexpected ISO 8601 duration character "R5/2024-01-01T00:00Z/P1Y2M10DT2H3[O]" at 33` | `unparsable: the input "R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM" can't be parsed as ISO 8601` | `invalid duration: R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM` | `Cannot parse: R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM` | `Temporal error: Invalid duration designator.`                                          | ❌ accepted                              |

For a syntax error piso brackets the unexpected character and gives its index, even 33 characters into a repeating interval, where the others echo the whole input or, in native Temporal's case, describe the failing rule without locating it. For a value that is well-formed but out of range, luxon names the offending unit, js-temporal gives the valid range and temporal-polyfill does both, while piso does both and keeps the consumed prefix, the bracketed cursor character, and its index. The same holds for a month, an ordinal day, and a week, e.g. `2023-W53-1` throws `ISO 8601 date week "2023-W5[3]" at 7 is out of range 1-52`. iso8601-duration's pattern is unanchored, so trailing garbage and a leading repeat are accepted and silently produce a partial result.
