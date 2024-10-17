const FRACTIONS = ',.';
const ISO_ZULU = 'Z';
const ISODATE_SEPARATOR = '-';
const ISODATE_TIMEINSTRUCTION = 'T';
const ISODATE_WEEKINSTRUCTION = 'W';
const ISODURATION_DATE_DESIGNATORS = 'YMWD';
const ISODURATION_TIME_DESIGNATORS = 'HMS';
const ISOINTERVAL_DURATION = 'P';
const ISOINTERVAL_REPEAT = 'R';
const ISOINTERVAL_SEPARATOR = '/';
const ISOTIME_OFFSET = '+-' + ISO_ZULU;
const ISOTIME_SEPARATOR = ':';
const ISOTIME_STARTHOUR = '012';
const ISOTIME_STARTPART = '012345';
const ISODATE_WEEKDAYS = '1234567';
const NUMBERS = '0123456789';
const MILLISECONDS_PER_HOUR = 3600000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

const NONLEAPYEAR = new Date(Date.UTC(1971, 0, 1));

const kIsParsed = Symbol.for('is parsed');

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
}

/** @name module:piso.ISOInterval#startDate */
Object.defineProperty(ISOInterval.prototype, 'startDate', {
  /** @returns {Date | null} */
  get() {
    return this.start === undefined ? null : this.start.toDate();
  },
});

/** @name module:piso.ISOInterval#endDate */
Object.defineProperty(ISOInterval.prototype, 'endDate', {
  /** @returns {Date | null} */
  get() {
    return this.end === undefined ? null : this.end.toDate();
  },
});

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
 * Get expire at
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @param {Date} [startDate] optional start date, duration without start or end defaults to now
 */
ISOInterval.prototype.getExpireAt = function getExpireAt(compareDate, startDate) {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  const repetitions = (type & 1) === 1 ? this.repeat : 1;
  const duration = (type & 4) === 4 && this.duration;
  const hasEndDate = (type & 8) === 8;

  if (repetitions === 1 && hasEndDate) return this.end.toDate();

  const hasStartDate = (type & 2) === 2;

  compareDate = compareDate === undefined ? new Date() : compareDate;

  if (hasStartDate && duration) {
    const dateFns = new ISODateDurationFunctions(this.start.toDate(), duration, compareDate, this.start.result.Z);
    return dateFns.addDuration(repetitions === -1 ? Number.MAX_VALUE : repetitions);
  } else if (hasEndDate && duration && repetitions) {
    const dateFns = new ISODateDurationFunctions(this.end.toDate(), duration, compareDate, this.end.result.Z);
    return dateFns.reduceDuration(repetitions === -1 ? Number.MAX_VALUE : repetitions);
  }

  startDate = startDate === undefined ? new Date() : startDate;

  const dateFns = new ISODateDurationFunctions(startDate, duration, compareDate, 'Z');

  return dateFns.addDuration(repetitions === -1 ? Number.MAX_VALUE : repetitions);
};

/**
 * Get start at date
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @param {Date} [endDate] optional end date, defaults to now
 */
ISOInterval.prototype.getStartAt = function getStartAt(compareDate, endDate) {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  const repetitions = (type & 1) === 1 ? this.repeat : 1;
  const duration = (type & 4) === 4 && this.duration;
  const hasStartDate = (type & 2) === 2;

  if (repetitions === 1 && hasStartDate) return this.start.toDate();

  const hasEndDate = (type & 8) === 8;

  compareDate = compareDate === undefined ? new Date() : compareDate;

  if (hasStartDate && duration) {
    return duration.applyDuration(this.getExpireAt(undefined, compareDate), -1, !!this.start.result.Z);
  } else if (hasEndDate && duration) {
    return duration.applyDuration(this.getExpireAt(undefined, compareDate), -1, !!this.end.result.Z);
  } else if (endDate === undefined) {
    return duration.getStartAt(this.getExpireAt(undefined, compareDate));
  } else if (repetitions === 1) {
    return duration.getStartAt(endDate);
  }

  const dateFns = new ISODateDurationFunctions(endDate, duration, compareDate, 'Z');
  const expireAt = dateFns.reduceDuration(repetitions === -1 ? Number.MAX_VALUE : repetitions);
  return duration.getStartAt(expireAt);
};

