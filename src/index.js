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
const MILLISECONDS_PER_HOUR = 3600000;

const NONLEAPYEAR = new Date(Date.UTC(1971, 0, 1));

const kIsParsed = Symbol.for('is parsed');
const kDates = Symbol.for('interval dates');

const dateUTCFns = {
  Y: [Date.prototype.getUTCFullYear, Date.prototype.setUTCFullYear],
  M: [Date.prototype.getUTCMonth, Date.prototype.setUTCMonth],
  D: [Date.prototype.getUTCDate, Date.prototype.setUTCDate],
};

const dateLocalFns = {
  Y: [Date.prototype.getFullYear, Date.prototype.setFullYear],
  M: [Date.prototype.getMonth, Date.prototype.setMonth],
  D: [Date.prototype.getDate, Date.prototype.setDate],
};

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
  this.repeat = undefined;
  /** @type {ISODate | undefined} */
  this.start = undefined;
  /** @type {ISODuration | undefined} */
  this.duration = undefined;
  /** @type {ISODate | undefined} */
  this.end = undefined;
  /** @type {import('types').ISOIntervalType} */
  this.type = 0;
  // @internal
  this[kIsParsed] = false;
  this[kDates] = undefined;
}

/** @name module:piso.ISOInterval#startDate */
Object.defineProperty(ISOInterval.prototype, 'startDate', {
  /** @returns {Date | null} */
  get() {
    return this.start === undefined ? null : this.start.toDate();
  },
});

/** @name module:piso.ISOInterval#startDate */
Object.defineProperty(ISOInterval.prototype, 'endDate', {
  /** @returns {Date | null} */
  get() {
    return this.end === undefined ? null : this.end.toDate();
  },
});

/**
 * Opinionated function that attempts to figure out the closest date in the interval
 * @param {Date} [compareDate] optional compare date, kind of required if repeat is present, defaults to now
 * @returns {Date | null}
 */
ISOInterval.prototype.next = function next(compareDate) {
  compareDate = new Date(compareDate === undefined ? Date.now() : compareDate.getTime());

  const dates = this.getDates(compareDate);

  for (const date of dates) {
    if (date < compareDate) continue;
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

    c = this.peek();
  }

  let start;
  if (NUMBERS.indexOf(c) > -1) {
    start = this.consumeStartDate();
  } else if (c !== ISOINTERVAL_DURATION) {
    throw new RangeError(`Invalid ISO 8601 interval "${this.source}"`);
  }

  c = this.peek();

  if (c === ISOINTERVAL_DURATION) {
    this.read();
    this.consumeDuration();

    if (this.repeat && this.repeat !== 1) {
      this.type = this.type | 1;
    }
  }

  c = this.current();

  if (c === '/' && this.duration && !start) {
    this.end = this.consumeDate();
    this.parsed = this.end.parsed;
    this.type += 8;
  } else if (c === '/' && start && !this.duration) {
    this.consumePartialEndDate(start);
  } else if (c) {
    throw new RangeError(`ISO 8601 interval "${this.source}" combination is not allowed`);
  }

  return this;
};

/**
 * Get interval dates
 * @param {Date} [compareDate] optional compare date, default to now, used if start- or end date is missing
 * @returns {Date[]} list of cutoff dates
 */
