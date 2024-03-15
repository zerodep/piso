const FRACTIONS = ',.';
const ISO_ZULU = 'Z';
const ISODATE_SEPARATOR = '-';
const ISODATE_TIMEINSTRUCTION = 'T';
const ISODURATION_DATE_DESIGNATORS = 'YMWD';
const ISODURATION_TIME_DESIGNATORS = 'HMS';
const ISOINTERVAL_DURATION = 'P';
const ISOINTERVAL_REPEAT = 'R';
const ISOINTERVAL_SEPARATOR = '/';
const ISOTIME_OFFSET = '+-' + ISO_ZULU;
const ISOTIME_SEPARATOR = ':';
const ISOTIME_STARTHOUR = '012';
const ISOTIME_STARTPART = '012345';
const NUMBERS = '0123456789';
const MILLISECONDS_PER_DAY = 86400000;
const MILLISECONDS_PER_HOUR = 3600000;

const kIsParsed = Symbol.for('is parsed');
const kDates = Symbol.for('interval dates');

/** @module piso */

/**
 * ISO 8601 interval parser
 * @param {string} source interval source string
 */
export function ISOInterval(source) {
  if (!source || typeof source !== 'string') throw new TypeError('ISO 8601 interval source is required and must be a string');
  this.source = source;
  this.c = '';
  this.parsed = '';
  this.idx = -1;
  this.repeat = -1;
  /** @type {ISODate | undefined} */
  this.start = undefined;
  /** @type {ISODuration | undefined} */
  this.duration = undefined;
  /** @type {ISODate | undefined} */
  this.end = undefined;
  /** @type {import('types').ISOIntervalType} */
  this.type = 0;
  this[kIsParsed] = false;
  this[kDates] = undefined;
}

/** @name module:piso.ISOInterval#startDate */
Object.defineProperty(ISOInterval.prototype, 'startDate', {
  /** @returns {Date | null} */
  get() {
    return this.start === undefined ? null : this.start.toUTCDate();
  },
});

/** @name module:piso.ISOInterval#startDate */
Object.defineProperty(ISOInterval.prototype, 'endDate', {
  /** @returns {Date | null} */
  get() {
    return this.end === undefined ? null : this.end.toUTCDate();
  },
});

/**
 * Opinionated function that attempts to figure out the closest date in the interval
 * @param {Date} [fromDate] optional compare date, kind of required if repeat is present, defaults to now
 * @returns {Date | null}
 */
ISOInterval.prototype.next = function next(fromDate) {
  fromDate = new Date(fromDate === undefined ? Date.now() : fromDate.getTime());

  const dates = this.getDates(fromDate);

  for (const date of dates) {
    if (date < fromDate) continue;
    return date;
  }
  return dates[dates.length - 1];
};

/**
 * ISO 8601 interval parser
 * @returns {ISOInterval}
 */
ISOInterval.prototype.parse = function parseInterval() {
  if (this[kIsParsed]) return this;
  this[kIsParsed] = true;

  let c = this.peek();
  if (c === ISOINTERVAL_REPEAT) {
    this.read();
    this.consumeRepeat();

    this.type += 1;

    c = this.peek();
  }

  let enforceSeparators = false;
  if (NUMBERS.indexOf(c) > -1) {
    const dateParser = new ISODate(this.source, this.idx, ISOINTERVAL_SEPARATOR);
    this.start = dateParser.parse();
    this.idx = dateParser.idx;
    enforceSeparators = dateParser.enforceSeparators;

    this.type += 2;
  } else if (c !== ISOINTERVAL_DURATION) {
    throw new RangeError(`Invalid ISO 8601 interval "${this.source}"`);
  }

  c = this.peek();

  if (c === ISOINTERVAL_DURATION) {
    this.idx++;
    const durationParser = new ISODuration(this.source, this.idx);
    this.duration = durationParser.parse();
    this.idx = durationParser.idx;

    this.type += 4;
  }

  c = this.current();

  if (c === '/' && this.duration && !this.start) {
    const dateParser = new ISODate(this.source, this.idx);
    this.end = dateParser.parse();
    this.idx = dateParser.idx;

    this.type += 8;
  } else if (c === '/' && this.start && !this.duration) {
    const dateParser = new ISODate(this.source, this.idx, undefined, enforceSeparators);
    // @ts-ignore
    this.end = dateParser.parsePartialDate(this.start.result.Y, this.start.result.M, this.start.result.D);
    this.idx = dateParser.idx;

    if (this.start.toUTCDate() > this.end.toUTCDate()) {
      throw new RangeError('ISO 8601 interval end date occur before start date');
    }

    this.type += 8;
  } else if (c) {
    throw new RangeError(`ISO 8601 interval "${this.source}" combination is not allowed`);
  }

  return this;
};