ISOInterval.prototype.consumeRepeat = function consumeRepeat() {
  /** @type { string | undefined } */
  let c = this.read();
  if (c === '-') {
    c = this.read();
    if (c !== '1') throw new RangeError(`Unexpected ISO 8601 interval character "${this.parsed}[${c}]" at ${this.idx}`);
    this.repeat = -1;
    return this.read();
  }

  let value = '';
  while (c && NUMBERS.indexOf(c) > -1) {
    value += c;
    c = this.read();
  }
  this.repeat = value ? Number(value) : -1;
  if (c !== '/') throw new RangeError(`Unexpected ISO 8601 interval characted "${this.parsed}[${c}]" at ${this.idx}`);
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
  const end = (this.end = isoDate.parsePartialDate(start.result.Y, start.result.M, start.result.D, start.result.W));
  if (start.result.Z && !end.result.Z) {
    end.result.Z = start.result.Z;
    end.result.OH = start.result.OH;
    end.result.Om = start.result.Om;
    end.result.OS = start.result.OS;
  }

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

  if (result.W) {
    const wdate = getUTCDateFromWeek(result.Y, result.W, result.D);
    args[0] = wdate.getUTCFullYear();
    args[1] = wdate.getUTCMonth();
    args[2] = wdate.getUTCDate();
  }

  if ('H' in result) args.push(result.H, 0);
  if ('m' in result) args[4] = result.m;
  if ('S' in result) args.push(result.S);
  if ('F' in result) args.push(Math.round(result.F));

  if (result.Z === 'Z') {
    /** @ts-ignore */
    return new Date(Date.UTC(...args));
  } else if (result.Z === '-') {
    if (result.OH) args[3] += result.OH;
    if (result.Om) args[4] += result.Om;
    if (result.OS) args[5] = (args[5] ?? 0) + result.OS;
    /** @ts-ignore */
    return new Date(Date.UTC(...args));
  } else if (result.Z === '+') {
    if (result.OH) args[3] -= result.OH;
    if (result.Om) args[4] -= result.Om;
    if (result.OS) args[5] = (args[5] ?? 0) - result.OS;
    /** @ts-ignore */
    return new Date(Date.UTC(...args));
  }

  /** @ts-ignore */
  return new Date(...args);
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

  if (this.peek() === ISODATE_SEPARATOR || this.enforceSeparators) {
    this.enforceSeparators = true;
  }

  return this.continueDatePrecision(Y);
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
 * @param {number} [D] Date if date is not defined
 * @param {number} [W] Weeknumber
 * @returns {ISODate}
 */
ISODate.prototype.parsePartialDate = function parsePartialDate(Y, M, D, W) {
  if (this[kIsParsed]) return this;
  this[kIsParsed] = true;

  this.result.Y = Y;

  let c = this.consumeChar(NUMBERS + ISODATE_WEEKINSTRUCTION);
  let next = this.peek();

  if (c === ISODATE_WEEKINSTRUCTION) {
    const week = (this.result.W = Number(this.consumeChar('012345') + this.consumeChar()));
    if (!this.continueWeekdayPrecision(Y, week, this.enforceSeparators)) {
      return this;
    }

    c = this.consume();

    if (c === ISODATE_TIMEINSTRUCTION) {
      const hours = (this.result.H = Number(this.consumeChar(ISOTIME_STARTHOUR) + this.consumeChar()));
      return this.continueTimePrecision(hours, this.enforceSeparators);
    }
  } else if (W && (!next || next === ISODATE_TIMEINSTRUCTION) && ISODATE_WEEKDAYS.indexOf(c) > -1) {
    this.result.W = W;
    this.result.D = Number(c);

    if (!next) return this;

    this.consume();
    const hours = (this.result.H = Number(this.consumeChar(ISOTIME_STARTHOUR) + this.consumeChar()));
    return this.continueTimePrecision(hours, this.enforceSeparators);
  }

  this.result.M = M;
  this.result.D = D;

  const value = c + this.consumeChar();

  next = this.peek();

  if (!next) {
    this.consume();
    const day = (this.result.D = Number(value));

    if (!validateDate(Y, M, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}"`);

    return this;
  } else if (next === ISODATE_TIMEINSTRUCTION) {
    const day = (this.result.D = Number(value));

    if (!validateDate(Y, M, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}"`);

    this.consume();

    const hours = (this.result.H = Number(this.consumeChar(ISOTIME_STARTHOUR) + this.consumeChar()));
    return this.continueTimePrecision(hours, this.enforceSeparators);
  } else if (next === ISOTIME_SEPARATOR) {
    const hours = (this.result.H = Number(value));
    if (!M) this.result.W = W;

    return this.continueTimePrecision(hours, this.enforceSeparators);
  } else if (NUMBERS.indexOf(next) > -1) {
    const Y = (this.result.Y = Number(value + this.consumeChar() + this.consumeChar()));
    return this.continueDatePrecision(Y);
  } else if (next === ISODATE_SEPARATOR) {
    this.consume();
    const month = (this.result.M = Number(value) - 1);
    const day = (this.result.D = Number(this.consumeChar('0123') + this.consumeChar()));

    if (!validateDate(Y, month, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}"`);

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
  const initNext = ISODATE_WEEKINSTRUCTION + '01';

  /** @type {string | undefined} */
  let c = this.consumeChar(dateSeparator + initNext);
  if (c === ISODATE_SEPARATOR) {
    dateSeparator = c;
    c = this.consumeChar(initNext);
  } else if (dateSeparator) {
    throw this.createUnexpectedError();
  }

  if (c === ISODATE_WEEKINSTRUCTION) {
    c = this.consumeChar('012345');
    const W = (this.result.W = Number(c + this.consumeChar()));

    if (!this.continueWeekdayPrecision(Y, W, !!dateSeparator)) {
      return this;
    }
  } else {
    const M = (this.result.M = Number(c + this.consumeChar()) - 1);

    if (dateSeparator) {
      c = this.consumeCharOrEnd(dateSeparator);
      if (!c) {
        if (!validateDate(Y, M, 1)) throw new RangeError(`Invalid ISO 8601 date "${this.source}"`);
        this.result.D = 1;
        return this;
      }
    }

    c = this.consumeChar();

    const D = (this.result.D = Number(c + this.consumeChar()));

    if (!validateDate(Y, M, D)) throw new RangeError(`Invalid ISO 8601 date "${this.source}"`);
  }

  c = this.consumeCharOrEnd(ISODATE_TIMEINSTRUCTION);

  if (!c) return this;

  const hours = (this.result.H = Number(this.consumeChar(ISOTIME_STARTHOUR) + this.consumeChar()));

  return this.continueTimePrecision(hours, !!dateSeparator);
};

/**
 * Consume weekday
 * @param {number} Y from year
 * @param {number} W from week
 * @param {boolean} useSeparator time separator
 * @returns {boolean} Continue
 */
ISODate.prototype.continueWeekdayPrecision = function continueWeekdayPrecision(Y, W, useSeparator) {
  let c;
  if (useSeparator) {
    c = this.consumeCharOrEnd(ISODATE_SEPARATOR);
    if (!c) {
      if (!validateWeek(Y, W)) throw new RangeError(`Invalid ISO 8601 week date "${this.source}"`);
      this.result.D = 1;
      return false;
    }
  }

  c = this.consumeCharOrEnd(ISODATE_WEEKDAYS);

  if (!c) {
    this.result.D = 1;
  } else {
    this.result.D = Number(c);
  }

  if (!validateWeek(Y, W)) throw new RangeError(`Invalid ISO 8601 week date "${this.source}"`);

  return !!this.peek();
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
  return this.applyDuration(startDate, repetition, true);
};

/**
 * Get duration start date
 * @param {Date} [endDate] optional end date, defaults to now
 * @param {number} [repetition] number of repetitions
 */
ISODuration.prototype.getStartAt = function getStartAt(endDate, repetition = 1) {
  return this.applyDuration(endDate, repetition ? -repetition : -1, true);
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
  endDate = endDate === undefined ? NONLEAPYEAR : endDate;
  return this.getStartAt(endDate, repetition).getTime() - endDate.getTime();
};

/**
 * Calculate date indifferent duration milliseconds
 * @param {number} [repetitions] repetitions
 * @returns {number} number of date indifferent milliseconds
 */
ISODuration.prototype.getDateIndifferentMilliseconds = function getDateIndifferentMilliseconds(repetitions = 1) {
  /** @type {any} */
  const { result, usedDesignators } = this;

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
 * @param {Date} [date]
 * @param {number} [repetitions]
 * @param {boolean} [useUtc] UTC
 * @returns {Date} new date with applied duration
 */
ISODuration.prototype.applyDuration = function applyDuration(date, repetitions = 1, useUtc = false) {
  date = date === undefined ? new Date() : date;

  const indifferentMs = this.getDateIndifferentMilliseconds(repetitions);

  const ms = date.getTime();

  if (this.isDateIndifferent) return new Date(ms + indifferentMs);

  return this.applyDateDuration(new Date(ms + indifferentMs), repetitions, useUtc);
};

/**
 * Apply date duration
 * @param {Date} fromDate apply to date
 * @param {number} [repetitions] repetitions
 * @param {boolean} [useUtc] UTC
 * @returns {Date} new date with applied duration
 */
ISODuration.prototype.applyDateDuration = function applyDateDuration(fromDate, repetitions = 1, useUtc = false) {
  const startTime = fromDate.getTime();
  let endTime = startTime;
  const factor = repetitions;

  /** @type {any} */
  const { result, fractionedDesignator } = this;

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
    const [getter, setter] = this._getDateFns(designatorKey, useUtc);
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
 * @param {boolean} useUtc
 */
ISODuration.prototype._getDateFns = function getDateFns(designator, useUtc) {
  const fns = useUtc ? dateUTCFns : dateLocalFns;
  // @ts-ignore
  return fns[designator];
};

/**
 *
 * @param {Date} date
 * @param {Date} compareTo
 * @param {ISODuration} duration
 * @param {string} [UTC]
 */
function ISODateDurationFunctions(date, duration, compareTo, UTC) {
  this.date = date;
  this.duration = duration;
  this.compareTo = compareTo;
  this.UTC = UTC;
}

/**
 * Add duration to date
 * @param {number} [repetitions] repetition
 */
ISODateDurationFunctions.prototype.addDuration = function addDuration(repetitions = 1) {
  const startDate = this.date;

  const repeat = repetitions;
  const ms = this.date.getTime();
  const now = this.compareTo;
  const diff = now.getTime() - ms;
  const q = diff / this.duration.toMilliseconds();

  if (q < 0) return this.applyDuration(startDate);

  let qs = ~~q;

  if (qs >= repeat) return this.applyDuration(startDate, repeat);

  let expireAt = this.applyDuration(startDate, ++qs);

  while (expireAt <= now && qs < repeat) {
    expireAt = this.applyDuration(startDate, ++qs);
  }

  return expireAt;
};

/**
 * Reduce duration from date
 * @param {number} [repetitions] number of repetitions
 */
ISODateDurationFunctions.prototype.reduceDuration = function reduceDuration(repetitions = 0) {
  const endDate = this.date;

  const repeat = 1 - repetitions;
  const ms = this.date.getTime();
  const now = this.compareTo;
  const diff = now.getTime() - ms;
  const q = diff / this.duration.toMilliseconds();

  if (q >= 0) return endDate;

  const qs = ~~q;

  if (qs < repeat) return this.applyDuration(endDate, repeat);

  let expireAt = this.applyDuration(endDate, qs);
  let iter = qs;
  while (expireAt > now && iter > repeat) {
    expireAt = this.applyDuration(endDate, --iter);
  }

  if (expireAt <= now) {
    return this.applyDuration(endDate, ++iter);
  }

  return this.applyDuration(endDate, repeat);
};

/**
 *
 * @param {Date} [date]
 * @param {number} [repetitions]
 * @returns {Date} new date with applied duration
 */
ISODateDurationFunctions.prototype.applyDuration = function applyDuration(date, repetitions = 1) {
  return this.duration.applyDuration(date, repetitions, !!this.UTC);
};

/**
 * Parse ISO 8601 interval
 * @param {string} isoInterval ISO 8601 interval
 * @returns {ISOInterval}
 */
export function parseInterval(isoInterval) {
  return new ISOInterval(isoInterval).parse();
}

/**
 * Parse ISO 8601 duration
 * @param {string} isoDuration ISO 8601 interval and/or duration
 * @returns {ISODuration | undefined}
 */
export function parseDuration(isoDuration) {
  return new ISOInterval(isoDuration).parse().duration;
}

/**
 * Parse ISO 8601 date
 * @param {string | Date | number} isoDateSource ISO 8601 date
 */
export function getDate(isoDateSource) {
  if (isoDateSource instanceof Date) return new Date(isoDateSource);
  else if (typeof isoDateSource === 'number') return new Date(isoDateSource);
  else if (!isoDateSource || typeof isoDateSource !== 'string') {
    throw new TypeError('ISO 8601 date source and must be a string');
  }

  return new ISODate(isoDateSource).toDate();
}

/**
 * Interval expire at date
 * @param {string} isoInterval ISO 8601 interval
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @param {Date} [startDate] optional start date for use when only duration is present
 */
export function getExpireAt(isoInterval, compareDate, startDate) {
  return new ISOInterval(isoInterval).getExpireAt(compareDate, startDate);
}

/**
 * Interval start at date
 * @param {string} isoInterval ISO 8601 interval
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @param {Date} [endDate] optional end date for use when only duration is present
 */
export function getStartAt(isoInterval, compareDate, endDate) {
  return new ISOInterval(isoInterval).getStartAt(compareDate, endDate);
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

  switch (M) {
    case 1:
      return D - (isLeapYear(Y) ? 1 : 0) < 29;
    case 0:
    case 2:
    case 4:
    case 6:
    case 7:
    case 9:
    case 11:
      return D < 32;
    case 3:
    case 5:
    case 8:
    case 10:
      return D < 31;
    default:
      return false;
  }
}

/**
 * Validate week parts
 * @param {number} Y UTC full year
 * @param {number} W week
 */
function validateWeek(Y, W) {
  if (!W || W > 53) return false;
  if (W < 53) return true;

  return getUTCLastWeekOfYear(Y) === 53;
}

/**
 * Get last week of UTC year
 * @param {number} Y UTC full year
 */
export function getUTCLastWeekOfYear(Y) {
  const dec31 = new Date(Date.UTC(Y, 11, 31));
  const weekdayDec31 = getUTCWeekday(dec31);

  if (weekdayDec31 < 4) {
    return 52;
  }

  const jan4 = new Date(Date.UTC(Y, 0, 4));
  return 53 * 7 + weekdayDec31 - getUTCWeekday(jan4) + 3 > 372 ? 52 : 53;
}

/**
 * Get Monday week one date
 * @param {number} Y UTC full year
 */
export function getUTCWeekOneDate(Y) {
  const jan4 = new Date(Date.UTC(Y, 0, 4));
  const weekdayJan4 = getUTCWeekday(jan4);
  return new Date(jan4.getTime() - (weekdayJan4 - 1) * MILLISECONDS_PER_DAY);
}

/**
 * Get UTC week from date
 * @param {Date|number|string} [date]
 * @returns {import('types').ISOWeekParts}
 */
export function getUTCWeekNumber(date) {
  const dt = new Date(date ?? Date.now());

  let Y = dt.getUTCFullYear();
  const M = dt.getUTCMonth();
  const D = dt.getUTCDate();

  const weekday = getUTCWeekday(dt);

  const doy = getOrdinalDayOfYear(Y, M, D);

  let W = ~~((10 + doy - weekday) / 7);
  if (W < 1) {
    --Y;
    W = getUTCLastWeekOfYear(Y);
  } else if (W === 53 && getUTCLastWeekOfYear(Y) === 52) {
    ++Y;
    W = 1;
  }

  return { Y, W, weekday };
}

/**
 * Get date expressed as ISO week string
 * @param {Date|number|string} [date]
 */
export function getISOWeekString(date) {
  const dt = new Date(date ?? Date.now());
  const { Y, W, weekday } = getUTCWeekNumber(dt);
  const iso = dt.toISOString();

  const paddedW = W < 10 ? `0${W}` : W;
  return `${Y}-W${paddedW}-${weekday}T${iso.split('T').pop()}`;
}

/**
 * Get ISO weekday from date
 * 1 = Monday, 7 = Sunday
 * @param {Date} date
 * @returns {import('types').ISOWeekday}
 */
function getUTCWeekday(date) {
  const weekday = date.getUTCDay();
  return !weekday ? 7 : weekday;
}

/**
 * Is leap year
 * @param {number} year
 */
function isLeapYear(year) {
  if (year % 4) return false;
  return year % 100 === 0 ? year % 400 === 0 : true;
}

/**
 * Get UTC date from week and weekday
 * @param {number} Y year
 * @param {number} W week number
 * @param {number} D weekday
 */
function getUTCDateFromWeek(Y, W, D) {
  const daysToAdd = (W - 1) * 7 + (D - 1);
  return new Date(getUTCWeekOneDate(Y).getTime() + daysToAdd * MILLISECONDS_PER_DAY);
}

/**
 * Get ordinal days, count number of days until date
 * @param {number} Y year
 * @param {number} M javascript month, 0 = January
 * @param {number} D day of month
 */
function getOrdinalDayOfYear(Y, M, D) {
  let doy = D;

  switch (M - 1) {
    case 10:
      doy += 30;
    case 9:
      doy += 31;
    case 8:
      doy += 30;
    case 7:
      doy += 31;
    case 6:
      doy += 31;
    case 5:
      doy += 30;
    case 4:
      doy += 31;
    case 3:
      doy += 30;
    case 2:
      doy += 31;
    case 1: {
      doy += 28;
      if (isLeapYear(Y)) {
        doy += 1;
      }
    }
    case 0:
      doy += 31;
  }

  return doy;
}
