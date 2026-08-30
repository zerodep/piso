const FRACTIONS = ',.';
const UNICODE_MINUS = '\u2212';
const ISO_ZULU = 'Z';
const ISODATE_HYPHEN = '-';
const ISODATE_PREFIX = '+-' + UNICODE_MINUS;
const ISODATE_TIMEINSTRUCTION = 'T';
const ISODATE_WEEKINSTRUCTION = 'W';
const ISODURATION_DATE_DESIGNATORS = 'YMWD';
const ISODURATION_TIME_DESIGNATORS = 'HMS';
const ISOINTERVAL_DURATION = 'P';
const ISOINTERVAL_REPEAT = 'R';
const ISOINTERVAL_SEPARATOR = '/';
const ISOTIME_OFFSET = ISODATE_PREFIX + ISO_ZULU;
const ISOTIME_SEPARATOR = ':';
const ISOTIME_STARTHOUR = '012';
const ISOTIME_STARTPART = '012345';
const ISODATE_WEEKDAYS = '1234567';
const NUMBERS = '0123456789';
const ISODATE_CHARS = NUMBERS + ISODATE_HYPHEN;
const ISODATE_CHARS_UNSEPARATED = ISODATE_CHARS + ISODATE_TIMEINSTRUCTION + ISODATE_WEEKINSTRUCTION;
const ISODATE_NUMBER_OR_WEEK = NUMBERS + ISODATE_WEEKINSTRUCTION;
const ISODATE_MONTH_START = ISODATE_WEEKINSTRUCTION + '0123';
const ISODATE_MONTH_START_SEPARATED = ISODATE_HYPHEN + ISODATE_MONTH_START;
const ISODATE_DATE_CONT = ISODATE_TIMEINSTRUCTION + NUMBERS;
const ISODATE_DATE_CONT_SEPARATED = ISODATE_DATE_CONT + ISODATE_HYPHEN;
const ISOTIME_START_SEPARATED = ISOTIME_SEPARATOR + ISOTIME_STARTPART;
const ISOTIME_CONT = ISOTIME_OFFSET + NUMBERS;
const ISOTIME_CONT_SEPARATED = ISOTIME_SEPARATOR + ISOTIME_CONT;
const ISOTIME_FRACTION_OR_OFFSET = FRACTIONS + ISOTIME_OFFSET;
const POW10 = [1, 10, 100, 1000, 10000];
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
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
export function ISOInterval(source, enforceUTC = false) {
  if (!source || typeof source !== 'string') throw new TypeError('ISO 8601 interval source is required and must be a string');
  /** @internal Interval source string */
  this.source = source;
  /** @internal */
  this.c = '';
  /** @internal */
  this.idx = -1;
  /** @type {number | undefined} */
  this.repeat = undefined;
  /** @type {ISODate | undefined} */
  this.start = undefined;
  /** @type {ISODuration | undefined} */
  this.duration = undefined;
  /** @type {ISODate | undefined} */
  this.end = undefined;
  /** @type {import('types').ISOIntervalType} */
  this.type = 0;
  this.enforceUTC = enforceUTC;
  /** @internal */
  this[kIsParsed] = false;
}

Object.defineProperty(ISOInterval.prototype, 'startDate', {
  /** @returns {Date | null} */
  get() {
    return this.start?.toDate() ?? null;
  },
});

Object.defineProperty(ISOInterval.prototype, 'endDate', {
  /** @returns {Date | null} */
  get() {
    return this.end?.toDate() ?? null;
  },
});

Object.defineProperty(ISOInterval.prototype, 'parsed', {
  /** @returns {string} parsed chars */
  get() {
    return this.source.substring(0, this.idx);
  },
});

/**
 * ISO 8601 interval parser
 */
ISOInterval.prototype.parse = function parseInterval() {
  if (this[kIsParsed]) return this;

  let c = this.peek();
  if (c === ISOINTERVAL_REPEAT) {
    this.read();
    this.consumeRepeat();

    c = this.peek();
  }

  let start;
  if (isDigit(c) || isDatePrefix(c)) {
    start = this.consumeStartDate();
  } else if (c !== ISOINTERVAL_DURATION) {
    throw new RangeError(`Invalid ISO 8601 interval "${this.source}"`);
  }

  c = this.peek();

  if (c === ISOINTERVAL_DURATION) {
    this.consumeDuration();

    if (this.repeat && this.repeat !== 1) {
      this.type = this.type | 1;
    }
  }

  c = this.current();

  if (c === ISOINTERVAL_SEPARATOR && !start && this.duration) {
    this.end = this.consumeDate();
    this.type |= 8;
  } else if (c === ISOINTERVAL_SEPARATOR && start && !this.duration) {
    this.consumePartialEndDate(start);
  } else if (c) {
    throw new RangeError(`ISO 8601 interval "${this.source}" combination is not allowed`);
  }

  this[kIsParsed] = true;

  return this;
};

