# piso

[![Build](https://github.com/zerodep/piso/actions/workflows/build.yaml/badge.svg)](https://github.com/zerodep/piso/actions/workflows/build.yaml)[![Coverage Status](https://coveralls.io/repos/github/zerodep/piso/badge.svg?branch=main)](https://coveralls.io/github/zerodep/piso?branch=main)

ISO 8601 date, duration, and interval parsing package as declared on [Wikipedia ISO 8601](https://en.wikipedia.org/wiki/ISO_8601).

> In Spain, piso refers to the whole apartment, whereas in Mexico, it refers only to the floor of your departamento.
> But the above has nothing to do with this project.

# Contents

- [Api](#api)
  - [`parseInterval(iso8601Interval)`](#parseintervaliso8601interval)
  - [`parseDuration(iso8601Duration)`](#parsedurationiso8601duration)
  - [`getDate(iso8601Date)`](#getdateiso8601date)

# Api

## `parseInterval(iso8601Interval)`

Parse interval from an ISO 8601 interval string.

- `iso8601Interval`: string with ISO 8601 interval source

Returns [ISOInterval](#new-isointervalsource).

```javascript
import { parseInterval } from '@0dep/piso';

const viableIntervals = [
  '2007-03-01/2007-04-01',
  'P2Y/2007-03-01T13:00:00Z',
  '2007-03-01T13:00:00Z/P2Y',
  'R5/P1Y/2025-05-01T13:00:00Z',
  'R-1/2009-07-01T00:00Z/P1M',
  'R-1/1972-07-01T00:02Z/PT1H3M',
  'R-1/P1M/2024-07-27T00:00Z',
];

for (const i of viableIntervals) {
  console.log({ [i]: parseInterval(i).getExpireAt() });
}
```

## `parseDuration(iso8601Duration)`

Parse duration from an ISO 8601 duration string.

- `iso8601Duration`: string with ISO 8601 duration source

Returns [ISODuration](#new-isodurationsource-offset).

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

## `getDate(iso8601Date)`

Get Date from an ISO 8601 date time string.

- `iso8601Date`: string with ISO 8601 date source, date and number are also accepted

Returns date.

## `getLastWeekOfYear(Y)`

Get last week of year

- `iso8601Date`: string with ISO 8601 date source, date and number are also accepted

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
  new Date(2024, 3, 22),
  0,
  Date.UTC(2024, 3, 22),
];

for (const d of viableDates) {
  console.log({ [d]: getDate(d) });
}

try {
  getDate('2023-02-29');
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

> NB! string without timezone precision is considered local date, or as Wikipedia put it "If no UTC relation information is given with a time representation, the time is assumed to be in local time".

## `new ISOInterval(source)`

Interval instance.

**Properties:**

- `repeat`: number of repeats
- `start`: start date as [ISODate](#new-isodatesource-offset)
- `duration`: duration as [ISODuration](#new-isodurationsource-offset)
- `end`: end date as [ISODate](#new-isodatesource-offset)
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
// Yes, indefinite number of repetititions

console.log((parseInterval('R-1/2024-03-27/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// Yes, indefinite number of repetititions from start date

console.log((parseInterval('R-1/P1Y/2024-03-27').type & 1) === 1 ? 'Yes' : 'No');
// Yes, indefinite number of repetititions until end date

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

### `interval.parse()`

Returns [ISOInterval](#new-isointervalsource).

Throws `RangeError` if something is off.

## `new ISODate(source[, offset])`

ISO date instance.

**Constructor**:

- `source`: ISO 8601 date source string
- `offset`: optional source string offset column number

**Properties:**

- `result`:
  - `Y`: full year
  - `M`: javascript month
  - `D`: date
  - `H`: hours
  - `m`: minutes
  - `S`: seconds
  - `F`: milliseconds
  - `Z`: Z, +, or -
  - `OH`: offset hours
  - `Om`: offset minutes
  - `OS`: offset seconds

### `date.parse()`

### `date.parsePartialDate(Y, M, D)`

Parse partial date as compared to passed date part arguments.

- `Y`: required full year
- `M`: required javascript month
- `D`: required date

Returns [ISODate](#new-isodatesource-offset)

### `date.toDate()`

Get Date represented by source.

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

### `duration.toMilliseconds([startDate])`

Get duration in milliseconds from optional start date.

### `duration.untilMilliseconds([endDate])`

Get duration in milliseconds until optional end date.

# Example

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

console.log('duration millisecods', duration.toMilliseconds(new Date()));
```

# Repetitions

## With end date

`R4/P2Y/2007-08-01`

| Repetition | start at   | expire at  |
| ---------: | ---------- | ---------- |
|          4 | 1999-08-01 | 2001-08-01 |
|          3 | 2001-08-01 | 2003-08-01 |
|          2 | 2003-08-01 | 2005-08-01 |
|          1 | 2005-08-01 | 2007-08-01 |

# Benchmarking

Seems to run 3 times more efficient than RegExp implementations. But date parsing is, of course, slower compared to `new Date('2024-03-26')`. On the other hand `new Date('2024-03-26')` resolves to UTC while `new Date(2024, 2, 26)` does not. Not sure what to expect but IMHO it should be a local date.
