# piso

[![Build](https://github.com/zerodep/piso/actions/workflows/build.yaml/badge.svg)](https://github.com/zerodep/piso/actions/workflows/build.yaml)[![Coverage Status](https://coveralls.io/repos/github/zerodep/piso/badge.svg?branch=main)](https://coveralls.io/github/zerodep/piso?branch=main)

ISO 8601 date, duration, and interval parsing package as declared on [Wikipedia ISO 8601](https://en.wikipedia.org/wiki/ISO_8601).

> In Spain, piso refers to the whole apartment, whereas in Mexico, it refers only to the floor of your departamento.
> But the above has nothing to do with this project.

## Contents

<!-- toc -->

- [Api](#api)
  - [`parseInterval(iso8601Interval[, enforceUTC])`](#parseintervaliso8601interval-enforceutc)
  - [`parseDuration(iso8601Duration)`](#parsedurationiso8601duration)
  - [`getDate(iso8601Date[, enforceUTC])`](#getdateiso8601date-enforceutc)
  - [`getExpireAt(iso8601Interval[, compareDate[, startDate[, enforceUTC]]])`](#getexpireatiso8601interval-comparedate-startdate-enforceutc)
  - [`getStartAt(iso8601Interval[, compareDate[, endDate[, enforceUTC]]])`](#getstartatiso8601interval-comparedate-enddate-enforceutc)
  - [`getUTCLastWeekOfYear(Y)`](#getutclastweekofyeary)
  - [`getUTCWeekOneDate(Y)`](#getutcweekonedatey)
  - [`getISOWeekString([date])`](#getisoweekstringdate)
  - [`getUTCWeekNumber([date])`](#getutcweeknumberdate)
- [`new ISOInterval(source[, enforceUTC])`](#new-isointervalsource-enforceutc)
  - [`interval.type`](#intervaltype)
  - [`interval.parse()`](#intervalparse)
  - [`interval.getExpireAt([compareDate[, startDate[, enforceUTC]]])`](#intervalgetexpireatcomparedate-startdate-enforceutc)
  - [`interval.getStartAt([compareDate[, endDate[, enforceUTC]]])`](#intervalgetstartatcomparedate-enddate-enforceutc)
  - [`interval.toJSON()`](#intervaltojson)
- [`new ISODate(source[, options])`](#new-isodatesource-options)
  - [`date.parse()`](#dateparse)
  - [`date.parsePartialDate(Y, M, D, W)`](#dateparsepartialdatey-m-d-w)
  - [`date.toDate([enforceUTC])`](#datetodateenforceutc)
  - [`date.toJSON()`](#datetojson)
- [`new ISODuration(source[, offset])`](#new-isodurationsource-offset)
  - [`duration.parse()`](#durationparse)
  - [`duration.getExpireAt([startDate[, repetition]])`](#durationgetexpireatstartdate-repetition)
  - [`duration.getStartAt([endDate[, repetition]])`](#durationgetstartatenddate-repetition)
  - [`duration.toMilliseconds([startDate[, repetition]])`](#durationtomillisecondsstartdate-repetition)
  - [`duration.untilMilliseconds([endDate[, repetition]])`](#durationuntilmillisecondsenddate-repetition)
- [Example](#example)
- [Repetitions](#repetitions)
  - [With end date](#with-end-date)
- [Benchmarking](#benchmarking)

<!-- /toc -->

## Api

### `parseInterval(iso8601Interval[, enforceUTC])`

Parse interval from an ISO 8601 interval string.

- `iso8601Interval`: string with ISO 8601 interval source
- `enforceUTC`: optional boolean, enforce UTC if source lacks time zone offset

Returns [ISOInterval](#new-isointervalsource-enforceutc).

Interval sources are bounded by their field limits: repetitions accept at most 17 digits, a maximal date — signed 17 digit year, 17 second fractions, and offset with seconds — is 60 characters, and a maximal [duration](#parsedurationiso8601duration) is 129 characters. Consequently a valid interval never exceeds 209 characters.

```javascript
import { parseInterval, ISOInterval } from '@0dep/piso';

const viableIntervals = [
  '2007-03-01/2007-04-01',
  'P2Y/2007-03-01T13:00:00Z',
  '2007-03-01T13:00:00Z/P2Y',
  'R5/P1Y/2025-05-01T13:00:00Z',
  'R-1/2009-07-01T00:00Z/P1M',
  'R-1/1972-07-01T00:02Z/PT1H3M',
  'R-1/P1M/2024-07-27T00:00Z',
  '2007-318/2007-319',
  '2007-318/319T24:00:00Z',
  '2026-09-01T10:00:00Z',
];

for (const i of viableIntervals) {
  console.log({ [i]: parseInterval(i).getExpireAt(), utc: parseInterval(i, true).getExpireAt() });
}
```

### `parseDuration(iso8601Duration)`

Parse duration from an ISO 8601 duration string.

- `iso8601Duration`: string with ISO 8601 duration source

Returns [ISODuration](#new-isodurationsource-offset).

Interval sources are accepted as well, e.g. `R3/PT10H` or `2007-03-01/P1Y`, in which case the duration part is returned.

Each duration designator value accepts at most 17 digits, so a valid duration never exceeds 129 characters — more throws RangeError.

A leading minus (`-` or unicode minus `−`) as of ISO 8601-2:2019 negates the duration, e.g. `-P1D`, and is only accepted by `parseDuration` and [ISODuration](#new-isodurationsource-offset) — not in intervals. The parsed result then has `sign: -1`, `getExpireAt` subtracts the duration and `getStartAt` adds it.

```javascript
import { parseDuration } from '@0dep/piso';

const yesterday = parseDuration('-P1D');

console.log(yesterday.result.sign, yesterday.getExpireAt(new Date(Date.UTC(2024, 2, 1))).toISOString());
```

```javascript
import { parseDuration } from '@0dep/piso';

const viableDurations = [
  'PT1M5S',
  'PT1M0.5S',
  'PT0.5S',
  'PT0.01S',
  'PT0.001S',
  'PT0.0001S',
  'PT0.5M',
  'PT0.5H',
  'PT1.5H',
  'P0.5D',
  'P1W',
  'P0.5W',
  'P0.5M',
  'P0.5D',
  'P1Y',
  'P1Y2M3W4DT5H6M7S',
  'PT0S',
  'P0D',
];

for (const d of viableDurations) {
  console.log({ [d]: parseDuration(d).getExpireAt() });
}

try {
  // fractions are only allowed on the smallest unit
  parseDuration('P0.5YT3S');
} catch (err) {
  console.log({ err });
}
```

### `getDate(iso8601Date[, enforceUTC])`

Get Date from an ISO 8601 date time string.

- `iso8601Date`: string with ISO 8601 date source, date and number are also accepted
- `enforceUTC`: optional boolean, enforce UTC if source lacks time zone offset

Returns date.

```javascript
import { getDate } from '@0dep/piso';

const viableDates = [
  '2024-01-27',
  '2024-02-28',
  '2024-02-29',
  '2020-02-29',
  '2016-02-29',
  '2024-W03-2',
  '2024-01',
  '2024-12',
  '20240127',
  '2024-012',
  '2024012',
  '2024-012T08:06:30',
  '2024-02-27T08:06:30',
  '2024-02-27T08:06:30.001',
  '2024-02-27T08:06:30.0011',
  '2024-02-27T08:06:30.0',
  '2024-02-27T08:06:30,001',
  '2024-02-27T08:06:30Z',
  '2024-02-03T08:06:30+02:00',
  '2024-02-03T08:06:30.5+02:00',
  '20240203T080630+0200',
  '2024-02-03T08:06:30-02:30',
  '2024-02-03T08:06:30-02',
  '2025-01-01T12:00:42.01-02:00',
  '2025-01-01T12:00:42.01+02:30',
  '2025-01-01T12:00:42.01+02:30:30',
  '2025-01-01T23:59',
  '2025-01-01T24:00',
  '2025-01-01T24:00:00',
  '2025-01-01T24:00:00.000',
  '2025-01-01T24:00Z',
  '2025-01-01T24:00+01',
  '2025-01-01T24:00:00+01',
  '2025-01-01T24:00:00.00+01',
  '20240127T1200',
  '20240127T120001',
  '20240127T120001,001',
  '2024',
  '+102024',
  '-00000012',
  new Date(2024, 3, 22),
  0,
  Date.UTC(2024, 3, 22),
];

for (const d of viableDates) {
  console.log({ [d]: getDate(d), utc: getDate(d, true) });
}

try {
  getDate('2023-02-29');
} catch (err) {
  console.log({ err });
}

try {
  // not this year
  getDate('2023-W53-1T12:00');
} catch (err) {
  console.log({ err });
}

try {
  // unbalanced separators
  getDate('2023-02-28T1200');
} catch (err) {
  console.log({ err });
}
```

> NB! string without timezone precision is considered local date, or as Wikipedia put it "If no UTC relation information is given with a time representation, the time is assumed to be in local time". Unless, of course, enforce UTC instruction is used.

### `getExpireAt(iso8601Interval[, compareDate[, startDate[, enforceUTC]]])`

Parse interval and get the closest expire at date, see [interval.getExpireAt](#intervalgetexpireatcomparedate-startdate-enforceutc).

- `iso8601Interval`: string with ISO 8601 interval source
- `compareDate`: optional date that repetitions are compared against, defaults to now
- `startDate`: optional start date, used when the source is a duration without start or end date, defaults to now
- `enforceUTC`: optional boolean, enforce UTC if source lacks time zone offset

Returns date.

```javascript
import { getExpireAt } from '@0dep/piso';

console.log(getExpireAt('R-1/2024-01-01T00:00Z/P1M', new Date(Date.UTC(2024, 2, 15))).toISOString());
// 2024-04-01T00:00:00.000Z

console.log(getExpireAt('PT1H', undefined, new Date(Date.UTC(2024, 0, 1))).toISOString());
// 2024-01-01T01:00:00.000Z
```

### `getStartAt(iso8601Interval[, compareDate[, endDate[, enforceUTC]]])`

Parse interval and get the start at date, see [interval.getStartAt](#intervalgetstartatcomparedate-enddate-enforceutc).

- `iso8601Interval`: string with ISO 8601 interval source
- `compareDate`: optional date that repetitions are compared against, defaults to now
- `endDate`: optional end date, used when the source is a duration without start or end date, defaults to now
- `enforceUTC`: optional boolean, enforce UTC if source lacks time zone offset

Returns date.

```javascript
import { getStartAt } from '@0dep/piso';

console.log(getStartAt('R-1/P1M/2024-12-01T00:00Z', new Date(Date.UTC(2024, 2, 15))).toISOString());
// 2024-11-01T00:00:00.000Z
```

### `getUTCLastWeekOfYear(Y)`

Get last week of year

- `Y`: full year

Returns 52 or 53.

```javascript
import { getUTCLastWeekOfYear } from '@0dep/piso';

console.log('last week number', getUTCLastWeekOfYear(2024));
```

### `getUTCWeekOneDate(Y)`

Get Monday week one date

- `Y`: full year

Returns date Monday week one

```javascript
import { getUTCWeekOneDate } from '@0dep/piso';

console.log('Monday week one', getUTCWeekOneDate(2021));
```

### `getISOWeekString([date])`

Get ISO week date string from date.

- `date`: optional date, defaults to now

```javascript
import { getISOWeekString } from '@0dep/piso';

console.log('date as week', getISOWeekString(new Date(2021, 11, 28)));
```

### `getUTCWeekNumber([date])`

Get weeknumber from date.

- `date`: optional date, defaults to now

Returns:

- `Y`: full year representation of week date
- `W`: week number
- `weekday`: ISO weekday, 1 = Monday .. 7 = Sunday

```javascript
import { getUTCWeekNumber } from '@0dep/piso';

console.log(getUTCWeekNumber(new Date(2016, 0, 1)));
```

## `new ISOInterval(source[, enforceUTC])`

Interval instance.

**Constructor:**

- `source`: ISO8601 interval source
- `enforceUTC`: optional boolean, enforce UTC if source lacks time zone offset

**Properties:**

- `repeat`: number of repeats
- `start`: start date as [ISODate](#new-isodatesource-options)
- `duration`: duration as [ISODuration](#new-isodurationsource-offset)
- `end`: end date as [ISODate](#new-isodatesource-options)
- `type`: [interval type](#intervaltype)
- `get startDate`: start date as date, requires [parse()](#intervalparse) to be called
- `get endDate`: end date as date, requires [parse()](#intervalparse) to be called

### `interval.type`

Number representing the interval type flags. Available after [parse](#intervalparse).

- `1`: Repeat
- `2`: Start date
- `4`: Duration
- `8`: End date

**Example flags**

- `2`: Start date only, a point in time where start and expire dates coincide
- `3`: Repeat and start date, rather pointless but possible nevertheless
- `5`: Repeat and duration
- `6`: Start date and duration
- `7`: Repeat, start date, and duration
- `10`: Start- and end date
- `12`: Duration and end date
- `13`: Repeat, duration, and end date

> Do I have repeat in my interval?

```javascript
import { parseInterval } from '@0dep/piso';

console.log((parseInterval('R3/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// Yes

console.log((parseInterval('R-1/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// Yes, indefinite number of repetitions

console.log((parseInterval('R-1/2024-03-27/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// Yes, indefinite number of repetitions from start date

console.log((parseInterval('R-1/P1Y/2024-03-27').type & 1) === 1 ? 'Yes' : 'No');
// Yes, indefinite number of repetitions until end date

console.log((parseInterval('R0/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// No, zero is equal to once

console.log((parseInterval('R1/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// No, since it's just once

console.log((parseInterval('R1/2024-03-28').type & 1) === 1 ? 'Yes' : 'No');
// No, pointless repeat

console.log((parseInterval('R1/2024-03-28/31').type & 1) === 1 ? 'Yes' : 'No');
// No, pointless repeat

console.log((parseInterval('R1/P1Y/2024-03-28').type & 1) === 1 ? 'Yes' : 'No');
// No
```

> Is start date defined in my interval?

```javascript
import { parseInterval } from '@0dep/piso';

const interval = parseInterval('R-1/2024-03-28/P1Y');

console.log((interval.type | 2) === interval.type ? 'Yes' : 'No');
```

> Start date only

An interval consisting of only a start date is a point in time, start and expire dates are the same.

```javascript
import { parseInterval } from '@0dep/piso';

const interval = parseInterval('2026-09-01T10:00:00Z');

console.log(interval.type);
// 2

console.log(interval.getStartAt().toISOString());
// 2026-09-01T10:00:00.000Z

console.log(interval.getExpireAt().toISOString());
// 2026-09-01T10:00:00.000Z
```

### `interval.parse()`

Returns [ISOInterval](#new-isointervalsource-enforceutc).

Throws `RangeError` if something is off.

### `interval.getExpireAt([compareDate[, startDate[, enforceUTC]]])`

Get the closest expire at date. Parses the source if [parse()](#intervalparse) has not been called.

- `compareDate`: optional date that repetitions are compared against, defaults to now
- `startDate`: optional start date, used when the interval is a duration without start or end date, defaults to now
- `enforceUTC`: optional boolean, overrides the constructor argument

Returns date.

A repeating interval walks the repetitions forward from the start date, or backward from the end date, and returns the first expire date after `compareDate`. An interval with an end date and no repeat returns the end date, and an interval with only a start date returns the start date.

```javascript
import { parseInterval } from '@0dep/piso';

const interval = parseInterval('R-1/2024-01-01T00:00Z/P1M');

console.log(interval.getExpireAt(new Date(Date.UTC(2024, 2, 15))).toISOString());
// 2024-04-01T00:00:00.000Z
```

### `interval.getStartAt([compareDate[, endDate[, enforceUTC]]])`

Get the start at date. Parses the source if [parse()](#intervalparse) has not been called.

- `compareDate`: optional date that repetitions are compared against, defaults to now
- `endDate`: optional end date, used when the interval is a duration without start or end date, defaults to now
- `enforceUTC`: optional boolean, overrides the constructor argument

Returns date.

A repeating interval returns the start of the repetition that expires first after `compareDate`. An interval with a start date and no repeat returns the start date.

```javascript
import { parseInterval } from '@0dep/piso';

const interval = parseInterval('R-1/2024-01-01T00:00Z/P1M');

console.log(interval.getStartAt(new Date(Date.UTC(2024, 2, 15))).toISOString());
// 2024-03-01T00:00:00.000Z
```

### `interval.toJSON()`

Get interval represented as JavaScript Object Notation.

```javascript
import { ISOInterval } from '@0dep/piso';

console.log(JSON.stringify({ interval: new ISOInterval('R2/P1Y/2024-03-28') }, null, 2));
```

## `new ISODate(source[, options])`

ISO date instance.

**Constructor**:

- `source`: ISO 8601 date source string
- `options`: optional parsing options
  - `offset`: source string offset column number, -1 is default
  - `endChars`: string with optional characters that mark the end of the ISO date, e.g. `/`
  - `enforceSeparators`: boolean that will require time part separators such as `-` and `:`
  - `enforceUTC`: optional boolean, enforce UTC if source lacks time zone offset

**Properties:**

- `result`:
  - `Y`: full year
  - `M`: javascript month
  - `D`: date or ordinal day
  - `H`: hours
  - `m`: minutes
  - `S`: seconds
  - `F`: milliseconds, including fractional milliseconds when the source has more than 3 fraction digits; at most 17 fraction digits are accepted, more throws RangeError
  - `Z`: Z, +, −, or -
  - `OH`: offset hours
  - `Om`: offset minutes
  - `OS`: offset seconds
  - `isValid`: boolean indicating if parse was successful

### `date.parse()`

Parse the source and populate `result`. Returns [ISODate](#new-isodatesource-options).

Throws `RangeError` if something is off.

### `date.parsePartialDate(Y, M, D, W)`

Parse partial date as compared to passed date part arguments.

- `Y`: required full year
- `M`: optional javascript month, required is not ordinal day
- `D`: required date, weekday (1 = Monday .. 7 = Sunday) if `W` is passed, or ordinal day
- `W`: optional week number, then `D` is the week day

Returns [ISODate](#new-isodatesource-options)

### `date.toDate([enforceUTC])`

Get Date represented by source.

- `enforceUTC`: optional boolean, enforce UTC if source lacks time zone offset

### `date.toJSON()`

Get Date represented as JavaScript Object Notation.

## `new ISODuration(source[, offset])`

Duration instance.

**Constructor**:

- `source`: duration source string
- `offset`: optional source string offset column number

**Properties:**

- `result`:
  - `Y`: years
  - `M`: months
  - `W`: weeks
  - `D`: days
  - `H`: hours
  - `m`: minutes
  - `S`: seconds
  - `sign`: `-1` if the source has a leading minus, otherwise absent
  - `isValid`: boolean indicating if parse was successful

### `duration.parse()`

Parse the source and populate `result`. Returns [ISODuration](#new-isodurationsource-offset).

Throws `RangeError` if something is off.

### `duration.getExpireAt([startDate[, repetition]])`

Get the date the duration expires at, applied in UTC. A negative duration subtracts instead.

- `startDate`: optional start date, defaults to now
- `repetition`: optional number of times to apply the duration, defaults to 1

Returns date.

```javascript
import { parseDuration } from '@0dep/piso';

const duration = parseDuration('PT2H30M');

console.log(duration.getExpireAt(new Date(Date.UTC(2024, 0, 1)), 2).toISOString());
// 2024-01-01T05:00:00.000Z
```

### `duration.getStartAt([endDate[, repetition]])`

Get the date the duration started at, i.e. the duration subtracted from the end date in UTC. A negative duration adds instead.

- `endDate`: optional end date, defaults to now
- `repetition`: optional number of times to apply the duration, defaults to 1

Returns date.

### `duration.toMilliseconds([startDate[, repetition]])`

Get duration in milliseconds from optional start date.

- `startDate`: optional start date, defaults to `1971-01-01T00:00:00Z` since it is not a leap year
- `repetition`: optional number of times to apply the duration, defaults to 1

### `duration.untilMilliseconds([endDate[, repetition]])`

Get duration in milliseconds until optional end date, hence a negative number for a positive duration.

- `endDate`: optional end date, defaults to `1971-01-01T00:00:00Z`
- `repetition`: optional number of times to apply the duration, defaults to 1

## Example

An example to get start and end date:

```javascript
import { parseInterval } from '@0dep/piso';

const source = '2007-03-01T13:00:00Z/P1Y2M10DT2H30M';

const interval = parseInterval(source);

console.log('starts at', interval.getStartAt());
console.log('expires at', interval.getExpireAt());
console.log('duration milliseconds', interval.duration.toMilliseconds());
```

An example to get duration milliseconds:

```javascript
import { parseDuration } from '@0dep/piso';

const duration = parseDuration('PT2H30M');

console.log('duration milliseconds', duration.toMilliseconds(new Date()));
```

## Repetitions

### With end date

`R4/P2Y/2007-08-01`

| Repetition | start at   | expire at  |
| ---------: | ---------- | ---------- |
|          4 | 1999-08-01 | 2001-08-01 |
|          3 | 2001-08-01 | 2003-08-01 |
|          2 | 2003-08-01 | 2005-08-01 |
|          1 | 2005-08-01 | 2007-08-01 |

## Benchmarking

On Node 24 piso parses intervals 4–7.5 times and dates 4–5 times faster than luxon, and durations 1.2–2.2 times faster than luxon and iso8601-duration. Native `new Date` is still 2–3 times faster than piso. What piso does that neither native `Date` nor the RegExp-based libraries do is tell you where a malformed string went wrong:

```javascript
import { parseInterval } from '@0dep/piso';

try {
  parseInterval('R5/2024-01-01T00:00Z/P1Y2M10DT2H3OM');
} catch (err) {
  console.log(err.message);
  // Unexpected ISO 8601 duration character "R5/2024-01-01T00:00Z/P1Y2M10DT2H3[O]" at 33
}
```

Throughput tables, the capability and error message comparison against luxon, iso8601-duration, and temporal, and how to run the suites are in [bench/README.md](bench/README.md). The numbers there come from executed `npm run bench` and `npm run compare` runs and note the Node version, since the margins over the RegExp-based libraries shift between V8 versions.