/**
 * Get interval dates
 * @param {*} [fromDate] optional from date, default to now, used if start- or end date is missing
 * @returns {Date[]} list of treshold dates
 */
ISOInterval.prototype.getDates = function getDates(fromDate) {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  const duration = (type | 4) === type && this.duration;
  let repetitions = (type | 1) === type ? this.repeat : 1;
  const hasStartDate = (type | 2) === type;
  const hasEndDate = (type | 8) === type;

  if (this[kDates]) return this[kDates].slice();

  /** @type {Date[]} */
  const dates = (this[kDates] = []);
  if (hasStartDate && hasEndDate) {
    const startDate = this.start.toUTCDate();
    dates.push(startDate);
    const endDate = this.end.toUTCDate();
    if (endDate.getTime() !== startDate.getTime()) {
      dates.push(endDate);
    }
  } else if (hasStartDate) {
    const startDate = this.start.toUTCDate();
    dates.push(startDate);
    if (duration) dates.push(applyDurationUTC(startDate, duration));
  } else if (hasEndDate) {
    const endDate = this.end.toUTCDate();
    dates.push(endDate);
    if (duration) dates.unshift(applyDurationUTC(endDate, duration, true));
  } else {
    const startDate = new Date(fromDate === undefined ? Date.now() : fromDate.getTime());
    dates.push(applyDurationUTC(startDate, duration));
    if (repetitions) repetitions += 1;
  }

  if (repetitions > 2 && duration) {
    let repeat = repetitions - 2;
    while (repeat) {
      repeat--;
      if (hasEndDate) dates.unshift(applyDurationUTC(dates[0], duration, true));
      if (hasStartDate) dates.push(applyDurationUTC(dates[dates.length - 1], duration));
      else dates.push(applyDurationUTC(dates[dates.length - 1], duration));
    }
  }

  return dates.slice();
};

ISOInterval.prototype.consumeRepeat = function consumeRepeat() {
  /** @type { string | undefined } */
  let c = this.read();
  if (c === '-') {
    c = this.read();
    if (c !== '1') throw new RangeError(`Unexpected character "${this.parsed}[${c}]" at ${this.idx}`);
    return this.read();
  }

  let value = '';
  while (c && NUMBERS.indexOf(c) > -1) {
    value += c;
    c = this.read();
  }
  if (value) this.repeat = Number(value);
  if (c !== '/') throw new RangeError(`Unexpected character "${this.parsed}[${c}]" at ${this.idx}`);
};

ISOInterval.prototype.read = function read() {
  this.parsed += this.c;
  return (this.c = this.source[++this.idx]);
};

ISOInterval.prototype.current = function current() {
  return this.source[this.idx];
};

ISOInterval.prototype.peek = function peek() {
  return this.source[this.idx + 1];
};

/**
 * ISO 8601 date parser
 * @param {string} source ISO 8601 date time source
 * @param {number?} [offset=-1] Source column offset
 * @param {string?} [endChars] Optional end chars
 * @param {boolean} [enforceSeparators=false] Enforce separators between IS0 8601 parts
 */