/**
 * Get closest expire at
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @param {Date} [startDate] optional start date, duration without start or end defaults to now
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
ISOInterval.prototype.getExpireAt = function getExpireAt(compareDate, startDate, enforceUTC) {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  const repetitions = (type & 1) === 1 ? this.repeat : 1;
  const duration = (type & 4) === 4 && this.duration;
  const hasEndDate = (type & 8) === 8;
  const eUTC = enforceUTC ?? this.enforceUTC;

  if (repetitions === 1 && hasEndDate) return this.end.toDate(eUTC);

  const hasStartDate = (type & 2) === 2;

  if (hasStartDate && !duration) return this.start.toDate(eUTC);

  compareDate = compareDate ?? new Date();

  if (hasStartDate && duration) {
    const dateFns = new ISODateDurationFunctions(this.start.toDate(eUTC), duration, compareDate, !!this.start.result.Z || eUTC);
    return dateFns.addDuration(repetitions === -1 ? Number.MAX_VALUE : repetitions);
  } else if (hasEndDate && duration && repetitions) {
    const dateFns = new ISODateDurationFunctions(this.end.toDate(eUTC), duration, compareDate, !!this.end.result.Z || eUTC);
    return dateFns.reduceDuration(repetitions === -1 ? Number.MAX_VALUE : repetitions);
  }

  startDate = startDate ?? new Date();

  const dateFns = new ISODateDurationFunctions(startDate, duration, compareDate, true);

  return dateFns.addDuration(repetitions === -1 ? Number.MAX_VALUE : repetitions);
};

/**
 * Get start at date
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @param {Date} [endDate] optional end date, defaults to now
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
ISOInterval.prototype.getStartAt = function getStartAt(compareDate, endDate, enforceUTC) {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  const repetitions = (type & 1) === 1 ? this.repeat : 1;
  const duration = (type & 4) === 4 && this.duration;
  const hasStartDate = (type & 2) === 2;
  const eUTC = enforceUTC ?? this.enforceUTC;

  if (repetitions === 1 && hasStartDate) return this.start.toDate(eUTC);

  const hasEndDate = (type & 8) === 8;

  compareDate = compareDate ?? new Date();

  if (hasStartDate && duration) {
    return duration.applyDuration(this.getExpireAt(undefined, compareDate, eUTC), -1, !!this.start.result.Z || eUTC);
  } else if (hasEndDate && duration) {
    return duration.applyDuration(this.getExpireAt(undefined, compareDate, eUTC), -1, !!this.end.result.Z || eUTC);
  } else if (endDate === undefined) {
    return duration.getStartAt(this.getExpireAt(undefined, compareDate, eUTC));
  } else if (repetitions === 1) {
    return duration.getStartAt(endDate);
  }

  const dateFns = new ISODateDurationFunctions(endDate, duration, compareDate, true);
  const expireAt = dateFns.reduceDuration(repetitions === -1 ? Number.MAX_VALUE : repetitions);
  return duration.getStartAt(expireAt);
};

ISOInterval.prototype.toJSON = function intervalToJSON() {
  try {
    return this.toISOString();
  } catch {
    return null;
  }
};

ISOInterval.prototype.toISOString = function intervalToISOString() {
  if (!this[kIsParsed]) this.parse();

  const type = this.type;
  const repetitions = (type & 1) === 1;
  const hasDuration = (type & 4) === 4;
  const hasStartDate = (type & 2) === 2;
  const hasEndDate = (type & 8) === 8;

  const isoString = [];
  if (repetitions) {
    isoString.push('R' + this.repeat);
  }

  if (hasStartDate) {
    isoString.push(this.start.toISOString());
  }

  if (hasDuration) {
    isoString.push(this.duration.toISOString());
  }

  if (hasEndDate) {
    isoString.push(this.end.toISOString());
  }

  return isoString.join(ISOINTERVAL_SEPARATOR);
};

ISOInterval.prototype.toString = function intervalToString() {
  try {
    this.parse();
    return this.source;
  } catch {
    return `Invalid ${this.constructor.name}`;
  }
};

ISOInterval.prototype.consumeRepeat = function consumeRepeat() {
  /** @type { string | undefined } */
  let c = this.read();
  if (c === '-') {
    c = this.read();
    if (c !== '1') throw this.createUnexpectedError();
    this.repeat = -1;
    return this.read();
  }

  let value = '';
  while (isDigit(c)) {
    value += c;
    if (value.length > 17) {
      throw new RangeError(`ISO 8601 interval repeat "${this.parsed}[${c}]" at ${this.idx} exceeds 17 digits`);
    }
    c = this.read();
  }
  this.repeat = value ? Number(value) : -1;
  if (c !== ISOINTERVAL_SEPARATOR) throw this.createUnexpectedError();
};

ISOInterval.prototype.createUnexpectedError = function createUnexpectedError() {
  const c = this.c;
  return new RangeError(`Unexpected ISO 8601 interval character "${this.parsed}[${c ? c : 'EOL'}]" at ${this.idx}`);
};

ISOInterval.prototype.consumeStartDate = function consumeStartDate() {
  const start = (this.start = this.consumeDate(undefined, ISOINTERVAL_SEPARATOR));
  this.type |= 2;
  return start;
};

ISOInterval.prototype.consumeDuration = function consumeDuration() {
  const duration = (this.duration = new ISODuration(this.source, this.idx).parse());
  this.idx = duration.idx;
  this.type |= 4;
  return duration;
};

/**
 * Consume partial end date
 * @param {ISODate} start
 */
ISOInterval.prototype.consumePartialEndDate = function consumePartialEndDate(start) {
  const isoDate = new ISODate(this.source, { offset: this.idx, enforceSeparators: start.enforceSeparators, enforceUTC: this.enforceUTC });
  const end = (this.end = isoDate.parsePartialDate(start.result.Y, start.result.M, start.result.D, start.result.W));
  if (start.result.Z && !end.result.Z) {
    end.result.Z = start.result.Z;
    end.result.OH = start.result.OH;
    end.result.Om = start.result.Om;
    end.result.OS = start.result.OS;
  }

  this.idx = isoDate.idx;
  this.c = isoDate.c;

  if (start.toDate() > isoDate.toDate()) {
    throw new RangeError('ISO 8601 interval end date occur before start date');
  }

  this.type |= 8;

  return isoDate;
};