ISOInterval.prototype.getDates = function getDates(compareDate) {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  const duration = (type & 4) === 4 && this.duration;
  let repetitions = (type & 1) === 1 ? this.repeat : 1;
  const hasStartDate = (type & 2) === 2;
  const hasEndDate = (type & 8) === 8;

  if (this[kDates]) return this[kDates].slice();

  /** @type {Date[]} */
  const dates = (this[kDates] = []);
  if (hasStartDate && hasEndDate) {
    const startDate = this.start.toDate();
    dates.push(startDate);
    const endDate = this.end.toDate();
    if (endDate.getTime() !== startDate.getTime()) {
      dates.push(endDate);
    }
  } else if (hasStartDate) {
    const startDate = this.start.toDate();
    dates.push(startDate);
    if (duration) dates.push(new Date(startDate.getTime() + duration.toMilliseconds(startDate)));
  } else if (hasEndDate) {
    const endDate = this.end.toDate();
    dates.push(endDate);
    if (duration) dates.unshift(new Date(endDate.getTime() + duration.untilMilliseconds(endDate)));
  } else {
    const startDate = new Date(compareDate === undefined ? Date.now() : compareDate.getTime());
    dates.push(new Date(startDate.getTime() + duration.toMilliseconds(startDate)));
    if (repetitions) repetitions += 1;
  }

  if (repetitions > 2 && duration) {
    let repeat = repetitions - 2;
    while (repeat) {
      repeat--;
      if (hasEndDate) {
        const fromDate = dates[0];
        dates.unshift(new Date(fromDate.getTime() + duration.untilMilliseconds(fromDate)));
      } else {
        const fromDate = dates[dates.length - 1];
        dates.push(new Date(fromDate.getTime() + duration.toMilliseconds(fromDate)));
      }
    }
  }

  return dates.slice();
};

/**
 * Get expire at
 * @param {Date} [startDate] optional start date, duration without start or end will need this, defaults to now
 */
ISOInterval.prototype.getExpireAt = function getExpireAt(startDate) {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  let repetitions = (type & 1) === 1 ? this.repeat : 1;
  const duration = (type & 4) === 4 && this.duration;
  const hasEndDate = (type & 8) === 8;

  if (repetitions < 2 && hasEndDate) return this.end.toDate();

  const hasStartDate = (type & 2) === 2;
  startDate = startDate === undefined ? new Date() : startDate;

  if (hasStartDate && duration) {
    const dateFns = new ISODateDurationFunctions(this.start.toDate(), duration, this.start.result.Z);
    return dateFns.getExpireAt(repetitions);
  } else if (hasEndDate && duration) {
    const dateFns = new ISODateDurationFunctions(this.end.toDate(), duration, this.end.result.Z);
    return dateFns.untilEndDate(repetitions);
  }

  const dateFns = new ISODateDurationFunctions(startDate, duration, 'Z');
  if (!repetitions || repetitions === 1) return dateFns.applyDuration(startDate);

  const nowReps = dateFns.getRepetitions();

  if (nowReps <= 0) return dateFns.applyDuration(startDate, 1);
  if (nowReps < repetitions) return dateFns.applyDuration(startDate, nowReps + 1);
  if (nowReps >= repetitions) return dateFns.applyDuration(startDate, repetitions);
};

/**
 * Get start at date
 * @param {Date} [compareDate] optional compare date, duration without start or end will need this, defaults to now
 */
ISOInterval.prototype.getStartAt = function getStartAt(compareDate) {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  let repetitions = (type & 1) === 1 ? this.repeat : false;
  const duration = (type & 4) === 4 && this.duration;
  const hasStartDate = (type & 2) === 2;

  if (!repetitions && hasStartDate) return this.start.toDate();

  const hasEndDate = (type & 8) === 8;
  compareDate = compareDate === undefined ? new Date() : compareDate;

  if (hasEndDate && duration && !repetitions) {
    const durationFns = new ISODateDurationFunctions(this.end.toDate(), duration, this.end.result.Z);
    return durationFns.applyDuration(undefined, -1);
  } else if (!hasEndDate && duration && repetitions) {
    const dateFns = new ISODateDurationFunctions(this.start.toDate(), duration, this.start.result.Z);
    return dateFns.getExpireAt(repetitions - 1);
  } else if (hasEndDate && duration && repetitions) {
    const dateFns = new ISODateDurationFunctions(this.end.toDate(), duration, this.end.result.Z);
    return dateFns.untilEndDate(repetitions);
  }

  return duration.getExpireAt(compareDate);
};

