const FRACTIONS = ',.';
const ISO_ZULU = 'Z';
const ISODATE_SEPARATOR = '-';
const ISODATE_TIMEINSTRUCTION = 'T';
const ISODURATION_DATE_ENTITIES = 'YMWD';
const ISODURATION_TIME_ENTITIES = 'HMS';
const ISOINTERVAL_DURATION = 'P';
const ISOINTERVAL_REPEAT = 'R';
const ISOINTERVAL_SEPARATOR = '/';
const ISOTIME_OFFSET = '+-' + ISO_ZULU;
const ISOTIME_SEPARATOR = ':';
const ISOTIME_STARTHOUR = '012';
const ISOTIME_STARTPART = '012345';
const NUMBERS = '0123456789';

/**
 * ISO 8601 interval parser
 * @param {string} source
 */
export function ISOInterval(source) {
  if (!source || typeof source !== 'string') throw new TypeError('ISO 8601 interval source is required and must be a string');
  this.source = source;
  this.c = '';
  this.parsed = '';
  this.idx = -1;
  this.repeat = -1;
  /** @type {Partial<import('types').ISODateParts> | undefined} */
  this.start = undefined;
  /** @type {Partial<import('types').ISOParts> | undefined} */
  this.duration = undefined;
  /** @type {Partial<import('types').ISODateParts> | undefined} */
  this.end = undefined;
}

/**
 * ISO 8601 interval parser
 * @returns {ISOInterval}
 */