/**
 * Consume date
 * @param {boolean} [enforceSeparators]
 * @param {string} [endChars]
 */
ISOInterval.prototype.consumeDate = function consumeDate(enforceSeparators, endChars) {
  const isoDate = new ISODate(this.source, { offset: this.idx, endChars, enforceSeparators, enforceUTC: this.enforceUTC }).parse();
  this.idx = isoDate.idx;
  this.c = isoDate.c;
  return isoDate;
};

ISOInterval.prototype.read = function read() {
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
 * @param {import('types').ISODateOptions} [options] parse options
 */
export function ISODate(source, options) {
  this.source = source;
  /** @type {number} */
  // @ts-ignore
  this.offset = options?.offset ?? -1;
  this.idx = this.offset > -1 ? Number(this.offset) : -1;
  this.enforceSeparators = options?.enforceSeparators;
  this.enforceUTC = options?.enforceUTC;
  this.c = '';
  this.endChars = options?.endChars;
  /** @type {Partial<import('types').ISODateParts>} */
  this.result = {};
  /** @internal */
  this[kIsParsed] = false;
}

Object.defineProperty(ISODate.prototype, 'parsed', {
  /** @returns {string} */
  get() {
    return this.source.substring(0, this.idx);
  },
});

/**
 * ISO Date to Date
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
ISODate.prototype.toDate = function toDate(enforceUTC) {
  if (!this[kIsParsed]) this.parse();

  /** @type {any} */
  const result = this.result;
  const args = [result.Y, result.M, result.D];

  if (result.W) {
    const wdate = getUTCDateFromWeek(result.Y, result.W, result.D);
    args[0] = wdate.getUTCFullYear();
    args[1] = wdate.getUTCMonth();
    args[2] = wdate.getUTCDate();
  } else if (result.M === undefined) {
    const odate = getUTCDateFromOrdinalDate(result.Y, result.D);
    args[1] = odate.getUTCMonth();
    args[2] = odate.getUTCDate();
  }

  if ('H' in result) args.push(result.H, 0);
  if ('m' in result) args[4] = result.m;
  if ('S' in result) args.push(result.S);
  if ('F' in result) args.push(Math.round(result.F));

  switch (result.Z ?? ((enforceUTC ?? this.enforceUTC) && 'Z')) {
    case ISO_ZULU:
      /** @ts-ignore */
      return new Date(Date.UTC(...args));
    case '-':
    case UNICODE_MINUS: {
      if (result.OH) args[3] += result.OH;
      if (result.Om) args[4] += result.Om;
      if (result.OS) args[5] = (args[5] ?? 0) + result.OS;
      /** @ts-ignore */
      return new Date(Date.UTC(...args));
    }
    case '+': {
      if (result.OH) args[3] -= result.OH;
      if (result.Om) args[4] -= result.Om;
      if (result.OS) args[5] = (args[5] ?? 0) - result.OS;
      /** @ts-ignore */
      return new Date(Date.UTC(...args));
    }
  }

  /** @ts-ignore */
  return new Date(...args);
};

/**
 * Parse passed source as ISO 8601 date time
 */
ISODate.prototype.parse = function parseISODate() {
  if (this[kIsParsed]) {
    if (!this.result?.isValid) throw new RangeError(`Invalid ${this.constructor.name}`);
    return this;
  }
  this[kIsParsed] = true;

  let c = this.peek();

  let sign = '';
  let dateChars = ISODATE_CHARS;
  if (isDatePrefix(c)) {
    sign = c === UNICODE_MINUS ? ISODATE_HYPHEN : c;
    this.enforceSeparators = true;
    this.consume();
  } else if (!this.enforceSeparators) {
    dateChars = ISODATE_CHARS_UNSEPARATED;
  }

  const digitsStart = this.idx + 1;
  let value = 0;
  let len = 0;
  while ((c = this.consumeCharOrEnd(dateChars))) {
    if (c === ISODATE_HYPHEN) {
      this.enforceSeparators = true;
      break;
    } else if (c === ISODATE_TIMEINSTRUCTION) {
      break;
    } else if (c === ISODATE_WEEKINSTRUCTION) {
      break;
    } else {
      value = value * 10 + digitValue(c);
      len++;
      if (!sign && len > 8) {
        throw new RangeError(`ISO 8601 date year "${this.parsed}[${c}]" at ${this.idx} exceeds 8 digits`);
      } else if (sign && len > 17) {
        throw new RangeError(`ISO 8601 date year "${this.parsed}[${c}]" at ${this.idx} exceeds 17 digits`);
      }
    }
  }

  if (len < 4) throw this.createUnexpectedError();
  if (sign && !c) {
    this.result.Y = signedYear(this.source, sign, value, digitsStart, len);
    this.result.M = 0;
    this.result.D = 1;
    this.result.isValid = true;
    return this;
  }

  if (c === ISODATE_TIMEINSTRUCTION || !c) {
    if (this.enforceSeparators) throw this.createUnexpectedError();

    const pow = POW10[len - 4];
    const Y = (this.result.Y = (value / pow) | 0);
    const rest = value % pow;

    if (len === 4 && !c) {
      this.result.M = 0;
      this.result.D = 1;
    } else if (len === 7) {
      const D = (this.result.D = rest);
      this.continueOrdinalDatePrecision(Y, D, c);
    } else {
      const M = (this.result.M = (len === 8 ? (rest / 100) | 0 : rest) - 1);
      const D = (this.result.D = len === 8 ? rest % 100 : 0);

      if (!validateDate(Y, M, D)) throw new RangeError(`Invalid ISO 8601 date "${this.parsed}"`);

      if (c) this.continueFromTimeInstruction();
    }
  } else if (c === ISODATE_WEEKINSTRUCTION) {
    const Y = (this.result.Y = value);

    this.continueFromWeekInstruction(Y);
  } else if (sign) {
    const Y = (this.result.Y = signedYear(this.source, sign, value, digitsStart, len));
    this.continueDatePrecision(Y);
  } else {
    if (len > 4) throw this.createUnexpectedError();
    const Y = (this.result.Y = value);
    this.continueDatePrecision(Y);
  }

  this.result.isValid = true;

  return this;
};

