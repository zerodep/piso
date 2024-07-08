import { ISODate, getDate } from '../src/index.js';

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
    ['2024-01', { Y: 2024, M: 0, D: 1 }],
    ['2024-12', { Y: 2024, M: 11, D: 1 }],
    ['20240127', { Y: 2024, M: 0, D: 27 }],
    ['2024-02-27T08:06:30', { Y: 2024, M: 1, D: 27, H: 8, m: 6, S: 30 }],
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
    ['20240127T1200', { Y: 2024, M: 0, D: 27, H: 12, m: 0 }],
    ['20240127T120001', { Y: 2024, M: 0, D: 27, H: 12, m: 0, S: 1 }],
    ['20240127T120001,001', { Y: 2024, M: 0, D: 27, H: 12, m: 0, S: 1, F: 1 }],
  ].forEach(([dt, expected]) => {
    it(`parse "${dt}" is parsed as expected`, () => {
      expect(ISODate.parse(dt)).to.deep.equal(expected);
    });

    it(`getDate("${dt}") is parsed as expected`, () => {
      expect(getDate(dt).getFullYear()).to.equal(expected.Y);
    });

    it(`toDate() "${dt}" returns expected date`, () => {
      const parser = new ISODate(dt);

      expect(parser.toDate()).to.deep.equal(getDateFromParts(expected));
    });
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

  it('getDate(number) returns cloned date', () => {
    const dt = new Date(0);

    expect(getDate(dt)).to.deep.equal(new Date(0));
    expect(getDate(dt)).to.not.equal(dt);
  });

  it('getDate(null | undefined, {}) throws range error', () => {
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
    expect(new ISODate('20070101', undefined, undefined, false).parse().result).to.deep.equal({ Y: 2007, M: 0, D: 1 });
    expect(new ISODate('2007-01-01', undefined, undefined, true).parse().result).to.deep.equal({ Y: 2007, M: 0, D: 1 });

    expect(() => {
      new ISODate('20070101', undefined, undefined, true).parse();
    }).to.throw(RangeError, /unexpected/i);

    expect(() => {
      new ISODate('2007-0101', undefined, undefined, true).parse();
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
  ].forEach(([dt, expected]) => {
    it(`parse partial "${dt}" returns expected date`, () => {
      expect(new ISODate(dt, -1, null, true).parsePartialDate(2024, 0, 1).toDate()).to.deep.equal(expected);
    });

    it(`parse partial "${dt}" parses once and returns expected date`, () => {
      const parser = new ISODate(dt, -1, null, true);
      parser.parsePartialDate(2024, 0, 1);
      parser.parsePartialDate(2024, 0, 1);
      expect(parser.toDate()).to.deep.equal(expected);
      expect(parser.toDate()).to.deep.equal(expected);
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
  ].forEach((dt) => {
    it(`parse "${dt}" throws RangeError`, () => {
      expect(() => {
        ISODate.parse(dt);
      }).to.throw(RangeError);
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
});

/**
 * @param {import('../types/interfaces.js').ISODateParts} parts
 */
function getDateFromParts(parts) {
  const args = [parts.Y, parts.M, parts.D, parts.H, parts.m, parts.S, parts.F].filter((p) => p !== undefined);
  if (parts.Z === 'Z') {
    return new Date(Date.UTC(...args));
  } else if (parts.Z === '-') {
    args[3] += parts.OH ?? 0;
    args[4] += parts.Om ?? 0;
    args[5] = (args[5] ?? 0) + (parts.OS ?? 0);
    return new Date(Date.UTC(...args));
  } else if (parts.Z === '+') {
    args[3] -= parts.OH ?? 0;
    args[4] -= parts.Om ?? 0;
    args[5] = (args[5] ?? 0) - (parts.OS ?? 0);
    return new Date(Date.UTC(...args));
  }
  return new Date(...args);
}
