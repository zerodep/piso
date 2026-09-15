# Benchmarks

Throughput and capability comparison of `@0dep/piso` against [luxon](https://www.npmjs.com/package/luxon), [iso8601-duration](https://www.npmjs.com/package/iso8601-duration), [temporal](https://www.npmjs.com/package/@js-temporal/polyfill), and native `Date`. All three libraries parse with regular expressions, piso reads the source character by character.

The numbers below are from an executed `npm run bench` on Node v24.21.0, Apple M3 Pro, macOS 26.6.2. Throughput is the tinybench average in operations per second, rounded, and the ratio is piso divided by the other library. The ✓/✗ tables are the output of `npm run compare` on the same Node version.

Speed is not the only difference. A regular expression either matches or it does not, so the other libraries can only echo the input back when it is malformed. piso reads the source with a cursor and reports the offending character and its position, see [Error messages](#error-messages).

The ratios depend on the Node version. luxon spends most of its time copying objects, and V8 in Node 22 and later made object spread and clone considerably cheaper, so the margin over luxon is narrower on Node 24 than the 6–11 times measured on Node 20. Re-run before quoting.

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
| `2007-03-01T13:00:00Z/2008-05-11T15:30:00Z` | 1.42M | 339k  | 4.2×  |
| `2007-03-01T13:00:00Z/P1Y2M10DT2H30M`       | 1.70M | 277k  | 6.1×  |
| `P1Y2M10DT2H30M/2008-05-11T15:30:00Z`       | 2.01M | 269k  | 7.5×  |

| Capability         | piso | luxon |
| ------------------ | ---- | ----- |
| start/end          | ✓    | ✓     |
| start/duration     | ✓    | ✓     |
| duration/end       | ✓    | ✓     |
| Repeating interval | ✓    | ❌    |
| Start date only    | ✓    | ❌    |
| Relative end date  | ✓    | ❌\*  |

> \* `2007-11-13/15` parses but the relative end resolves to a time of day instead of a date

## Duration

| Source           | piso  | iso8601-duration | luxon | temporal | vs iso8601-duration | vs luxon | vs temporal |
| ---------------- | ----- | ---------------- | ----- | -------- | ------------------- | -------- | ----------- |
| `P1Y2M10DT2H30M` | 3.36M | 2.56M            | 2.82M | 1.66M    | 1.3×                | 1.2×     | 2.0×        |
| `PT0.5H`         | 7.73M | 3.47M            | 4.99M | 1.66M    | 2.2×                | 1.5×     | 4.7×        |

| Capability                                  | piso | iso8601-duration | luxon | temporal |
| ------------------------------------------- | ---- | ---------------- | ----- | -------- |
| Fractional time designator                  | ✓    | ✓                | ✓     | ✓        |
| Invalid if more than one fraction           | ✓    | ✓                | ❌    | ✓        |
| Invalid if fraction not on least designator | ✓    | ✓                | ❌    | ✓        |
| Year designator                             | ✓    | ✓                | ✓     | ❌       |
| Fractional date designator                  | ✓    | ❌               | ✓     | ❌       |
| Comma as fraction separator                 | ✓    | ✓                | ❌    | ✓        |
| Repeated duration instruction               | ✓    | ❌\*             | ❌    | ❌       |
| Negative duration instruction               | ✓    | ❌\*             | ✓     | ✓        |

> \* parses but the instruction is ignored

## Applying durations and intervals

Parsing is only half the job, so `suites/apply.js` measures the outcome: parse a duration and get its expire at date or milliseconds, parse an interval and get its expire at or start at date. Every library is verified to produce the same result before timing.

| Outcome                                       | piso  | luxon | temporal | iso8601-duration | vs luxon | vs temporal | vs iso8601-duration |
| --------------------------------------------- | ----- | ----- | -------- | ---------------- | -------- | ----------- | ------------------- |
| Duration `P1Y2M10DT2H30M` expire at from date | 1.24M | 557k  | 170k     | n/a\*            | 2.2×     | 7.3×        | n/a\*               |
| Negative duration `-P1D` expire at from date  | 3.70M | 624k  | 186k     | n/a\*            | 5.9×     | 19.8×       | n/a\*               |
| Duration `PT2H30M` milliseconds               | 4.27M | 3.02M | 412k     | 896k             | 1.4×     | 10.4×       | 4.8×                |
| Interval start/duration expire at             | 800k  | 299k  | n/a      | n/a              | 2.7×     | n/a         | n/a                 |
| Interval duration/end start at                | 876k  | 290k  | n/a      | n/a              | 3.0×     | n/a         | n/a                 |
| Interval start/end expire at                  | 1.26M | 383k  | n/a      | n/a              | 3.3×     | n/a         | n/a                 |

\* iso8601-duration `end()` applies the duration in local time so it is not comparable with the UTC results of the others.

## Date

Native `new Date('2024-03-26')` is, of course, still faster — 2.3–2.9 times in the benchmark. On the other hand `new Date('2024-03-26')` resolves to UTC while `new Date(2024, 2, 26)` does not. Not sure what to expect but IMHO `new Date('2024-03-26')` should be a local date.

| Source                        | piso  | luxon | temporal | `new Date` | vs luxon | vs temporal | native vs piso |
| ----------------------------- | ----- | ----- | -------- | ---------- | -------- | ----------- | -------------- |
| `2024-03-26T12:30:15.5+02:00` | 2.91M | 692k  | 656k     | 7.40M      | 4.2×     | 4.4×        | 2.5×           |
| `2025-03-26T12:30:15.5Z`      | 3.24M | 700k  | 1.21M    | 7.54M      | 4.6×     | 2.7×        | 2.3×           |
| `2024-03-26`                  | 4.00M | 817k  | 1.44M    | 11.5M      | 4.9×     | 2.8×        | 2.9×           |

Parsing the three sources above one million times each under `node --prof` shows how the runtime shifts the ratio. piso gains about 9% from the newer runtime, luxon about 38%, and piso still finishes first on both:

| Node    | piso               | luxon              | luxon / piso |
| ------- | ------------------ | ------------------ | ------------ |
| 20.20.2 | 1025 ticks, 1.36 s | 5568 ticks, 7.01 s | 5.4×         |
| 24.21.0 | 931 ticks, 1.26 s  | 3469 ticks, 4.38 s | 3.7×         |

Wall time includes process start and module loading, so the ratio is a little lower than the throughput ratio above.

| Capability                  | piso   | luxon | temporal | node 24 |
| --------------------------- | ------ | ----- | -------- | ------- |
| The 24:th hour              | ✓      | ✓     | ❌       | ✓       |
| Year +10000                 | ✓      | ✓     | ✓        | ✓       |
| Year 9999                   | ✓      | ✓     | ✓        | ✓       |
| Year only (`YYYY`)          | ✓      | ✓     | ❌       | ✓       |
| BC dates                    | ✓      | ✓     | ✓        | ✓       |
| Week                        | ✓      | ✓     | ❌       | ❌      |
| Ordinal date                | ✓      | ✓     | ❌       | ❌      |
| Without separators          | ✓      | ✓     | ✓        | ❌      |
| Without offset minutes      | ✓      | ✓     | ✓        | ❌      |
| Comma as fraction separator | ✓      | ✓     | ✓        | ❌      |
| Throw on invalid leap year  | ✓      | ✓     | ✓        | ❌\*    |
| Offset unicode minus (−)    | ✓      | ❌    | ❌       | ❌      |
| Offset seconds              | ✓      | ❌    | ✓        | ❌      |
| 36 fractions of a second    | ❌\*\* | ❌    | ❌       | ✓       |

> \* node is benevolent when parsing `2100-02-29` as `2100-03-01`<br/>
> \*\* piso accepts at most 17 fraction digits, more throws RangeError

## Error messages

What each library reports for a malformed source, from the last table `npm run compare` prints. piso throws `RangeError`, temporal and iso8601-duration throw, luxon returns an invalid instance whose `invalidReason` and `invalidExplanation` are shown.

| Malformed                      | Source                                | piso                                                                                  | luxon                                                                                     | temporal                                                | iso8601-duration                         |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| Letter O for zero in minutes   | `2024-03-26T12:3O:15Z`                | `Unexpected ISO 8601 date character "2024-03-26T12:3[O]" at 15`                       | `unparsable: the input "2024-03-26T12:3O:15Z" can't be parsed as ISO 8601`                | `invalid RFC 9557 string: 2024-03-26T12:3O:15Z`         | `invalid duration: 2024-03-26T12:3O:15Z` |
| Day out of range               | `2024-02-30T12:00:00Z`                | `Invalid ISO 8601 date "2024-02-30T12:00:00Z"`                                        | `unit out of range: you specified 30 (of type number) as a day, which is invalid`         | `value out of range: 1 <= 30 <= 29`                     | `invalid duration: 2024-02-30T12:00:00Z` |
| Unknown duration designator    | `P1Y2M10DT2H30X`                      | `Unexpected ISO 8601 duration character "P1Y2M10DT2H30[X]" at 13`                     | `unparsable: the input "P1Y2M10DT2H30X" can't be parsed as ISO 8601`                      | `invalid duration: P1Y2M10DT2H30X`                      | ❌ accepted                              |
| Typo inside repeating interval | `R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM` | `Unexpected ISO 8601 duration character "R5/2024-01-01T00:00Z/P1Y2M10DT2H3[O]" at 33` | `unparsable: the input "R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM" can't be parsed as ISO 8601` | `invalid duration: R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM` | ❌ accepted                              |

For a syntax error piso brackets the unexpected character and gives its index, even 33 characters into a repeating interval, where the others echo the whole input. For a value that is well-formed but out of range, luxon and temporal name the offending unit while piso only names the date. iso8601-duration's pattern is unanchored, so trailing garbage and a leading repeat are accepted and silently produce a partial result.