/**
 * Get ISO date as string
 * @returns date as JSON string
 */
ISODate.prototype.toISOString = function isoDateToISOString() {
  return this.toDate().toISOString();
};

/**
 * Get ISO date as JSON
 * @returns {string|null} date as JSON string
 */
ISODate.prototype.toJSON = function isoDateToJSON() {
  try {
    return this.toDate().toJSON();
  } catch {
    return null;
  }
};

ISODate.prototype.toString = function isoDateToString() {
  try {
    this.parse();
    const offset = this.offset;
    if (offset < 0) {
      return this.parsed;
    }
    return this.parsed.substring(offset + 1);
  } catch {
    return `Invalid ${this.constructor.name}`;
  }
};

/**
 * Parse ISO 8601 date string
 * @param {string} source ISO 8601 duration
 * @param {number?} [offset] source column offset
 */
ISODate.parse = function staticParseISODate(source, offset) {
  return new this(source, { offset }).parse().result;
};

/**
 * Parse partial relative date
 * @param {number} Y Year if year is not defined
 * @param {number} M JavaScript month if month is not defined
 * @param {number} [D] Date if date is not defined
 * @param {number} [W] Weeknumber
 */
ISODate.prototype.parsePartialDate = function parsePartialDate(Y, M, D, W) {
  if (this[kIsParsed]) return this;
  this._parseRelativeDate(Y, M, D, W);
  this.result.isValid = true;
  return this;
};

/**
 * @internal
 * Parse relative date
 * @param {number} Y Year if year is not defined
 * @param {number} M JavaScript month if month is not defined
 * @param {number} [D] Date if date is not defined
 * @param {number} [W] Weeknumber
 */
