# Benchmarks

Throughput and capability comparison of `@0dep/piso` against [luxon](https://www.npmjs.com/package/luxon), [iso8601-duration](https://www.npmjs.com/package/iso8601-duration), [temporal](https://www.npmjs.com/package/@js-temporal/polyfill), and native `Date`. All three libraries parse with regular expressions, piso reads the source character by character.

The numbers below are from an executed `npm run bench` on Node v26.9.0, Apple M3 Pro, macOS 27.0.1. Throughput is the tinybench average in operations per second, rounded, and the ratio is piso divided by the other library. The ✓/✗ tables are the output of `npm run compare` on the same Node version.

Speed is not the only difference. A regular expression either matches or it does not, so the other libraries can only echo the input back when it is malformed. piso reads the source with a cursor and reports the offending character and its position, see [Error messages](#error-messages).

The ratios depend on the Node version. luxon spends most of its time copying objects, and V8 in Node 22 and later made object spread and clone considerably cheaper, so the margin over luxon is narrower on Node 24 and 26 than the 6–11 times measured on Node 20. Re-run before quoting.

The temporal column is the `@js-temporal/polyfill` package. The native temporal column is `globalThis.Temporal`, which Node 26 ships, and `npm run bench` and `npm run compare` add it only when the runtime has it. Native Temporal is 4–14 times faster than the polyfill and lands just below `new Date`: about twice as fast as piso on parsing dates and `P1Y2M10DT2H30M`, while piso is still ahead on the fractional `PT0.5H` parse, the negative duration expire at and `PT2H30M` milliseconds. Native and polyfill accept and reject the same capability rows.

```sh
npm install
npm run bench
npm run compare
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

| Source                                      | piso  | luxon | ratio |
| ------------------------------------------- | ----- | ----- | ----- |
| `2007-03-01T13:00:00Z/2008-05-11T15:30:00Z` | 1.36M | 334k  | 4.1×  |
| `2007-03-01T13:00:00Z/P1Y2M10DT2H30M`       | 1.81M | 280k  | 6.5×  |
| `P1Y2M10DT2H30M/2008-05-11T15:30:00Z`       | 2.09M | 270k  | 7.7×  |

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

| Source           | piso  | iso8601-duration | luxon | temporal | native temporal | vs iso8601-duration | vs luxon | vs temporal | vs native temporal |
| ---------------- | ----- | ---------------- | ----- | -------- | --------------- | ------------------- | -------- | ----------- | ------------------ |
| `P1Y2M10DT2H30M` | 3.61M | 2.54M            | 2.89M | 1.88M    | 7.74M           | 1.4×                | 1.2×     | 1.9×        | 0.5×               |
| `PT0.5H`         | 8.52M | 3.47M            | 5.17M | 1.81M    | 7.52M           | 2.5×                | 1.6×     | 4.7×        | 1.1×               |

| Capability                                  | piso | iso8601-duration | luxon | temporal | native temporal |
| ------------------------------------------- | ---- | ---------------- | ----- | -------- | --------------- |
| Fractional time designator                  | ✓    | ✓                | ✓     | ✓        | ✓               |
| Invalid if more than one fraction           | ✓    | ✓                | ❌    | ✓        | ✓               |
| Invalid if fraction not on least designator | ✓    | ✓                | ❌    | ✓        | ✓               |
| Year designator                             | ✓    | ✓                | ✓     | ❌       | ❌              |
| Fractional date designator                  | ✓    | ❌               | ✓     | ❌       | ❌              |
| Comma as fraction separator                 | ✓    | ✓                | ❌    | ✓        | ✓               |
| Repeated duration instruction               | ✓    | ❌\*             | ❌    | ❌       | ❌              |
| Negative duration instruction               | ✓    | ❌\*             | ✓     | ✓        | ✓               |

> \* parses but the instruction is ignored

## Applying durations and intervals

Parsing is only half the job, so `suites/apply.js` measures the outcome: parse a duration and get its expire at date or milliseconds, parse an interval and get its expire at or start at date. Every library is verified to produce the same result before timing.

| Outcome                                       | piso  | luxon | temporal | native temporal | iso8601-duration | vs luxon | vs temporal | vs native temporal | vs iso8601-duration |
| --------------------------------------------- | ----- | ----- | -------- | --------------- | ---------------- | -------- | ----------- | ------------------ | ------------------- |
| Duration `P1Y2M10DT2H30M` expire at from date | 1.20M | 544k  | 182k     | 2.58M           | n/a\*            | 2.2×     | 6.6×        | 0.5×               | n/a\*               |
| Negative duration `-P1D` expire at from date  | 3.39M | 606k  | 187k     | 2.62M           | n/a\*            | 5.6×     | 18.1×       | 1.3×               | n/a\*               |
| Duration `PT2H30M` milliseconds               | 5.04M | 3.34M | 483k     | 4.14M           | 767k             | 1.5×     | 10.4×       | 1.2×               | 6.6×                |
| Interval start/duration expire at             | 733k  | 306k  | n/a      | n/a             | n/a              | 2.4×     | n/a         | n/a                | n/a                 |
| Interval duration/end start at                | 797k  | 291k  | n/a      | n/a             | n/a              | 2.7×     | n/a         | n/a                | n/a                 |
| Interval start/end expire at                  | 1.12M | 383k  | n/a      | n/a             | n/a              | 2.9×     | n/a         | n/a                | n/a                 |

\* iso8601-duration `end()` applies the duration in local time so it is not comparable with the UTC results of the others.

## Date

Native `new Date('2024-03-26')` is, of course, still faster — 2.4–3.1 times in the benchmark, with native Temporal about 2 times faster than piso. On the other hand `new Date('2024-03-26')` resolves to UTC while `new Date(2024, 2, 26)` does not. Not sure what to expect but IMHO `new Date('2024-03-26')` should be a local date.

| Source                        | piso  | luxon | temporal | native temporal | `new Date` | vs luxon | vs temporal | vs native temporal | native vs piso |
| ----------------------------- | ----- | ----- | -------- | --------------- | ---------- | -------- | ----------- | ------------------ | -------------- |
| `2024-03-26T12:30:15.5+02:00` | 3.02M | 670k  | 697k     | 5.96M           | 7.31M      | 4.5×     | 4.3×        | 0.5×               | 2.4×           |
| `2025-03-26T12:30:15.5Z`      | 3.00M | 660k  | 1.17M    | 6.26M           | 7.26M      | 4.5×     | 2.6×        | 0.5×               | 2.4×           |
| `2024-03-26`                  | 3.77M | 813k  | 1.51M    | 8.06M           | 11.7M      | 4.6×     | 2.5×        | 0.5×               | 3.1×           |

Parsing the three sources above one million times each under `node --prof` shows how the runtime shifts the ratio. From Node 20 to 26 piso sheds about 23% of its ticks, luxon about 36%, and piso still finishes first on all three:

| Node    | piso               | luxon              | luxon / piso |
| ------- | ------------------ | ------------------ | ------------ |
| 20.20.2 | 1025 ticks, 1.36 s | 5568 ticks, 7.01 s | 5.4×         |
| 24.21.0 | 931 ticks, 1.26 s  | 3469 ticks, 4.38 s | 3.7×         |
| 26.9.0  | 793 ticks, 1.07 s  | 3542 ticks, 4.51 s | 4.5×         |

Wall time includes process start and module loading, so the ratio is a little lower than the throughput ratio above.

| Capability                  | piso   | luxon | temporal | native temporal | node 26 |
| --------------------------- | ------ | ----- | -------- | --------------- | ------- |
| The 24:th hour              | ✓      | ✓     | ❌       | ❌              | ✓       |
| Year +10000                 | ✓      | ✓     | ✓        | ✓               | ✓       |
| Year 9999                   | ✓      | ✓     | ✓        | ✓               | ✓       |
| Year only (`YYYY`)          | ✓      | ✓     | ❌       | ❌              | ✓       |
| BC dates                    | ✓      | ✓     | ✓        | ✓               | ✓       |
| Week                        | ✓      | ✓     | ❌       | ❌              | ❌      |
| Ordinal date                | ✓      | ✓     | ❌       | ❌              | ❌      |
| Without separators          | ✓      | ✓     | ✓        | ✓               | ❌      |
| Without offset minutes      | ✓      | ✓     | ✓        | ✓               | ❌      |
| Comma as fraction separator | ✓      | ✓     | ✓        | ✓               | ❌      |
| Throw on invalid leap year  | ✓      | ✓     | ✓        | ✓               | ❌\*    |
| Offset unicode minus (−)    | ✓      | ❌    | ❌       | ❌              | ❌      |
| Offset seconds              | ✓      | ❌    | ✓        | ✓               | ❌      |
| 36 fractions of a second    | ❌\*\* | ❌    | ❌       | ❌              | ✓       |

> \* node is benevolent when parsing `2100-02-29` as `2100-03-01`<br/>
> \*\* piso accepts at most 17 fraction digits, more throws RangeError

## Error messages

What each library reports for a malformed source, from the last table `npm run compare` prints. piso throws `RangeError`, temporal and iso8601-duration throw, luxon returns an invalid instance whose `invalidReason` and `invalidExplanation` are shown. Native Temporal throws too, with a `Temporal error:` prefix and no echo of the input.

| Malformed                      | Source                                | piso                                                                                  | luxon                                                                                     | temporal                                                | native temporal                                                                         | iso8601-duration                         |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| Letter O for zero in minutes   | `2024-03-26T12:3O:15Z`                | `Unexpected ISO 8601 date character "2024-03-26T12:3[O]" at 15`                       | `unparsable: the input "2024-03-26T12:3O:15Z" can't be parsed as ISO 8601`                | `invalid RFC 9557 string: 2024-03-26T12:3O:15Z`         | `Temporal error: Invalid character while parsing minute/second value in (0, 59] range.` | `invalid duration: 2024-03-26T12:3O:15Z` |
| Day out of range               | `2024-02-30T12:00:00Z`                | `ISO 8601 date day "2024-02-30[T]" at 10 is out of range 1-29`                        | `unit out of range: you specified 30 (of type number) as a day, which is invalid`         | `value out of range: 1 <= 30 <= 29`                     | `Temporal error: Parsed day value not in a valid range.`                                | `invalid duration: 2024-02-30T12:00:00Z` |
| Unknown duration designator    | `P1Y2M10DT2H30X`                      | `Unexpected ISO 8601 duration character "P1Y2M10DT2H30[X]" at 13`                     | `unparsable: the input "P1Y2M10DT2H30X" can't be parsed as ISO 8601`                      | `invalid duration: P1Y2M10DT2H30X`                      | `Temporal error: Parsing ended abruptly.`                                               | ❌ accepted                              |
| Typo inside repeating interval | `R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM` | `Unexpected ISO 8601 duration character "R5/2024-01-01T00:00Z/P1Y2M10DT2H3[O]" at 33` | `unparsable: the input "R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM" can't be parsed as ISO 8601` | `invalid duration: R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM` | `Temporal error: Invalid duration designator.`                                          | ❌ accepted                              |

For a syntax error piso brackets the unexpected character and gives its index, even 33 characters into a repeating interval, where the others echo the whole input or, in native Temporal's case, describe the failing rule without locating it. For a value that is well-formed but out of range, luxon names the offending unit and temporal gives the valid range, while piso does both and keeps the consumed prefix, the bracketed cursor character, and its index. The same holds for a month, an ordinal day, and a week, e.g. `2023-W53-1` throws `ISO 8601 date week "2023-W5[3]" at 7 is out of range 1-52`. iso8601-duration's pattern is unanchored, so trailing garbage and a leading repeat are accepted and silently produce a partial result.
