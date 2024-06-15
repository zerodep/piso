# Changelog

All notable changes to this project will be documented in this file.

# [Unreleased]

# [1.0.0] - 2024-06-15

Production ready.

- fix partial end date not sharing timezone offset with start date
- stop shipping types/interfaces.d.ts since all is included in types/index.d.ts
- run through markdown examples with [texample](https://www.npmjs.com/package/texample)

# [0.1.4] - 2024-05-03

- Informative RangeError messages, especially interval messages that only informed about an unexpected character, period (.).

# [0.1.3] - 2024-04-22

- `getDate(arg)` now checks if the argument is a date or a number, if so it will put it into a `new Date(arg)`

# [0.1.2] - 2024-04-21

- remove magic next function and refactor

# [0.1.0] - 2024-03-27

- ~~add `getEndDate(interval)` function to get end date of an interval~~

# [0.0.1] - 2024-03-26

- first release after struggling with parse
