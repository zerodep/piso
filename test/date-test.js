import { ISODate, getDate } from '../src/index.js';
import { getDateFromParts } from './helpers.js';

describe('ISO date', () => {
  it('parses date with timezone offset', () => {
    let dateString = '2007-04-05T12:30-02:00';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2007-04-05T14:30Z'));

    dateString = '2007-04-05T12:30+02:00';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2007-04-05T10:30Z'));
  });

  [
    ['2024-01-27', { Y: 2024, M: 0, D: 27 }],
    ['2024-02-28', { Y: 2024, M: 1, D: 28 }],
    ['2024-02-29', { Y: 2024, M: 1, D: 29 }],
    ['2020-02-29', { Y: 2020, M: 1, D: 29 }],
    ['2016-02-29', { Y: 2016, M: 1, D: 29 }],
    ['2024-01-31', { Y: 2024, M: 0, D: 31 }],
    ['2024-03-31', { Y: 2024, M: 2, D: 31 }],
    ['2024-04-30', { Y: 2024, M: 3, D: 30 }],
    ['2024-05-31', { Y: 2024, M: 4, D: 31 }],
    ['2024-06-30', { Y: 2024, M: 5, D: 30 }],
    ['2024-07-31', { Y: 2024, M: 6, D: 31 }],
    ['2024-08-31', { Y: 2024, M: 7, D: 31 }],
    ['2024-09-30', { Y: 2024, M: 8, D: 30 }],
    ['2024-10-31', { Y: 2024, M: 9, D: 31 }],
    ['2024-11-30', { Y: 2024, M: 10, D: 30 }],
    ['2024-12-31', { Y: 2024, M: 11, D: 31 }],
    ['+2024-12-31', { Y: 2024, M: 11, D: 31 }],
    ['2024-01', { Y: 2024, M: 0, D: 1 }],
    ['2024-12', { Y: 2024, M: 11, D: 1 }],
    ['20240127', { Y: 2024, M: 0, D: 27 }],
    ['2024-02-27T08:06:30', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30 }],
    ['2024-02-27T08:06:30.1', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30, F: 100 }],
    ['2024-02-27T08:06:30.01', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30, F: 10 }],
    ['2024-02-27T08:06:30.001', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30, F: 1 }],
    ['2024-02-27T08:06:30.0011', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30, F: 1.1 }],
    ['2024-02-27T08:06:30.0', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30, F: 0 }],
    ['2024-02-27T08:06:30,001', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30, F: 1 }],
    ['2024-02-27T08:06:30Z', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30, Z: 'Z' }],
    ['2024-02-03T08:06:30+02:00', { Y: 2024, M: 1, D: 3, H: 8, m: 6, S: 30, Z: '+', OH: 2, Om: 0 }],
    ['2024-02-03T08:06:30.5+02:00', { Y: 2024, M: 1, D: 3, H: 8, m: 6, S: 30, F: 500, Z: '+', OH: 2, Om: 0 }],
    ['20240203T080630+0200', { Y: 2024, M: 1, D: 3, H: 8, m: 6, S: 30, Z: '+', OH: 2, Om: 0 }],
    ['2024-02-03T08:06:30-02:30', { Y: 2024, M: 1, D: 3, H: 8, m: 6, S: 30, Z: '-', OH: 2, Om: 30 }],
    ['2024-02-03T08:06:30-0230', { Y: 2024, M: 1, D: 3, H: 8, m: 6, S: 30, Z: '-', OH: 2, Om: 30 }],
    ['2024-02-03T08:06:30-02', { Y: 2024, M: 1, D: 3, H: 8, m: 6, S: 30, Z: '-', OH: 2 }],
    ['2024-02-03T08:06:30−02', { Y: 2024, M: 1, D: 3, H: 8, m: 6, S: 30, Z: '\u2212', OH: 2 }],
    ['2025-01-01T12:00:42.01-02:00', { Y: 2025, M: 0, D: 1, H: 12, m: 0, S: 42, F: 10, Z: '-', OH: 2, Om: 0 }],
    ['2025-01-01T12:00:42.01+02:30', { Y: 2025, M: 0, D: 1, H: 12, m: 0, S: 42, F: 10, Z: '+', OH: 2, Om: 30 }],
    ['2025-01-01T12:00:42.01+02:30:30', { Y: 2025, M: 0, D: 1, H: 12, m: 0, S: 42, F: 10, Z: '+', OH: 2, Om: 30, OS: 30 }],
    ['2025-01-01T23:59', { Y: 2025, M: 0, D: 1, H: 23, m: 59 }],
    ['2025-01-01T24:00', { Y: 2025, M: 0, D: 1, H: 24, m: 0 }],
    ['2025-01-01T24:00:00', { Y: 2025, M: 0, D: 1, H: 24, m: 0, S: 0 }],
    ['2025-01-01T24:00:00.000', { Y: 2025, M: 0, D: 1, H: 24, m: 0, S: 0, F: 0 }],
    ['2025-01-01T24:00Z', { Y: 2025, M: 0, D: 1, H: 24, m: 0, Z: 'Z' }],
    ['2025-01-01T24:00+01', { Y: 2025, M: 0, D: 1, H: 24, m: 0, Z: '+', OH: 1 }],
    ['2025-01-01T24:00:00+01', { Y: 2025, M: 0, D: 1, H: 24, m: 0, S: 0, Z: '+', OH: 1 }],
    ['2025-01-01T24:00:00.00+01', { Y: 2025, M: 0, D: 1, H: 24, m: 0, S: 0, F: 0, Z: '+', OH: 1 }],
    ['+012025-01-01T00:00:00.00Z', { Y: 12025, M: 0, D: 1, H: 0, m: 0, S: 0, F: 0, Z: 'Z' }],
    ['+12025-01-01T00:00:00.00Z', { Y: 12025, M: 0, D: 1, H: 0, m: 0, S: 0, F: 0, Z: 'Z' }],
    ['-000001-01-01T00:00:00.00Z', { Y: -1, M: 0, D: 1, H: 0, m: 0, S: 0, F: 0, Z: 'Z' }],
    ['−000001-01-01T00:00:00.00Z', { Y: -1, M: 0, D: 1, H: 0, m: 0, S: 0, F: 0, Z: 'Z' }],
    ['20240127T1200', { Y: 2024, M: 0, D: 27, H: 12, m: 0 }],
    ['20240127T120001', { Y: 2024, M: 0, D: 27, H: 12, m: 0, S: 1 }],
    ['20240127T120001,001', { Y: 2024, M: 0, D: 27, H: 12, m: 0, S: 1, F: 1 }],
  ].forEach(([dt, expected]) => {
    it(`parse "${dt}" is parsed as expected`, () => {
      expect(ISODate.parse(dt)).to.deep.equal({ ...expected, isValid: true });
    });

    it(`getDate("${dt}") is parsed as expected`, () => {
      expect(getDate(dt).getFullYear()).to.equal(expected.Y);
    });

    it(`toDate() "${dt}" returns expected date`, () => {
      const parser = new ISODate(dt);

      expect(parser.toDate()).to.deep.equal(getDateFromParts(expected));
    });

    it(`new ISODate("${dt}").toJSON() returns parsed date to JSON`, () => {
      expect(new ISODate(dt).toJSON()).to.equal(getDateFromParts(expected).toJSON());
    });

    it(`enforce UTC with getDate("${dt}", true) returns UTC date if it lacks timezone`, () => {
      expect(getDate(dt, true)).to.deep.equal(getDateFromParts({ Z: 'Z', ...expected }));
    });

    it(`pass enforce UTC to parser returns UTC date if it lacks timezone`, () => {
      const parser = new ISODate(dt, { enforceUTC: true });

      const expectedDt = getDateFromParts({ Z: 'Z', ...expected });

      expect(parser.toDate(), 'toDate').to.deep.equal(expectedDt);
      expect(parser.toJSON(), 'toJSON').to.equal(expectedDt.toJSON());
      expect(parser.toISOString(), 'toISOString').to.equal(expectedDt.toISOString());
    });
  });

  it('toJSON() only parses once before returning JSON string', () => {
    const parser = new ISODate('2025-01-01T24:00:00+01').parse();
    expect(parser.toJSON()).to.equal('2025-01-01T23:00:00.000Z');
  });

  it('toJSON() returns null if invalid', () => {
    expect(new ISODate('a').toJSON()).to.equal(null);
  });

  it('toISOString() throws if invalid', () => {
    expect(() => new ISODate('a').toISOString()).to.throw(RangeError);
  });

  it('getDate(new Date()) returns cloned date', () => {
    const dt = new Date();

    expect(getDate(dt)).to.deep.equal(dt);
    expect(getDate(dt)).to.not.equal(dt);
  });

  it('getDate(new Date().toISOString()) returns date', () => {
    const dts = new Date().toISOString();

    expect(getDate(dts)).to.deep.equal(new Date(dts));
  });

  it('getDate(number) returns date', () => {
    expect(getDate(0)).to.deep.equal(new Date(0));

    const ms = Date.UTC(2024, 1, 32);
    expect(getDate(ms)).to.deep.equal(new Date(ms));
  });

  it('getDate(new Date()) returns cloned date', () => {
    const dt = new Date(0);

    expect(getDate(dt)).to.deep.equal(new Date(0));
    expect(getDate(dt)).to.not.equal(dt);
  });

  it('getDate(null | undefined | {}) throws range error', () => {
    expect(() => getDate(null)).to.throw(TypeError);
    expect(() => getDate(undefined)).to.throw(TypeError);
    expect(() => getDate({})).to.throw(TypeError);
    expect(() => getDate('')).to.throw(TypeError);
  });

  it('hour 24 returns expected date', () => {
    expect(getDate('2025-01-01T24:00:00.000')).to.deep.equal(new Date(2025, 0, 2));
    expect(getDate('2025-01-01T24:00:00.000Z')).to.deep.equal(new Date(Date.UTC(2025, 0, 2)));
    expect(getDate('2024-02-28T24:00:00.000+02')).to.deep.equal(new Date(Date.UTC(2024, 1, 28, 22, 0)));
  });

  it('enforce separators forces separators to be used', () => {
    expect(new ISODate('20070101', { enforceSeparators: false }).parse().result).to.deep.equal({ Y: 2007, M: 0, D: 1, isValid: true });
    expect(new ISODate('2007-01-01', { enforceSeparators: true }).parse().result).to.deep.equal({ Y: 2007, M: 0, D: 1, isValid: true });

    expect(() => {
      new ISODate('20070101', { enforceSeparators: true }).parse();
    }).to.throw(RangeError, /unexpected/i);

    expect(() => {
      new ISODate('2007-0101', { enforceSeparators: true }).parse();
    }).to.throw(RangeError, /unbalanced/i);
  });

  it('sources beyond year 9999 and BC enforces separators by default', () => {
    expect(() => {
      new ISODate('+120070101', { enforceSeparators: false }).parse();
    }).to.throw(RangeError, /unexpected/i);

    expect(() => {
      new ISODate('+12007-0101', { enforceSeparators: false }).parse();
    }).to.throw(RangeError, /unbalanced/i);

    expect(() => {
      new ISODate('-0001-0101', { enforceSeparators: false }).parse();
    }).to.throw(RangeError, /unbalanced/i);

    expect(() => {
      new ISODate('-0001-W011', { enforceSeparators: false }).parse();
    }).to.throw(RangeError, /unexpected/i);
  });

  it('signed year cannot handle more than 17 chars', () => {
    expect(() => {
      new ISODate('+' + new Array(18).fill(1).join('') + '-01-11', { enforceSeparators: false }).parse();
    }).to.throw(RangeError, /unexpected/i);
  });

  [
    ['2024-01-27', new Date(2024, 0, 27)],
    ['02-28', new Date(2024, 1, 28)],
    ['28', new Date(2024, 0, 28)],
    ['08:06', new Date(2024, 0, 1, 8, 6)],
    ['08:06:30', new Date(2024, 0, 1, 8, 6, 30)],
    ['28T08:06:30', new Date(2024, 0, 28, 8, 6, 30)],
    ['28T08:06:30Z', new Date(Date.UTC(2024, 0, 28, 8, 6, 30))],
    ['28T08:06:30+01', new Date(Date.UTC(2024, 0, 28, 7, 6, 30))],
    ['02-28T08:06:30-01', new Date(Date.UTC(2024, 1, 28, 9, 6, 30))],
    ['2025-02-28T08:06:30-01', new Date(Date.UTC(2025, 1, 28, 9, 6, 30))],
    ['+012025-01-15T08:06:30.00Z', new Date(Date.UTC(12025, 0, 15, 8, 6, 30))],
    ['+12025-02-16T08:06:30.00Z', new Date(Date.UTC(12025, 1, 16, 8, 6, 30))],
    ['-000001-01-28T08:06:30.00Z', new Date(Date.UTC(-1, 0, 28, 8, 6, 30))],
    ['−000001-02-18T08:06:30.00Z', new Date(Date.UTC(-1, 1, 18, 8, 6, 30))],
  ].forEach(([dt, expected]) => {
    it(`parse partial "${dt}" returns expected date`, () => {
      expect(new ISODate(dt, { enforceSeparators: true }).parsePartialDate(2024, 0, 1).toDate()).to.deep.equal(expected);
    });

    it(`parse partial "${dt}" parses once and returns expected date`, () => {
      const parser = new ISODate(dt, { enforceSeparators: true });
      parser.parsePartialDate(2024, 0, 1);
      parser.parsePartialDate(2024, 0, 1);
      expect(parser.toDate()).to.deep.equal(expected);
      expect(parser.toDate()).to.deep.equal(expected);
    });
  });

  ['02-30', '2023-366', '367', '2025318'].forEach((dt) => {
    it(`parse partial with enforce separators and invalid partial "${dt}" throws range error`, () => {
      expect(() => new ISODate(dt, { enforceSeparators: true }).parsePartialDate(2024, 0, 1)).to.throw(RangeError);
    });
  });

  ['0230', '2023366', '367', '2025-318'].forEach((dt) => {
    it(`parse partial without enforce separators and invalid partial "${dt}" throws range error`, () => {
      expect(() => new ISODate(dt, { enforceSeparators: false }).parsePartialDate(2024, 0, 1)).to.throw(RangeError);
    });
  });

  [
    'Last wednesday',
    '2024-22-12',
    '2024-13-01',
    '2024-00-01',
    '2024-01-00',
    '2024-12-42',
    '2023-01-32',
    '2023-02-31',
    '2023-02-29',
    '2018-02-29',
    '2018-03-00',
    '2018-03-01T24:01',
    '2018-03-01T24:00:01',
    '2018-03-01T24:00:00.001',
    '2018-03-01T24:00:01+02',
    '2024-01:27',
    '202401',
    '2024-13',
    '2024-',
    '2024-03-',
    '2024-1201',
    '202412-01',
    '20242212',
    '2024-12-32',
    '2024-02-123',
    '2025-02-1',
    '2025-02-1T12:00',
    '2025-1',
    '20251',
    '202402123',
    '20240127T12',
    '20240127T12:',
    '20240212T1200:00',
    '2024_02_23',
    '2018-03-01TB0:00:01',
    '2018-03-01A00:00:01',
    '2024-01-01T2008:06:30',
    '20240101T2006:30',
    '2024-01-01T20:0630',
    '2024-01-01T20:06:30.',
    '2024-01-01T20:06:30.01A',
    '2024-01T2008:06:30+',
    '2024-01T2008:06:30-Z',
    '2024-01-27T08:06:30A',
    '2024-01-27T08:06:30ZZ',
    '2024-01-27T08:06:30Z0',
    '2024-01-27T08:06:30+01:',
    '2024-01-27T08:06:30+24:00',
    '2024-01-32',
    '2024-03-32',
    '2024-04-31',
    '2024-05-32',
    '2024-06-31',
    '2024-07-32',
    '2024-08-32',
    '2024-09-31',
    '2024-10-32',
    '2024-11-31',
    '2024-12-32',
    '2024-13-01',
    '2100-02-29',
    '2401-02-29',
    '1-05-01',
    '01-05-01',
    '001-05-01',
    '-1-05-01',
    '-01-05-01',
    '-001-05-01',
    '+1-05-01',
    '+01-05-01',
    '+001-05-01',
    'Z0001-05-01',
  ].forEach((dt) => {
    it(`parse "${dt}" throws RangeError`, () => {
      expect(() => {
        ISODate.parse(dt);
      }).to.throw(RangeError, /(Unexpected|Invalid|Unbalanced) ISO 8601 date/i);
    });
  });

  it('parse on parse is ignored', () => {
    const isodate = new ISODate('2024-03-24');
    expect(isodate.parse()).to.equal(isodate.parse());
  });

  it('partial parse on parse is ignored', () => {
    const isodate = new ISODate('25');
    expect(isodate.parsePartialDate(2024, 3, 24).toDate()).to.deep.equal(isodate.parsePartialDate(2024, 3, 24).toDate());
  });

  it('partial parse on parse is ignored', () => {
    const isodate = new ISODate('25');
    expect(isodate.parsePartialDate(2024, 3, 24).toDate()).to.deep.equal(isodate.parsePartialDate(2024, 3, 24).toDate());
  });

  it('new Date("2024-03-26") returns UTC', () => {
    expect(new Date('2024-03-26')).to.not.deep.equal(getDate('2024-03-26'));
  });

  it('date time with minute designator and offset second designator is ok', () => {
    let dateString = '2007-04-05T12:30-02:00:30';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2007-04-05T14:30:30Z'));

    dateString = '2007-04-05T12:30+02:00:30';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2007-04-05T10:29:30Z'));
  });

  it('allows 17 fractions before throwing', () => {
    let dateString = '2007-04-05T12:30:01.12345678901234567+01';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2007-04-05T11:30:01.123Z'));

    dateString = '2007-04-05T12:30:30.123456789012345678-02';
    expect(() => getDate(dateString), dateString).to.throw(RangeError, /unexp/i);

    dateString = '2007-04-05T12:30:30.1234567890123456789-02';
    expect(() => getDate(dateString), dateString).to.throw(RangeError, /unexp/i);

    dateString = '2007-04-05T12:30:02.1234' + Array(1000).fill(1).join('') + '+02';
    expect(() => getDate(dateString), dateString).to.throw(RangeError, /unexp/i);
  });

  describe('leap years', () => {
    ['1600-02-29', '2000-02-29', '2400-02-29'].forEach((dt) => {
      it(`parse "${dt}" is ok`, () => {
        ISODate.parse(dt);
      });
    });

    ['1700-02-29', '2300-02-29', '2100-02-29'].forEach((dt) => {
      it(`parse "${dt}" throws RangeError`, () => {
        expect(() => {
          ISODate.parse(dt);
        }).to.throw(RangeError, /(Unexpected|Invalid) ISO 8601 date/i);
      });
    });
  });

  describe(ISODate.name, () => {
    it('#toString returns source', () => {
      const idt = new ISODate('2024-11-07').toString();
      expect(idt.toString()).to.equal('2024-11-07');
      expect(idt.toString()).to.equal('2024-11-07');
    });

    it('#toString for partial date returns parsed source', () => {
      const idt = new ISODate('2024-11-07').toString();
      expect(idt.toString()).to.equal('2024-11-07');
      expect(idt.toString()).to.equal('2024-11-07');
    });

    it('invalid interval #toString returns Invalid ISODate', () => {
      const idt = new ISODate('Today');
      expect(idt.toString()).to.equal('Invalid ISODate');
      expect(idt.toString()).to.equal('Invalid ISODate');
    });
  });
});
