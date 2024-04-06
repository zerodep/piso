# piso

[![Build](https://github.com/zerodep/piso/actions/workflows/build.yaml/badge.svg)](https://github.com/zerodep/piso/actions/workflows/build.yaml)[![Coverage Status](https://coveralls.io/repos/github/zerodep/piso/badge.svg?branch=main)](https://coveralls.io/github/zerodep/piso?branch=main)

ISO 8601 date, duration, and interval parsing package as declared on [Wikipedia ISO 8601](https://en.wikipedia.org/wiki/ISO_8601).

> In Spain, piso refers to the whole apartment, whereas in Mexico, it refers only to the floor of your departamento.
> But the above has nothing to do with this project.

# Api

## `parseInterval(iso8601Interval)`

Parse interval from an ISO 8601 interval string.

- `iso8601Interval`: string with ISO 8601 interval source

Returns [ISOInterval](#new-isointervalsource).

## `parseDuration(iso8601Duration)`

Parse duration from an ISO 8601 duration string.

- `iso8601Duration`: string with ISO 8601 duration source

Returns [ISODuration](#new-isodurationsource-offset).

## `getDate(iso8601Date)`

Get Date from an ISO 8601 date time string.

- `iso8601Date`: string with ISO 8601 date source

Returns date.

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

```js
import { parseInterval } from '@0dep/piso';

console.log((parseInterval('R3/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// Yes

console.log((parseInterval('R-1/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// Yes, indefinate number of repetititions

console.log((parseInterval('R-1/2024-03-27/P1Y').type & 1) === 1 ? 'Yes' : 'No');
// Yes, indefinate number of repetititions from start date

console.log((parseInterval('R-1/P1Y/2024-03-27').type & 1) === 1 ? 'Yes' : 'No');
// Yes, indefinate number of repetititions until end date

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

```js
import { parseInterval } from '@0dep/piso';

const interval = parseInterval();

console.log((interval.type | 2) === interval.type ? 'Yes' : 'No');
```

### `interval.parse()`

Returns [ISOInterval](#new-isointervalsource).

Throws `RangeError` if something is off.

### `interval.next([compareDate])`

Opinionated function that attempts to figure out the closest date in the interval.

- `compareDate`: optional compare date, defaults to now

Runs parse if not parsed. Throws `RangeError` if something is off.

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

- `Y`: required full year
- `M`: required javascript month
- `D`: required date

Returns [ISODate](#new-isodatesource-offset)

### `date.toUTCDate()`

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
import { parseInterval } from 'piso';

const source = '2007-03-01T13:00:00Z/P1Y2M10DT2H30M';

const interval = parseInterval(source);

const cutoffDates = interval.getDates();

console.log('starts at', cutoffDates[0]);
console.log('ends at', cutoffDates[1]);
console.log('duration milliseconds', interval.duration.toMilliseconds());
```

An example to get duration milliseconds:

```javascript
import { parseDuration } from 'piso';

const duration = parseDuration('PT2H30M');

console.log('duration millisecods', duration.toMilliseconds(new Date()));
```

# Benchmarking

Seems to run 4 times more efficient than RegExp implementations. But, date parsing is, off course, slower, compared to `new Date('2024-03-26')`.