ISODate.prototype._parseRelativeDate = function parseRelativeDate(Y, M, D, W) {
  this.result.Y = Y;

  if (isDatePrefix(this.peek())) {
    return this.parse();
  }

  this[kIsParsed] = true;

  const c = this.consumeChar(ISODATE_NUMBER_OR_WEEK);
  let next = this.peek();

  if (c === ISODATE_WEEKINSTRUCTION) {
    return this.continueFromWeekInstruction(Y);
  } else if (W && (!next || next === ISODATE_TIMEINSTRUCTION) && isWeekday(c)) {
    this.result.W = W;
    this.result.D = Number(c);

    if (!next) return this;

    this.consume();
    return this.continueFromTimeInstruction();
  }

  this.result.M = M;
  this.result.D = D;

  let value = twoDigits(c, this.consumeChar());

  next = this.peek();

  if (!next) {
    this.consume();
    const day = (this.result.D = value);

    if (!validateDate(Y, M, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}"`);

    return this;
  } else if (next === ISODATE_TIMEINSTRUCTION) {
    const day = (this.result.D = value);

    if (!validateDate(Y, M, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}"`);

    this.consume();

    return this.continueFromTimeInstruction();
  } else if (next === ISOTIME_SEPARATOR) {
    const hours = (this.result.H = value);
    if (!M) this.result.W = W;

    return this.continueTimePrecision(hours);
  } else if (isDigit(next)) {
    this.result = {};
    value = value * 10 + digitValue(this.consumeChar());
    next = this.peek();

    if (!next || next === ISODATE_TIMEINSTRUCTION) {
      return this.continueOrdinalDatePrecision(Y, value, next && this.consumeCharOrEnd(ISODATE_TIMEINSTRUCTION));
    }

    this.result.Y = value * 10 + digitValue(this.consumeChar());

    if (!this.peek()) {
      this.result.M = 0;
      this.result.D = 1;
      return this;
    }

    if (this.enforceSeparators) this.consumeChar(ISODATE_HYPHEN);

    return this.continueDatePrecision(this.result.Y);
  } else if (next === ISODATE_HYPHEN) {
    this.consume();
    const month = (this.result.M = value - 1);
    const day = (this.result.D = twoDigits(this.consumeChar('0123'), this.consumeChar()));

    if (!validateDate(Y, month, day)) throw new RangeError(`Invalid ISO 8601 partial date "${this.parsed}"`);

    const c = this.consumeCharOrEnd(ISODATE_TIMEINSTRUCTION);
    if (c) {
      return this.continueFromTimeInstruction();
    }

    return this;
  }

  throw this.createUnexpectedError();
};

/**
 * Consume as ISO date
 * @param {number} Y year
 */
ISODate.prototype.continueDatePrecision = function continueDatePrecision(Y) {
  const dateSeparator = this.enforceSeparators ? ISODATE_HYPHEN : '';

  /** @type {string | undefined} */
  let c = this.consumeChar(dateSeparator ? ISODATE_MONTH_START_SEPARATED : ISODATE_MONTH_START);

  if (c === ISODATE_WEEKINSTRUCTION) {
    return this.continueFromWeekInstruction(Y);
  }

  const instructions = dateSeparator ? ISODATE_DATE_CONT_SEPARATED : ISODATE_DATE_CONT;

  let numbers = twoDigits(c, this.consumeChar());
  let len = 2;
  let separator = -1;
  for (let i = 0; i < 4; i++) {
    c = this.consumeCharOrEnd(instructions);

    if (!c || c === ISODATE_TIMEINSTRUCTION) break;
    if (c === dateSeparator) {
      if (i > 0) throw this.createUnexpectedError();
      separator = i;
      continue;
    }

    numbers = numbers * 10 + digitValue(c);
    len++;
  }

  if (len === 3 && separator === -1) {
    return this.continueOrdinalDatePrecision(Y, numbers, c);
  }

  if (len === 4 && dateSeparator && separator !== 0) {
    throw new RangeError('Unbalanced ISO 8601 date separator');
  } else if (len === 2 && (!dateSeparator || separator === 0)) {
    throw new RangeError('Unbalanced ISO 8601 date separator');
  } else if (len === 3) {
    throw this.createUnexpectedError();
  }

  const pow = POW10[len - 2];
  const M = (this.result.M = ((numbers / pow) | 0) - 1);
  const D = (this.result.D = len === 2 ? 1 : numbers % pow);

  if (!validateDate(Y, M, D)) throw new RangeError(`Invalid ISO 8601 date "${this.source}"`);

  if (!c) return this;

  return this.continueFromTimeInstruction();
};

/**
 * Continue ordinal date precision
 * @param {number} Y year
 * @param {number} D ordinal day
 * @param {string} [next] next char if any
 */
ISODate.prototype.continueOrdinalDatePrecision = function continueOrdinalDatePrecision(Y, D, next) {
  if (!validateOrdinalDate(Y, D)) throw new RangeError(`Invalid ISO 8601 ordinal date "${this.source}"`);

  this.result.Y = Y;
  this.result.D = D;

  if (!next) return this;

  return this.continueFromTimeInstruction();
};

/**
 * Continue from week instruciton
 * @param {number} Y year
 */
ISODate.prototype.continueFromWeekInstruction = function continueFromWeekInstruction(Y) {
  const W = (this.result.W = twoDigits(this.consumeChar('012345'), this.consumeChar()));

  let c;
  if (this.enforceSeparators) {
    c = this.consumeCharOrEnd(ISODATE_HYPHEN);
    if (!c) {
      if (!validateWeek(Y, W)) throw new RangeError(`Invalid ISO 8601 week date "${this.source}"`);
      this.result.D = 1;
      return this;
    }
  }

  c = this.consumeCharOrEnd(ISODATE_WEEKDAYS);

  if (!c) {
    this.result.D = 1;
  } else {
    this.result.D = Number(c);
  }

  if (!validateWeek(Y, W)) throw new RangeError(`Invalid ISO 8601 week date "${this.source}"`);

  c = this.consumeCharOrEnd(ISODATE_TIMEINSTRUCTION);
  if (!c) return this;

  return this.continueFromTimeInstruction();
};

/**
 * Continue from time instruction
 */
ISODate.prototype.continueFromTimeInstruction = function continueFromTimeInstruction() {
  const H = (this.result.H = twoDigits(this.consumeChar(ISOTIME_STARTHOUR), this.consumeChar()));
  return this.continueTimePrecision(H);
};

/**
 * Consume minutes and seconds and so forth
 * @param {number} H from hour
 */
ISODate.prototype.continueTimePrecision = function continueTimePrecision(H) {
  if (H > 24) throw new RangeError(`Invalid ISO 8601 hours "${this.parsed}[${this.c}]" at ${this.idx}`);

  const midnight = H === 24;
  const firstChars = midnight ? '0' : ISOTIME_STARTPART;
  const numberChars = midnight ? '0' : NUMBERS;
  const timeSeparator = this.enforceSeparators ? ISOTIME_SEPARATOR : '';

  let startChars, contChars;
  if (midnight) {
    startChars = timeSeparator + firstChars;
    contChars = timeSeparator + ISOTIME_OFFSET + numberChars;
  } else if (timeSeparator) {
    startChars = ISOTIME_START_SEPARATED;
    contChars = ISOTIME_CONT_SEPARATED;
  } else {
    startChars = ISOTIME_STARTPART;
    contChars = ISOTIME_CONT;
  }

  /** @type {string | undefined} */
  let c = this.consumeChar(startChars);
  if (c === timeSeparator) {
    c = this.consumeChar(firstChars);
  } else if (this.enforceSeparators) {
    throw this.createUnexpectedError();
  }

  this.result.m = twoDigits(c, this.consumeChar(numberChars));

  c = this.consumeCharOrEnd(contChars);

  if (!c) {
    return this;
  } else if (c === ISOTIME_SEPARATOR) {
    c = this.consumeChar(ISOTIME_STARTPART);
  } else if (c === ISO_ZULU || isDatePrefix(c)) {
    return this.continueTimeZonePrecision(c);
  } else if (this.enforceSeparators) {
    throw this.createUnexpectedError();
  }

  this.result.S = twoDigits(c, this.consumeChar(numberChars));

  c = this.consumeCharOrEnd(ISOTIME_FRACTION_OR_OFFSET);
  if (!c) {
    return this;
  }

  if (isFraction(c)) {
    const fractionChars = midnight ? numberChars + ISOTIME_OFFSET : ISOTIME_CONT;
    const fractionStart = this.idx + 1;
    let F = digitValue(this.consumeChar(numberChars));
    let count = 1;
    while ((c = this.consumeCharOrEnd(fractionChars))) {
      if (!isDigit(c)) break;
      if (++count > 17) {
        throw new RangeError(`ISO 8601 date fraction "${this.parsed}[${c}]" at ${this.idx} exceeds 17 digits`);
      }
      if (count <= 15) F = F * 10 + digitValue(c);
    }
    if (count <= 3) F = F * POW10[3 - count];
    else if (count <= 15) F = F / 10 ** (count - 3);
    else
      F = Number(
        this.source.substring(fractionStart, fractionStart + 3) + '.' + this.source.substring(fractionStart + 3, fractionStart + count),
      );
    this.result.F = F;
  }

  if (!c) {
    return this;
  }

  return this.continueTimeZonePrecision(c);
};

/**
 * Continue timezone offset parsing
 * @param {string} instruction timezone offset instruction
 */
ISODate.prototype.continueTimeZonePrecision = function continueTimeZonePrecision(instruction) {
  const z = (this.result.Z = instruction);

  let c = this.consumeCharOrEnd(ISOTIME_STARTHOUR);
  if (c && z === ISO_ZULU) throw this.createUnexpectedError();
  else if (!c) return this;

  this.result.OH = twoDigits(c, this.consumeChar(c === '2' ? '0123' : NUMBERS));

  c = this.consumeCharOrEnd(ISOTIME_START_SEPARATED);
  if (!c) return this;

  if (c === ISOTIME_SEPARATOR) {
    c = this.consumeChar(ISOTIME_STARTPART);
  }

  this.result.Om = twoDigits(c, this.consumeChar());

  c = this.consumeCharOrEnd(ISOTIME_START_SEPARATED);
  if (!c) return this;

  if (c === ISOTIME_SEPARATOR) {
    c = this.consumeChar(ISOTIME_STARTPART);
  }

  this.result.OS = twoDigits(c, this.consumeChar());

  return this.end();
};

ISODate.prototype.consume = function consume() {
  return (this.c = this.source[++this.idx]);
};

/**
 * Consume next char
 * @param {string} [valid] defaults to number char
 */
ISODate.prototype.consumeChar = function consumeChar(valid = NUMBERS) {
  const c = this.consume();
  if (valid === NUMBERS ? !isDigit(c) : valid.indexOf(c) === -1) throw this.createUnexpectedError();
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
 * @param {string} valid Valid chars
 * @returns {string | undefined}
 */
ISODate.prototype.consumeCharOrEnd = function consumeCharOrEnd(valid) {
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
 * ISO 8601 duration parser
 * @param {string} source
 * @param {number} [offset]
 */
export function ISODuration(source, offset = -1) {
  this.source = source;
  this.idx = offset > -1 ? Number(offset) : -1;
  /** @type {keyof import('types').ISOParts | undefined} */
  this.designator = undefined;
  /** @internal parsed value placeholder */
  this._value = '';
  /** @internal current designator type */
  this._type = '';
  this.usedFractions = false;
  this.fractionedDesignator = undefined;
  this.designators = ISODURATION_DATE_DESIGNATORS;
  this.usedDesignators = '';
  /** @type {Partial<import('types').ISOParts>} */
  this.result = {};
  this.isDateIndifferent = true;
  /** @internal */
  this[kIsParsed] = false;
}

Object.defineProperty(ISODuration.prototype, 'parsed', {
  /** @returns {string} parsed chars */
  get() {
    return this.source.substring(0, this.idx);
  },
});

/**
 * Parse ISO 8601 duration string
 * @param {string} source ISO 8601 duration
 * @param {number} [offset] Column offset
 */
ISODuration.parse = function parseDuration(source, offset) {
  const writer = new this(source, offset);
  writer.parse();
  return writer.result;
};

ISODuration.prototype.parse = function parseDuration() {
  if (this[kIsParsed]) {
    if (!this.result?.isValid) throw new RangeError(`Invalid ${this.constructor.name}`);
    return this;
  }
  this[kIsParsed] = true;

  const source = this.source;
  if (typeof source !== 'string') throw new TypeError('ISO 8601 duration must be a string');

  const start = this.idx + 1;
  const first = source[start];
  if (first !== ISOINTERVAL_DURATION) {
    this.idx = first ? start : start + 1;
    throw this.createUnexpectedError(first);
  }

  for (let i = start, len = source.length; i < len; i++) {
    const c = source[i];
    if (c === ISOINTERVAL_SEPARATOR) break;
    this.write(c);
  }
  this.end();

  this.result.isValid = true;

  return this;
};

ISODuration.prototype.toISOString = function durationToISOString() {
  this.parse();

  const result = this.result;

  let isoString = 'P';
  for (const designator of ISODURATION_DATE_DESIGNATORS) {
    // @ts-ignore
    const v = result[designator];
    if (v) {
      isoString += v.toString() + designator;
    }
  }

  let time = 'T';
  for (const designator of ISODURATION_TIME_DESIGNATORS) {
    if (designator === 'M') {
      // eslint-disable-next-line no-var
      var v = result.m;
    } else {
      // @ts-ignore
      v = result[designator];
    }
    if (v) {
      time += v.toString() + designator;
    }
  }

  if (time[1]) isoString += time;

  return isoString;
};

ISODuration.prototype.toJSON = function durationToJSON() {
  try {
    return this.toISOString();
  } catch {
    return null;
  }
};

ISODuration.prototype.toString = function durationToString() {
  try {
    return this.toISOString();
  } catch {
    return `Invalid ${this.constructor.name}`;
  }
};

/**
 * Write
 * @param {string | undefined} c ISO 8601 character
 */
ISODuration.prototype.write = function writeDuration(c) {
  if (!c) {
    return this.end();
  }

  // idx tracks the column of the char being written, so parsed reflects consumed chars
  ++this.idx;

  if (this.fractionedDesignator) {
    throw new RangeError(
      'ISO 8601 duration fractions are allowed on the smallest unit in the string, e.g. P0.5D or PT1.001S but not P0.5DT1H',
    );
  }

  let designatorIdx;
  if (isDigit(c)) {
    this._value += c;
    if (this._value.length > (this.usedFractions ? 18 : 17)) {
      throw new RangeError(`ISO 8601 duration value "${this.parsed}[${c}]" at ${this.idx} exceeds 17 digits`);
    }
  } else if ((designatorIdx = this.designators.indexOf(c)) > -1) {
    this.designators = this.designators.slice(designatorIdx + 1);
    // @ts-ignore
    this.designator = c;
    this.setDesignatorValue(c, this._value);
  } else if (isFraction(c)) {
    this.usedFractions = true;
    this._value += '.';
  } else if (c === ISOINTERVAL_DURATION && !this._type) {
    this._type = c;
  } else if (c === ISODATE_TIMEINSTRUCTION && this._type === ISOINTERVAL_DURATION) {
    this.designators = ISODURATION_TIME_DESIGNATORS;
    this._type = c;
  } else {
    throw this.createUnexpectedError(c);
  }
};

/**
 * @internal
 * Set duration designator and value
 * @param {string} designator
 * @param {string} value
 */
ISODuration.prototype.setDesignatorValue = function setDesignatorValue(designator, value) {
  this.designator = undefined;
  this._value = '';

  const designatorKey = designator === 'M' && this._type === ISODATE_TIMEINSTRUCTION ? 'm' : designator;
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
 */
ISODuration.prototype.end = function end() {
  // advance idx past the last consumed char so parsed includes it
  this.idx++;
  if (this._value || !this.usedDesignators) {
    throw this.createUnexpectedError('');
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
 * @returns duration in milliseconds from start date
 */
ISODuration.prototype.toMilliseconds = function toMilliseconds(startDate, repetition = 1) {
  startDate = startDate ?? NONLEAPYEAR;

  return this.getExpireAt(startDate, repetition).getTime() - startDate.getTime();
};

/**
 * Get duration in milliseconds until optional end date
 * @param {Date} [endDate] end date, defaults to epoch start 1970-01-01T00:00:00Z
 * @param {number} [repetition] repetition
 * @returns duration in milliseconds from end date
 */
ISODuration.prototype.untilMilliseconds = function untilMilliseconds(endDate, repetition = 1) {
  endDate = endDate ?? NONLEAPYEAR;
  return this.getStartAt(endDate, repetition).getTime() - endDate.getTime();
};

/**
 * Calculate date indifferent duration milliseconds
 * @param {number} [repetitions] repetitions
 * @returns number of date indifferent milliseconds
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
 */
ISODuration.prototype.createUnexpectedError = function createUnexpectedError(c) {
  // idx is at the unexpected char, or one past the last consumed char at EOL
  const column = c ? this.idx : this.idx - 1;
  return new RangeError(`Unexpected ISO 8601 duration character "${this.parsed}[${c ? c : 'EOL'}]" at ${column}`);
};

/**
 *
 * @param {Date} [date]
 * @param {number} [repetitions]
 * @param {boolean} [useUtc] UTC
 * @returns new date with applied duration
 */
ISODuration.prototype.applyDuration = function applyDuration(date, repetitions = 1, useUtc = false) {
  date = date ?? new Date();

  const indifferentMs = this.getDateIndifferentMilliseconds(repetitions);

  const ms = date.getTime();

  let nextDt = new Date(ms + indifferentMs);

  if (!this.isDateIndifferent) {
    nextDt = this.applyDateDuration(nextDt, repetitions, useUtc);
  }

  if (isNaN(nextDt.getTime())) throw new RangeError(`ISO duration rendered an invalid date`);

  return nextDt;
};

/**
 * Apply date duration
 * @param {Date} fromDate apply to date
 * @param {number} [repetitions] repetitions
 * @param {boolean} [useUtc] UTC
 * @returns new date with applied duration
 */
ISODuration.prototype.applyDateDuration = function applyDateDuration(fromDate, repetitions = 1, useUtc = false) {
  let endTime = fromDate.getTime();

  /** @type {any} */
  const result = this.result;

  for (const designator of 'YMWD') {
    if (!(designator in result)) continue;

    let value = repetitions * result[designator];
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

    if (this.fractionedDesignator !== designator) {
      setter.call(toDate, current + value);
      endTime += toDate.getTime() - fromDate.getTime();
    } else {
      const fullValue = ~~value;
      if (fullValue) {
        setter.call(toDate, current + fullValue);
        endTime += toDate.getTime() - fromDate.getTime();
      }

      const fraction = new Date(endTime);
      setter.call(fraction, getter.call(fraction) + repetitions);

      endTime += repetitions * (fraction.getTime() - toDate.getTime()) * (value - fullValue);
    }

    if (isNaN(endTime)) throw new RangeError(`ISO duration rendered an invalid date when applying ${designator}`);
  }

  return new Date(endTime);
};

/**
 * Get date designator getter and setter;
 * @internal
 * @param {string} designator
 * @param {boolean} useUtc
 */
ISODuration.prototype._getDateFns = function getDateFns(designator, useUtc) {
  const fns = useUtc ? dateUTCFns : dateLocalFns;
  // @ts-ignore
  return fns[designator];
};

/**
 * @param {Date} date
 * @param {Date} compareTo
 * @param {ISODuration} duration
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
function ISODateDurationFunctions(date, duration, compareTo, enforceUTC) {
  this.date = date;
  this.duration = duration;
  this.compareTo = compareTo;
  this.enforceUTC = enforceUTC;
}

/**
 * Add duration to date
 * @param {number} [repetitions] repetition
 */
ISODateDurationFunctions.prototype.addDuration = function addDuration(repetitions = 1) {
  const diff = this.compareTo.getTime() - this.date.getTime();
  const q = diff / this.duration.toMilliseconds();

  if (q < 0) return this.applyDuration(this.date);

  let qs = ~~q;

  if (qs >= repetitions) return this.applyDuration(this.date, repetitions);

  let expireAt = this.applyDuration(this.date, ++qs);

  while (expireAt <= this.compareTo && qs < repetitions) {
    expireAt = this.applyDuration(this.date, ++qs);
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
    return this.applyDuration(endDate, iter + 1);
  }

  return this.applyDuration(endDate, repeat);
};

/**
 *
 * @param {Date} [date]
 * @param {number} [repetitions]
 * @returns new date with applied duration
 */
ISODateDurationFunctions.prototype.applyDuration = function applyDuration(date, repetitions = 1) {
  return this.duration.applyDuration(date, repetitions, this.enforceUTC);
};

/**
 * Parse ISO 8601 interval
 * @param {string} isoInterval ISO 8601 interval
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
export function parseInterval(isoInterval, enforceUTC) {
  return new ISOInterval(isoInterval, enforceUTC).parse();
}

/**
 * Parse ISO 8601 duration or interval to get duration
 * @param {string} isoDuration ISO 8601 duration or interval
 */
export function parseDuration(isoDuration) {
  return new ISOInterval(isoDuration).parse().duration;
}

/**
 * Parse ISO 8601 date
 * @param {string | Date | number} isoDateSource ISO 8601 date
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
export function getDate(isoDateSource, enforceUTC) {
  if (isoDateSource instanceof Date) return new Date(isoDateSource);
  else if (typeof isoDateSource === 'number') return new Date(isoDateSource);
  else if (!isoDateSource || typeof isoDateSource !== 'string') {
    throw new TypeError('ISO 8601 date source and must be a string');
  }

  return new ISODate(isoDateSource, { enforceUTC }).toDate();
}

/**
 * Interval expire at date
 * @param {string} isoInterval ISO 8601 interval
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @param {Date} [startDate] optional start date for use when only duration is present
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
export function getExpireAt(isoInterval, compareDate, startDate, enforceUTC) {
  return new ISOInterval(isoInterval, enforceUTC).getExpireAt(compareDate, startDate);
}

/**
 * Interval start at date
 * @param {string} isoInterval ISO 8601 interval
 * @param {Date} [compareDate] optional compare date, defaults to now
 * @param {Date} [endDate] optional end date for use when only duration is present
 * @param {boolean} [enforceUTC] enforce UTC if source lacks timezone offset
 */
export function getStartAt(isoInterval, compareDate, endDate, enforceUTC) {
  return new ISOInterval(isoInterval, enforceUTC).getStartAt(compareDate, endDate);
}

/**
 * Validate date parts
 * @param {number} Y year
 * @param {number} M javascript month
 * @param {number} D day of month
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
  }

  return false;
}

/**
 * Validate date parts
 * @param {number} Y year
 * @param {number} D day of month
 */
function validateOrdinalDate(Y, D) {
  if (!D || D > 366) return false;
  if (D < 366) return true;
  return D === getOrdinalDayOfYear(Y, 11, 31);
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
    W = getUTCLastWeekOfYear(--Y);
  } else if (W === 53 && getUTCLastWeekOfYear(Y) === 52) {
    Y++;
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
 * Char is 0-9
 * @param {string} [c]
 */
function isDigit(c) {
  if (c === undefined) return false;
  const code = c.charCodeAt(0);
  return code > 47 && code < 58;
}

/**
 * Digit char to number
 * @param {string} c digit char
 */
function digitValue(c) {
  return c.charCodeAt(0) - 48;
}

/**
 * Two digit chars to number
 * @param {string} c1 first digit char
 * @param {string} c2 second digit char
 */
function twoDigits(c1, c2) {
  return (c1.charCodeAt(0) - 48) * 10 + (c2.charCodeAt(0) - 48);
}

/**
 * Signed year from accumulated digits, sourced from string for years beyond safe integer precision
 * @param {string} source date source string
 * @param {string} sign year sign
 * @param {number} value accumulated year digits
 * @param {number} digitsStart source index of first year digit
 * @param {number} len number of year digits
 */
function signedYear(source, sign, value, digitsStart, len) {
  if (len < 16) return sign === ISODATE_HYPHEN ? -value : value;
  return Number(sign + source.substring(digitsStart, digitsStart + len));
}

/**
 * Char is ISO weekday 1-7
 * @param {string} c
 */
function isWeekday(c) {
  const code = c.charCodeAt(0);
  return code > 48 && code < 56;
}

/**
 * Char is date sign prefix +, -, or unicode minus
 * @param {string} [c]
 */
function isDatePrefix(c) {
  return c === '+' || c === ISODATE_HYPHEN || c === UNICODE_MINUS;
}

/**
 * Char is fraction separator . or ,
 * @param {string} [c]
 */
function isFraction(c) {
  return c === '.' || c === ',';
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
 * Get UTC date from week and weekday
 * @param {number} Y year
 * @param {number} D days from january first
 */
function getUTCDateFromOrdinalDate(Y, D) {
  return new Date(Date.UTC(Y, 0, D));
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