export function ISODate(source, offset = -1, endChars = '', enforceSeparators = false) {
  this.source = source;
  /** @type {number} */
  // @ts-ignore
  this.idx = offset > -1 ? Number(offset) : -1;
  this.enforceSeparators = enforceSeparators;
  this.c = '';
  // @ts-ignore
  this.parsed = offset > 0 ? source.substring(0, offset + 1) : '';
  this.endChars = endChars;
  /** @type {Partial<import('types').ISODateParts>} */
  this.result = {};
  this[kIsParsed] = false;
}

ISODate.prototype.toUTCDate = function toUTCDate() {
  if (!this[kIsParsed]) this.parse();

  /** @type {any} */
  const result = this.result;
  const args = [result.Y, result.M, result.D];

  if ('H' in result) args.push(result.H, 0);
  if ('m' in result) args[4] = result.m;
  if ('S' in result) args.push(result.S);
  if ('F' in result) args.push(Math.round(result.F));

  if (result.Z) {
    /** @ts-ignore */
    return new Date(Date.UTC(...args));
  }

  /** @ts-ignore */
  const dt = new Date(...args);
  return dt;
};

/**
 * Parse passed source as ISO 8601 date time
 * @returns {ISODate}
 */
ISODate.prototype.parse = function parseISODate() {
  if (this[kIsParsed]) return this;
  this[kIsParsed] = true;

  let value = this.consumeChar();
  for (let idx = 0; idx < 3; idx++) {
    value += this.consumeChar();
  }

  const Y = (this.result.Y = Number(value));

  /** @type {string | undefined} */
  let c = this.consumeChar(ISODATE_SEPARATOR + '01');
  let dateSeparator = '';
  if (c === ISODATE_SEPARATOR || this.enforceSeparators) {
    this.enforceSeparators = true;
    dateSeparator = c;
    c = this.consumeChar('01');
  }

  const M = (this.result.M = Number(c + this.consumeChar()) - 1);

  if (dateSeparator && !this.consumeCharOrEnd(dateSeparator)) {
    if (!validateDate(Y, M, 1)) throw new RangeError(`Invalid ISO 8601 date "${this.parsed}"`);
    this.result.D = 1;
    return this;
  }

  c = this.consumeChar();

  const D = (this.result.D = Number(c + this.consumeChar()));

  if (!validateDate(Y, M, D)) throw new RangeError(`Invalid ISO 8601 date "${this.parsed}"`);

  c = this.consumeCharOrEnd(ISODATE_TIMEINSTRUCTION);
  if (!c) return this;

  const hours = (this.result.H = Number(this.consumeChar(ISOTIME_STARTHOUR) + this.consumeChar()));

  return this.continueTimePrecision(hours, !!dateSeparator);
};

/**
 * Parse ISO 8601 date string
 * @param {string} source ISO 8601 duration
 * @param {number?} [offset] source column offset
 */
ISODate.parse = function parseISODate(source, offset) {
  return new this(source, offset).parse().result;
};

/**
 * Parse partial relative date
 * @param {number} Y Year if year is not defined
 * @param {number} M JavaScript month if month is not defined
 * @param {number} [D] JavaScript date if date is not defined
 * @returns {ISODate}
 */
