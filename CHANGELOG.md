# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.4.0] - 2024-12-10

- support ordinal date, e.g. `2024-343`

## [2.3.1] - 2024-11-08

- a duration so far in the future or past that a date cannot be rendered throws RangeError when attempting to get expire or start date
- duration of more than 255 chars throws error, cannot/should not read a string indefinitely

## [2.3.0] - 2024-11-08

- add toISOString, toJSON, and toString functions to ISOInterval, ISODate, and ISODuration
- disallow more than 17 fractions of a second in ISODate
- support unicode minus (−, u2212) as offset specification, hyphen is the exception if you read the spec

## [2.2.0] - 2024-10-17

- expose function to get week number from date

## [2.1.0] - 2024-10-09

- support week in date and interval, e.g. `2024-W41-3T06:40+02/W42-7`
- fix jump century leap year except every 400 years
- expose function to get last week of year
- expose function to get date for Monday week one
- expose function to generate ISO week date string from date

## [2.0.2] - 2024-09-08

- repeat interval without `[n]` means an unbounded number of repetitions, e.g. `R/PT1S`

## [2.0.1] - 2024-08-30

- fix embarrassing bug where `2024-08-31` is deemed invalid, dates are hard but this bug was just stupid

## [2.0.0] - 2024-07-08

- forgot to apply time zone offset before returning date, actually more of a misconception regarding the purpose of the offset declaration

## [1.0.0] - 2024-06-15

Production ready.

- fix partial end date not sharing timezone offset with start date
- stop shipping types/interfaces.d.ts since all is included in types/index.d.ts
- run through markdown examples with [texample](https://www.npmjs.com/package/texample)

## [0.1.4] - 2024-05-03

- Informative RangeError messages, especially interval messages that only informed about an unexpected character, period (.).

## [0.1.3] - 2024-04-22

- `getDate(arg)` now checks if the argument is a date or a number, if so it will put it into a `new Date(arg)`

## [0.1.2] - 2024-04-21

- remove magic next function and refactor

## [0.1.0] - 2024-03-27

- ~~add `getEndDate(interval)` function to get end date of an interval~~

## [0.0.1] - 2024-03-26

- first release after struggling with parse