ISOInterval.prototype.consumeRepeat = function consumeRepeat() {
  /** @type { string | undefined } */
  let c = this.read();
  if (c === '-') {
    c = this.read();
    if (c !== '1') throw new RangeError(`Unexpected character "${this.parsed}[${c}]" at ${this.idx}`);
    this.repeat = -1;
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

ISOInterval.prototype.consumeStartDate = function consumeStartDate() {
  const start = (this.start = this.consumeDate(undefined, ISOINTERVAL_SEPARATOR));
  this.parsed = start.parsed;
  this.type += 2;
  return start;
};

ISOInterval.prototype.consumeDuration = function consumeDuration() {
  const duration = (this.duration = new ISODuration(this.source, this.idx).parse());
  this.idx = duration.idx;
  this.c = duration.c;
  this.parsed += duration.parsed;
  this.type += 4;
  return duration;
};

/**
 *
 * @param {ISODate} start
 * @returns
 */
ISOInterval.prototype.consumePartialEndDate = function consumePartialEndDate(start) {
  const isoDate = new ISODate(this.source, this.idx, undefined, start.enforceSeparators);
  this.end = isoDate.parsePartialDate(start.result.Y, start.result.M, start.result.D);
  this.idx = isoDate.idx;
  this.c = isoDate.c;

  this.parsed = isoDate.parsed;

  if (start.toDate() > isoDate.toDate()) {
    throw new RangeError('ISO 8601 interval end date occur before start date');
  }

  this.type += 8;

  return isoDate;
};

/**
 * Consume date
 * @param {boolean} [enforceSeparators]
 * @param {string} [endChars]
 * @returns
 */
ISOInterval.prototype.consumeDate = function consumeDate(enforceSeparators, endChars) {
  const isoDate = new ISODate(this.source, this.idx, endChars, enforceSeparators).parse();
  this.idx = isoDate.idx;
  this.c = isoDate.c;
  this.parsed += isoDate.parsed;
  return isoDate;
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
 * @param {number?} [offset] Source column offset
 * @param {string?} [endChars] Optional end chars
 * @param {boolean} [enforceSeparators] Enforce separators between IS0 8601 parts
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

ISODate.prototype.toDate = function toDate() {
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

  if (!next) {
    this.consume();
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

    const c = this.consumeCharOrEnd(ISODATE_TIMEINSTRUCTION);
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

  const midnight = H === 24;
  const firstChars = midnight ? '0' : ISOTIME_STARTPART;
  const numberChars = midnight ? '0' : NUMBERS;
  const timeSeparator = useSeparator ? ISOTIME_SEPARATOR : '';

  /** @type {string | undefined} */
  let c = this.consumeChar(timeSeparator + firstChars);
  if (c === timeSeparator) {
    c = this.consumeChar(firstChars);
  } else if (useSeparator) {
    throw this.createUnexpectedError();
  }

  this.result.m = Number(c + this.consumeChar(numberChars));

  c = this.consumeCharOrEnd(timeSeparator + ISOTIME_OFFSET + numberChars);

  if (!c) {
    return this;
  } else if (c === ISOTIME_SEPARATOR) {
    c = this.consumeChar(ISOTIME_STARTPART);
  } else if (ISOTIME_OFFSET.indexOf(c) > -1) {
    return this.continueTimeZonePrecision(c);
  } else if (useSeparator) {
    throw this.createUnexpectedError();
  }

  let value = c + this.consumeChar(numberChars);
  this.result.S = Number(value);

  c = this.consumeCharOrEnd(FRACTIONS + ISOTIME_OFFSET);
  if (!c) {
    return this;
  }

  if (FRACTIONS.indexOf(c) > -1) {
    value = this.consumeChar(numberChars);
    while ((c = this.consumeCharOrEnd(numberChars + ISOTIME_OFFSET))) {
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

ISODate.prototype.createUnexpectedError = function createUnexpectedError() {
  const c = this.c;
  return new RangeError(`Unexpected ISO 8601 date character "${this.parsed}[${c ? c : 'EOL'}]" at ${this.idx}`);
};

/**
 *
 * @param {string} source
 * @param {number} [offset]
 */
export function ISODuration(source, offset = 0) {
  this.source = source;
  this.idx = offset;
  this.c = '';
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
  this.isDateIndifferent = true;
  this.indifferentMs = undefined;
}

/**
 * Parse ISO 8601 duration string
 * @param {string} source ISO 8601 duration
 * @param {number} [offset] Column offset
 */
ISODuration.parse = function parseDuration(source, offset = 0) {
  const writer = new this(source, offset);
  writer.parse();
  return writer.result;
};

ISODuration.prototype.parse = function parseDuration() {
  if (this.source[this.idx] !== ISOINTERVAL_DURATION) throw this.createUnexpectedError(this.source[0], 0);
  for (const c of this.source.slice(this.idx)) {
    if (c === '/') break;
    this.c = c;
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

  if (this.fractionedDesignator) {
    throw new RangeError(
      'ISO 8601 duration fractions are allowed on the smallest unit in the string, e.g. P0.5D or PT1.001S but not P0.5DT1H',
    );
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
    this.usedFractions = true;
    this.value += '.';
  } else if (c === ISOINTERVAL_DURATION && !this.type) {
    this.type = c;
  } else if (c === ISODATE_TIMEINSTRUCTION && this.type === ISOINTERVAL_DURATION) {
    this.designators = ISODURATION_TIME_DESIGNATORS;
    this.type = c;
  } else {
    throw this.createUnexpectedError(c, column);
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

  if (ISODURATION_DATE_DESIGNATORS.indexOf(designatorKey) > -1) {
    this.isDateIndifferent = false;
  }

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
    throw this.createUnexpectedError('', column);
  }
};

/**
 * Get duration expire at date
 * @param {Date} [startDate] start ticking from date, defaults to now
 * @param {number} [repetition] repetition
 */
ISODuration.prototype.getExpireAt = function getExpireAt(startDate, repetition = 1) {
  const indifferentMs = this.getDateIndifferentMilliseconds(repetition);
  startDate = startDate === undefined ? new Date() : startDate;

  const ms = startDate.getTime();
  if (this.isDateIndifferent) return new Date(ms + indifferentMs);

  return applyDateDuration(new Date(ms + indifferentMs), this, repetition);
};

/**
 * Get duration start date
 * @param {Date} [endDate] as compared to date, defaults to now
 * @param {number} [repetition] number of repetitions
 */
ISODuration.prototype.getStartAt = function getStartAt(endDate, repetition = 1) {
  const indifferentMs = this.getDateIndifferentMilliseconds(repetition);
  endDate = endDate === undefined ? new Date() : endDate;

  const ms = endDate.getTime();

  if (this.isDateIndifferent) return new Date(ms - indifferentMs);

  return applyDateDuration(new Date(ms - indifferentMs), this, -repetition);
};

/**
 * Get duration in milliseconds from optional start date
 * @param {Date} [startDate] start date, defaults to 1971-01-01T00:00:00Z since it's not a leap year
 * @param {number} [repetition] repetition
 * @returns {number} duration in milliseconds from start date
 */
ISODuration.prototype.toMilliseconds = function toMilliseconds(startDate, repetition = 1) {
  startDate = startDate === undefined ? NONLEAPYEAR : startDate;

  return this.getExpireAt(startDate, repetition).getTime() - startDate.getTime();
};

/**
 * Get duration in milliseconds until optional end date
 * @param {Date} [endDate] end date, defaults to epoch start 1970-01-01T00:00:00Z
 * @param {number} [repetition] repetition
 * @returns {number} duration in milliseconds from end date
 */
ISODuration.prototype.untilMilliseconds = function untilMilliseconds(endDate, repetition = 1) {
  const indifferentMs = this.getDateIndifferentMilliseconds(repetition);

  if (this.isDateIndifferent) return -indifferentMs;

  endDate = endDate === undefined ? new Date(0) : endDate;

  const untilDate = endDate || new Date(0);
  return applyDateDuration(untilDate, this, -1 * repetition).getTime() - indifferentMs - untilDate.getTime();
};

/**
 *
 * @param {number} [repetitions]
 * @returns
 */
ISODuration.prototype.getDateIndifferentMilliseconds = function getDateIndifferentMilliseconds(repetitions) {
  return getIndifferentDurationAsMilliseconds(this, repetitions);
};

/**
 * Create unexpected error
 * @param {string | undefined} c
 * @param {number} column
 */
ISODuration.prototype.createUnexpectedError = function createUnexpectedError(c, column) {
  return new RangeError(`Unexpected ISO 8601 duration character "${this.parsed}[${c ? c : 'EOL'}]" at ${column}`);
};

/**
 *
 * @param {Date} date
 * @param {ISODuration} duration
 * @param {string} [UTC]
 */
function ISODateDurationFunctions(date, duration, UTC) {
  this.date = date;
  this.duration = duration;
  this.UTC = UTC;
}

/**
 * Add duration to date
 * @param {number} [repetitions] repetition
 */
ISODateDurationFunctions.prototype.getExpireAt = function getExpiraAt(repetitions = 1) {
  if (!repetitions || repetitions === 1) {
    return this.applyDuration(this.date);
  }

  const q = this.getRepetitions();

  if (q < 1) return this.applyDuration(this.date);
  if (q < repetitions) return this.applyDuration(this.date, q + 1);
  return this.applyDuration(this.date, repetitions);
};

/**
 * Reduce duration from date
 * @param {number} [repetitions] number of repetitions
 */
ISODateDurationFunctions.prototype.untilEndDate = function untilEndDate(repetitions = 0) {
  const endDate = this.date;

  const q = this.getRepetitions();
  if (q >= 0) return endDate;
  if (-repetitions > q) return this.applyDuration(endDate, -repetitions + 1);

  return this.applyDuration(endDate, q + 1);
};

/**
 * Get number of durations between date and now
 * @returns
 */
ISODateDurationFunctions.prototype.getRepetitions = function getRepetitions() {
  const ms = this.date.getTime();
  const diff = Date.now() - ms;
  const durationMs = this.duration.toMilliseconds();
  return Math.round(diff / durationMs);
};

/**
 *
 * @param {number} repetitions
 * @returns
 */
ISODateDurationFunctions.prototype.applyRepetitions = function applyRepetitions(repetitions) {
  const date = this.date;
  const q = this.getRepetitions();

  if (q < repetitions) return this.applyDuration(date, q);

  return this.applyDuration(date, repetitions);
};

/**
 *
 * @param {Date} [date]
 * @param {number} [repetitions]
 * @returns {Date} new date with applied duration
 */
ISODateDurationFunctions.prototype.applyDuration = function applyDuration(date, repetitions = 1) {
  const fromDate = date !== undefined ? date : this.date;
  if (!repetitions) return date;

  const duration = this.duration;
  const indifferentMs = duration.getDateIndifferentMilliseconds(repetitions);

  const ms = fromDate.getTime();
  if (duration.isDateIndifferent) return new Date(ms + indifferentMs);

  return this.applyDateDuration(new Date(ms + indifferentMs), repetitions);
};

/**
 * Apply date duration
 * @param {Date} fromDate apply to date
 * @param {number} [repetitions] repetitions
 * @returns {Date} new date with applied duration
 */
ISODateDurationFunctions.prototype.applyDateDuration = function applyDateDuration(fromDate, repetitions = 1) {
  const duration = this.duration;
  const startTime = fromDate.getTime();
  let endTime = startTime;
  const factor = repetitions;

  /** @type {any} */
  const { result, fractionedDesignator } = duration;

  for (const designator of 'YMWD') {
    if (!(designator in result)) continue;

    let value = factor * result[designator];
    let designatorKey = designator;
    if (designator === 'W') {
      designatorKey = 'D';
      value = value * 7;
    }

    const fromDate = new Date(endTime);
    const toDate = new Date(endTime);

    // @ts-ignore
    const [getter, setter] = this.getDateFns(designatorKey);
    const current = getter.call(toDate);

    if (fractionedDesignator !== designator) {
      setter.call(toDate, current + value);
      endTime += toDate.getTime() - fromDate.getTime();
    } else {
      const fullValue = ~~value;
      if (fullValue) {
        setter.call(toDate, current + fullValue);
        endTime += toDate.getTime() - fromDate.getTime();
      }

      const fraction = new Date(endTime);
      setter.call(fraction, getter.call(fraction) + factor);

      endTime += factor * (fraction.getTime() - toDate.getTime()) * (value - fullValue);
    }
  }

  return new Date(endTime);
};

/**
 * Get date designator getter and setter;
 * @param {string} designator
 */
ISODateDurationFunctions.prototype.getDateFns = function getDateFns(designator) {
  const fns = this.UTC ? dateUTCFns : dateLocalFns;
  // @ts-ignore
  return fns[designator];
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
 * @returns {ISODuration | undefined}
 */
export function parseDuration(isoDuration) {
  const intervalParser = new ISOInterval(isoDuration);
  return intervalParser.parse().duration;
}

/**
 * Parse ISO 8601 date
 * @param {string} isoDateSource ISO 8601 date
 */
export function getDate(isoDateSource) {
  return new ISODate(isoDateSource).toDate();
}

/**
 * Interval expire at date
 * @param {string} isoInterval ISO 8601 interval
 * @param {Date} [compareDate] optional compare date, defaults to now
 */
export function getExpireAt(isoInterval, compareDate) {
  return new ISOInterval(isoInterval).getExpireAt(compareDate);
}

/**
 * Interval expire at date
 * @param {string} isoInterval ISO 8601 interval
 * @param {Date} [compareDate] optional compare date, defaults to now
 */
export function getStartAt(isoInterval, compareDate) {
  return new ISOInterval(isoInterval).getStartAt(compareDate);
}

/**
 * Attempt to figure out next date in an ISO 8601 interval
 * @param {string} isoInterval
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @returns {Date | null} next date point
 */
export function next(isoInterval, compareDate) {
  const intervalParser = new ISOInterval(isoInterval);
  return intervalParser.parse().next(compareDate);
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

  if (M > 11) {
    return false;
  } else if (M === 1 && D - (Y % 4 ? 0 : 1) > 28) {
    return false;
  } else if (D - ((M + 1) % 2) > 30) {
    return false;
  }

  return true;
}

/**
 * Apply date duration
 * @param {Date} fromDate from date
 * @param {ISODuration} [duration] duration
 * @param {number} [repetitions] repetitions
 * @returns {Date} new date with applied duration
 */
function applyDateDuration(fromDate, duration, repetitions = 1) {
  const startTime = fromDate.getTime();
  let endTime = startTime;
  const factor = repetitions;

  /** @type {any} */
  const { result, fractionedDesignator } = duration;

  for (const designator of 'YMWD') {
    if (!(designator in result)) continue;

    let value = factor * result[designator];
    let fnKey = designator;
    if (designator === 'W') {
      fnKey = 'D';
      value = value * 7;
    }

    const fromDate = new Date(endTime);
    const toDate = new Date(endTime);

    // @ts-ignore
    const [getter, setter] = dateUTCFns[fnKey];
    const current = getter.call(toDate);

    if (fractionedDesignator !== designator) {
      setter.call(toDate, current + value);
      endTime += toDate.getTime() - fromDate.getTime();
    } else {
      const fullValue = ~~value;
      if (fullValue) {
        setter.call(toDate, current + fullValue);
        endTime += toDate.getTime() - fromDate.getTime();
      }

      const fraction = new Date(endTime);
      setter.call(fraction, getter.call(fraction) + factor);

      endTime += factor * (fraction.getTime() - toDate.getTime()) * (value - fullValue);
    }
  }

  return new Date(endTime);
}

/**
 * Calculate date indifferent duration milliseconds
 * @param {ISODuration} duration duration
 * @param {number} [repetitions] repetitions
 * @returns {number} number of date indifferent milliseconds
 */
function getIndifferentDurationAsMilliseconds(duration, repetitions = 1) {
  /** @type {any} */
  const { result, usedDesignators } = duration;

  let ms = 0;
  for (const designator of usedDesignators) {
    const value = result[designator];
    switch (designator) {
      case 'H':
        ms += value * MILLISECONDS_PER_HOUR * repetitions;
        break;
      case 'm':
        ms += value * 60000 * repetitions;
        break;
      case 'S':
        ms += value * 1000 * repetitions;
        break;
    }
  }

  return Math.round(ms);
}