ISODate.prototype.parsePartialDate = function parsePartialDate(Y, M, D) {
  if (this[kIsParsed]) return this;
  this[kIsParsed] = true;

  this.result.Y = Y;
  this.result.M = M;
  this.result.D = D;

  let value = this.consumeChar() + this.consumeChar();

  const next = this.peek();
  /** @type {string | undefined} */
  let c;
  if (!next) {
    const day = (this.result.D = Number(value));

    if (!validateDate(Y, M, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}[${this.c}]"`);

    return this;
  } else if (next === ISODATE_TIMEINSTRUCTION) {
    const day = (this.result.D = Number(value));

    if (!validateDate(Y, M, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}[${this.c}]"`);

    this.consume();

    const hours = (this.result.H = Number(this.consumeChar(ISOTIME_STARTHOUR) + this.consumeChar()));
    return this.continueTimePrecision(hours, this.enforceSeparators);
  } else if (next === ISOTIME_SEPARATOR) {
    const hours = (this.result.H = Number(value));
    return this.continueTimePrecision(hours, this.enforceSeparators);
  } else if (NUMBERS.indexOf(next) > -1) {
    const Y = (this.result.Y = Number(value + this.consumeChar() + this.consumeChar()));
    return this.continueDatePrecision(Y);
  } else if (next === ISODATE_SEPARATOR) {
    this.consume();
    const month = (this.result.M = Number(value) - 1);
    const day = (this.result.D = Number(this.consumeChar('0123') + this.consumeChar()));

    if (!validateDate(Y, month, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}[${this.c}]"`);

    c = this.consumeCharOrEnd(ISODATE_TIMEINSTRUCTION);
    if (c) {
      const hours = (this.result.H = Number(this.consumeChar('012') + this.consumeChar()));
      return this.continueTimePrecision(hours, this.enforceSeparators);
    }

    return this;
  }

  throw this.createUnexpectedError();
};

/**
 * Consume as ISO date
 * @param {number} Y year
 * @returns {ISODate}
 */
ISODate.prototype.continueDatePrecision = function continueDatePrecision(Y) {
  let dateSeparator = this.enforceSeparators ? ISODATE_SEPARATOR : '';

  /** @type {string | undefined} */
  let c = this.consumeChar(dateSeparator + '01');
  if (c === ISODATE_SEPARATOR) {
    dateSeparator = c;
    c = this.consumeChar('01');
  } else if (dateSeparator) {
    throw this.createUnexpectedError();
  }

  const M = (this.result.M = Number(c + this.consumeChar()) - 1);

  if (dateSeparator) {
    c = this.consumeCharOrEnd(dateSeparator);
    if (!c) {
      if (!validateDate(Y, M, 1)) throw new RangeError(`Invalid ISO 8601 date "${this.parsed}"`);
      this.result.D = 1;
      return this;
    }
  }

  c = this.consumeChar();

  const D = (this.result.D = Number(c + this.consumeChar()));

  if (!validateDate(Y, M, D)) throw new RangeError(`Invalid ISO 8601 date "${this.parsed}"`);

  c = this.consume();
  if (!c) return this;

  if (c !== ISODATE_TIMEINSTRUCTION) throw this.createUnexpectedError();

  const hours = (this.result.H = Number(this.consumeChar(ISOTIME_STARTHOUR) + this.consumeChar()));

  return this.continueTimePrecision(hours, !!dateSeparator);
};

/**
 * Consume minutes and seconds and so forth
 * @param {number} H from hour
 * @param {boolean} useSeparator time separator
 * @returns {ISODate}
 */
ISODate.prototype.continueTimePrecision = function continueTimePrecision(H, useSeparator) {
  if (H > 24) throw new RangeError(`Invalid ISO 8601 hours "${this.parsed}[${this.c}]"`);

  const timeSeparator = useSeparator ? ISOTIME_SEPARATOR : '';

  /** @type {string | undefined} */
  let c = this.consumeChar(timeSeparator + ISOTIME_STARTPART);
  if (c === timeSeparator) {
    c = this.consumeChar(ISOTIME_STARTPART);
  } else if (useSeparator) {
    throw this.createUnexpectedError();
  }

  this.result.m = Number(c + this.consumeChar());

  c = this.consumeCharOrEnd(timeSeparator + ISOTIME_OFFSET + ISOTIME_STARTPART);

  if (!c) {
    return this;
  } else if (c === ISOTIME_SEPARATOR) {
    c = this.consumeChar(ISOTIME_STARTPART);
  } else if (ISOTIME_OFFSET.indexOf(c) > -1) {
    return this.continueTimeZonePrecision(c);
  } else if (useSeparator) {
    throw this.createUnexpectedError();
  }

  let value = c + this.consumeChar();
  this.result.S = Number(value);

  c = this.consumeCharOrEnd(FRACTIONS + ISOTIME_OFFSET);
  if (!c) {
    return this;
  }

  if (FRACTIONS.indexOf(c) > -1) {
    value = this.consumeChar();
    while ((c = this.consumeCharOrEnd(NUMBERS + ISOTIME_OFFSET))) {
      if (!c || NUMBERS.indexOf(c) === -1) break;
      if (value.length === 3) value += '.';
      value += c;
    }
    if (value.length < 3) value = (value + '000').slice(0, 3);
    this.result.F = Number(value);
  }

  if (!c) {
    return this;
  }

  return this.continueTimeZonePrecision(c);
};

/**
 * Continue timezone offset parsing
 * @param {string} instruction timezone offset instruction
 * @returns {ISODate}
 */
ISODate.prototype.continueTimeZonePrecision = function continueTimeZonePrecision(instruction) {
  const z = (this.result.Z = instruction);

  let c = this.consumeCharOrEnd(ISOTIME_STARTHOUR);
  if (c && z === ISO_ZULU) throw this.createUnexpectedError();
  else if (!c) return this;

  this.result.OH = Number(c + this.consumeChar(c === '2' ? '0123' : NUMBERS));

  c = this.consumeCharOrEnd(ISOTIME_SEPARATOR + ISOTIME_STARTPART);
  if (!c) return this;

  if (c === ISOTIME_SEPARATOR) {
    c = this.consumeChar(ISOTIME_STARTPART);
  }

  this.result.Om = Number(c + this.consumeChar());

  c = this.consumeCharOrEnd(ISOTIME_SEPARATOR + ISOTIME_STARTPART);
  if (!c) return this;

  if (c === ISOTIME_SEPARATOR) {
    c = this.consumeChar(ISOTIME_STARTPART);
  }

  this.result.OS = Number(c + this.consumeChar());

  return this.end();
};

ISODate.prototype.consume = function consume() {
  this.parsed += this.c;
  const c = (this.c = this.source[++this.idx]);
  return c;
};

ISODate.prototype.consumeChar = function consumeChar(valid = NUMBERS) {
  const c = this.consume();
  if (valid.indexOf(c) === -1) throw this.createUnexpectedError();
  return c;
};

ISODate.prototype.peek = function peek() {
  return this.source[this.idx + 1];
};

ISODate.prototype.end = function end() {
  this.consumeCharOrEnd('');
  return this;
};

/**
 * Consume char or end
 * @param {string} [valid] Valid chars, defaults to 0-9
 * @returns {string | undefined}
 */
ISODate.prototype.consumeCharOrEnd = function consumeCharOrEnd(valid = NUMBERS) {
  const c = this.consume();
  if (c && this.endChars && this.endChars.indexOf(c) > -1) {
    return undefined;
  } else if (c && valid.indexOf(c) === -1) {
    throw this.createUnexpectedError();
  }
  return c;
};

ISODate.prototype.createUnexpectedError = function raiseUnexpectedError() {
  const c = this.c;
  return new RangeError(`Unexpected ISO 8601 date character "${this.parsed}[${c ? c : 'EOL'}]" at ${this.idx}`);
};

/**
 *
 * @param {string} source
 * @param {number} [offset=0]
 */
export function ISODuration(source, offset = 0) {
  this.source = source;
  this.idx = offset;
  this.type = '';
  this.parsed = '';
  /** @type {keyof import('types').ISOParts | undefined} */
  this.designator = undefined;
  this.value = '';
  this.usedFractions = false;
  this.fractionedDesignator = undefined;
  this.designators = ISODURATION_DATE_DESIGNATORS;
  this.usedDesignators = '';
  /** @type {Partial<import('types').ISOParts>} */
  this.result = {};
}

/**
 * Parse ISO 8601 duration string
 * @param {string} source ISO 8601 duration
 * @param {number} [offset=0] Column offset
 */
ISODuration.parse = function parseDuration(source, offset = 0) {
  const writer = new this(source, offset);
  writer.parse();
  return writer.result;
};

ISODuration.prototype.parse = function parseDuration() {
  if (this.source[this.idx] !== ISOINTERVAL_DURATION) throw new RangeError(`Unexpected ISO 8601 start character "${this.source[0]}"`);
  for (const c of this.source.slice(this.idx)) {
    if (c === '/') break;
    this.write(c, this.idx++);
  }
  this.end(this.idx);
  return this;
};

/**
 * Write
 * @param {string | undefined} c ISO 8601 character
 * @param {number} column Current column
 */
ISODuration.prototype.write = function writeDuration(c, column) {
  if (!c) {
    return this.end(column);
  }

  let desitnatorIdx;
  if (NUMBERS.indexOf(c) > -1) {
    this.value += c;
  } else if ((desitnatorIdx = this.designators.indexOf(c)) > -1) {
    this.designators = this.designators.slice(desitnatorIdx + 1);
    // @ts-ignore
    this.designator = c;
    this.setDesignatorValue(c, this.value);
  } else if (FRACTIONS.indexOf(c) > -1) {
    if (this.usedFractions)
      throw new RangeError(
        'ISO 8601 duration fractions are allowed on the smallest unit in the string, e.g. P0.5D or PT1.0001S but not P0.5DT1.0001S',
      );
    this.usedFractions = true;
    this.value += '.';
  } else if (c === ISOINTERVAL_DURATION && !this.type) {
    this.type = c;
  } else if (c === ISODATE_TIMEINSTRUCTION && this.type === ISOINTERVAL_DURATION) {
    this.designators = ISODURATION_TIME_DESIGNATORS;
    this.type = c;
  } else {
    throw new RangeError(`Unexpected ISO 8601 duration character "${this.parsed}[${c}]" at ${column}`);
  }

  this.parsed += c;
};

/**
 * @internal
 * Set duration designator and value
 * @param {string} designator
 * @param {string} value
 */
ISODuration.prototype.setDesignatorValue = function setDesignatorValue(designator, value) {
  this.designator = undefined;
  this.value = '';

  const designatorKey = designator === 'M' && this.type === ISODATE_TIMEINSTRUCTION ? 'm' : designator;
  // @ts-ignore
  this.result[designatorKey] = Number(value);
  this.usedDesignators += designatorKey;

  if (this.usedFractions) {
    this.fractionedDesignator = designatorKey;
  }
};

/**
 * Parse completed, no more chars
 * @param {number} column Current column
 */
ISODuration.prototype.end = function end(column) {
  if (this.value || this.parsed === ISOINTERVAL_DURATION || this.parsed === ISOINTERVAL_DURATION + ISODATE_TIMEINSTRUCTION) {
    throw new RangeError(`Unexpected ISO 8601 EOL at ${column}`);
  }
};

/**
 * Get duration in milliseconds from optional start date
 * @param {Date} [startDate] start date, defaults to epoch start 1970-01-01T00:00:00Z
 * @returns {number} duration in milliseconds from start date
 */
ISODuration.prototype.toMilliseconds = function toMilliseconds(startDate) {
  const epochStart = startDate || new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
  /** @type {any} */
  return Math.round(applyDurationUTC(epochStart, this).getTime() - epochStart.getTime());
};

/**
 * Get duration in milliseconds from optional end date
 * @param {Date} [endDate] end date, defaults to epoch start 1970-01-01T00:00:00Z
 * @returns {number} duration in milliseconds from end date
 */
ISODuration.prototype.untilMilliseconds = function untilMilliseconds(endDate) {
  const epochStart = endDate || new Date(Date.UTC(1970, 0, 1, 0, 0, 0));
  /** @type {any} */
  return Math.round(applyDurationUTC(epochStart, this, true).getTime() - epochStart.getTime());
};

/**
 * Parse ISO 8601 interval
 * @param {string} isoInterval ISO 8601 interval
 * @returns {ISOInterval}
 */
export function parseInterval(isoInterval) {
  const intervalParser = new ISOInterval(isoInterval);
  return intervalParser.parse();
}

/**
 * Parse ISO 8601 duration
 * @param {string} isoDuration ISO 8601 interval and/or duration
 * @returns {Partial<import('types').ISOParts> | undefined}
 */
export function parseDuration(isoDuration) {
  const intervalParser = new ISOInterval(isoDuration);
  return intervalParser.parse().duration?.result;
}

/**
 * Parse ISO 8601 interval
 * @param {string} isoInterval
 * @param {Date} [fromDate] optional from date, defaults to now
 * @returns {Date | null} next date point
 */
export function next(isoInterval, fromDate) {
  const intervalParser = new ISOInterval(isoInterval);
  return intervalParser.parse().next(fromDate);
}

/**
 * Validate date parts
 * @param {number} Y year
 * @param {number} M javascript month
 * @param {number} D day of month
 * @returns {boolean}
 */
function validateDate(Y, M, D) {
  if (!D) return false;
  if (M < 0) return false;

  if (M === 1 && D - (Y % 4 ? 0 : 1) > 28) {
    return false;
  } else if (M < 13 && D - (M % 2) > 30) {
    return false;
  } else if (M > 11) {
    return false;
  }

  return true;
}

/**
 * Apply duration on UTC date
 * @param {Date} fromDate from date
 * @param {ISODuration} [duration] duration
 * @param {boolean} [upUntil] up until from date
 * @returns {Date} new date with applied duration
 */
function applyDurationUTC(fromDate, duration, upUntil) {
  const startTime = fromDate.getTime();
  let endTime = startTime;
  const factor = upUntil ? -1 : 1;

  /** @type {any} */
  const { result, fractionedDesignator, usedDesignators } = duration;

  for (const designator of usedDesignators) {
    const value = factor * result[designator];
    switch (designator) {
      case 'Y': {
        const fromYear = new Date(endTime);
        const toYear = new Date(endTime);
        if (fractionedDesignator !== designator) {
          toYear.setUTCFullYear(toYear.getUTCFullYear() + value);
          endTime += toYear.getTime() - fromYear.getTime();
        } else {
          const fullValue = ~~value;
          if (fullValue) {
            toYear.setUTCFullYear(toYear.getUTCFullYear() + fullValue);
            endTime += toYear.getTime() - fromYear.getTime();
          }

          const fraction = new Date(endTime);

          fraction.setUTCFullYear(fraction.getUTCFullYear() + factor);

          endTime += factor * (fraction.getTime() - toYear.getTime()) * (value - fullValue);
        }

        break;
      }
      case 'M': {
        const fromMonth = new Date(endTime);
        const toMonth = new Date(endTime);
        if (fractionedDesignator !== designator) {
          toMonth.setUTCMonth(toMonth.getUTCMonth() + value);
          endTime += toMonth.getTime() - fromMonth.getTime();
        } else {
          const fullValue = ~~value;
          if (fullValue) {
            toMonth.setUTCMonth(toMonth.getUTCMonth() + fullValue);
            endTime += toMonth.getTime() - fromMonth.getTime();
          }

          const fraction = new Date(endTime);

          fraction.setUTCMonth(fraction.getUTCMonth() + factor);

          endTime += factor * (fraction.getTime() - toMonth.getTime()) * (value - fullValue);
        }
        break;
      }
      case 'W':
        endTime += value * 7 * MILLISECONDS_PER_DAY;
        break;
      case 'D':
        endTime += value * MILLISECONDS_PER_DAY;
        break;
      case 'H':
        endTime += value * MILLISECONDS_PER_HOUR;
        break;
      case 'm':
        endTime += value * 60000;
        break;
      case 'S':
        endTime += value * 1000;
        break;
    }
  }

  return new Date(endTime);
}