ISOInterval.prototype.parse = function parseInterval() {
  let c = this.peek();
  if (c === ISOINTERVAL_REPEAT) {
    this.read();
    this.consumeRepeat();

    c = this.peek();
  }

  let enforceSeparators = false;
  if (NUMBERS.indexOf(c) > -1) {
    const dateParser = new ISODateParser(this.source, this.idx, ISOINTERVAL_SEPARATOR);
    this.start = dateParser.parse().result;
    this.idx = dateParser.idx;
    enforceSeparators = dateParser.enforceSeparators;
  } else if (c !== ISOINTERVAL_DURATION) {
    throw new RangeError(`Invalid ISO 8601 interval "${this.source}"`);
  }

  c = this.peek();

  if (c === ISOINTERVAL_DURATION) {
    this.idx++;
    const durationParser = new ISODurationParser(this.source, this.idx);
    this.duration = durationParser.parse().result;
    this.idx = durationParser.idx;
  }

  c = this.current();

  if (c === '/' && this.duration && !this.start) {
    const dateParser = new ISODateParser(this.source, this.idx);
    this.end = dateParser.parse().result;
    this.idx = dateParser.idx;
  } else if (c === '/' && this.start && !this.duration) {
    const dateParser = new ISODateParser(this.source, this.idx, undefined, enforceSeparators);
    // @ts-ignore
    this.end = dateParser.parsePartialDate(this.start.Y, this.start.M).result;
    this.idx = dateParser.idx;
  } else if (c) {
    throw new RangeError(`ISO 8601 interval "${this.source}" combination is not allowed`);
  }

  return this;
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
export function ISODateParser(source, offset = -1, endChars = '', enforceSeparators = false) {
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
}

/**
 * Parse passed source as ISO 8601 date time
 * @returns {ISODateParser}
 */
ISODateParser.prototype.parse = function parseISODate() {
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
ISODateParser.parse = function parseISODate(source, offset) {
  return new this(source, offset).parse().result;
};

/**
 * Parse partial relative date
 * @param {number} Y Year if year is not defined
 * @param {number} M JavaScript month if month is not defined
 * @returns {ISODateParser}
 */
ISODateParser.prototype.parsePartialDate = function parsePartialDate(Y, M) {
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
 * @returns {ISODateParser}
 */
ISODateParser.prototype.continueDatePrecision = function continueDatePrecision(Y) {
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
 * @returns {ISODateParser}
 */
ISODateParser.prototype.continueTimePrecision = function continueTimePrecision(H, useSeparator) {
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
    return this.continueISOTimeZonePrecision(c);
  } else if (useSeparator) {
    throw this.createUnexpectedError();
  }

  let value = c + this.consumeChar();

  c = this.consumeCharOrEnd(FRACTIONS + ISOTIME_OFFSET);
  if (!c) {
    this.result.S = Number(value);
    return this;
  }

  if (FRACTIONS.indexOf(c) > -1) {
    value += '.' + this.consumeChar();
    while ((c = this.consumeCharOrEnd(NUMBERS + ISOTIME_OFFSET))) {
      if (!c || NUMBERS.indexOf(c) === -1) break;
      value += c;
    }
  }

  this.result.S = Number(value);

  if (!c) {
    return this;
  }

  return this.continueISOTimeZonePrecision(c);
};

/**
 * Continue timezone offset parsing
 * @param {string} instruction timezone offset instruction
 * @returns {ISODateParser}
 */
ISODateParser.prototype.continueISOTimeZonePrecision = function continueISOTimeZonePrecision(instruction) {
  const z = (this.result.Z = instruction);

  let c = this.consumeCharOrEnd(ISOTIME_STARTHOUR);
  if (c && z === ISO_ZULU) throw this.createUnexpectedError();
  else if (!c) return this;

  this.result.OH = Number(c + this.consumeChar(c === '2' ? '0123' : NUMBERS));

  c = this.consumeCharOrEnd(ISOTIME_SEPARATOR + ISOTIME_STARTPART);
  if (!c) return this;

  if (c === ':') {
    c = this.consumeChar(ISOTIME_STARTPART);
  }

  this.result.Om = Number(c + this.consumeChar());

  return this;
};

ISODateParser.prototype.consume = function consume() {
  this.parsed += this.c;
  const c = (this.c = this.source[++this.idx]);
  return c;
};

ISODateParser.prototype.consumeChar = function consumeChar(valid = NUMBERS) {
  const c = this.consume();
  if (valid.indexOf(c) === -1) throw this.createUnexpectedError();
  return c;
};

ISODateParser.prototype.peek = function peek() {
  return this.source[this.idx + 1];
};

/**
 * Consume char or end
 * @param {string} [valid] Valid chars, defaults to 0-9
 * @returns {string | undefined}
 */
ISODateParser.prototype.consumeCharOrEnd = function consumeCharOrEnd(valid = NUMBERS) {
  const c = this.consume();
  if (c && this.endChars && this.endChars.indexOf(c) > -1) {
    return undefined;
  } else if (c && valid.indexOf(c) === -1) {
    throw this.createUnexpectedError();
  }
  return c;
};

ISODateParser.prototype.createUnexpectedError = function raiseUnexpectedError() {
  const c = this.c;
  return new RangeError(`Unexpected ISO 8601 date character "${this.parsed}[${c ? c : 'EOL'}]" at ${this.idx}`);
};

/**
 *
 * @param {string} source
 * @param {number} [offset=0]
 */
export function ISODurationParser(source, offset = 0) {
  this.source = source;
  this.idx = offset;
  this.type = '';
  this.parsed = '';
  /** @type {keyof import('types').ISOParts | undefined} */
  this.entity = undefined;
  this.value = '';
  this.usedFractions = false;
  this.entities = ISODURATION_DATE_ENTITIES;
  /** @type {Partial<import('types').ISOParts>} */
  this.result = {};
}

/**
 * Parse ISO 8601 duration string
 * @param {string} source ISO 8601 duration
 * @param {number} [offset=0] Column offset
 */
ISODurationParser.parse = function parseDuration(source, offset = 0) {
  const writer = new this(source, offset);
  writer.parse();
  return writer.result;
};

ISODurationParser.prototype.parse = function parseDuration() {
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
ISODurationParser.prototype.write = function writeDuration(c, column) {
  if (!c) {
    return this.end(column);
  }

  let entityIdx;
  if (NUMBERS.indexOf(c) > -1) {
    this.value += c;
  } else if ((entityIdx = this.entities.indexOf(c)) > -1) {
    this.entities = this.entities.slice(entityIdx + 1);
    // @ts-ignore
    this.entity = c;
    this.setEntity(c, this.value);
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
    this.entities = ISODURATION_TIME_ENTITIES;
    this.type = c;
  } else {
    throw new RangeError(`Unexpected ISO 8601 duration character "${this.parsed}[${c}]" at ${column}`);
  }

  this.parsed += c;
};

/**
 * @internal
 * Set duration entity type and value
 * @param {string} entity
 * @param {string} value
 */
ISODurationParser.prototype.setEntity = function setEntity(entity, value) {
  this.entity = undefined;
  this.value = '';

  if (entity === 'M' && this.type === ISODATE_TIMEINSTRUCTION) {
    this.result.m = Number(value);
  } else {
    // @ts-ignore
    this.result[entity] = Number(value);
  }
};

/**
 * Parse completed, no more chars
 * @param {number} column Current column
 */
ISODurationParser.prototype.end = function end(column) {
  if (this.value || this.parsed === ISOINTERVAL_DURATION || this.parsed === ISOINTERVAL_DURATION + ISODATE_TIMEINSTRUCTION) {
    throw new RangeError(`Unexpected ISO 8601 EOL at ${column}`);
  }
};

/**
 * Parse ISO 8601 interval
 * @param {string} isoInterval
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
  return intervalParser.parse().duration;
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
