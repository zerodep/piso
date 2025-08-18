import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  ISODate,
  getDate,
  parseInterval,
  getUTCLastWeekOfYear,
  getUTCWeekOneDate,
  getISOWeekString,
  getUTCWeekNumber,
} from '../src/index.js';
import { getDateFromParts } from './helpers.js';

const years = createRequire(fileURLToPath(import.meta.url))('./years.json');
const mappedYears = new Map(Object.entries(years));

const TZ = process.env.TZ;

describe('ISO week', () => {
  after(() => (process.env.TZ = TZ));

  [...mappedYears.entries()].forEach(([year, { w }]) => {
    const Y = Number(year);
    const wdLast = `${year}-W${w}-1`;
    const wdFirst = `${year}-W01-1`;
    const wdW01MidnightInTz = `${year}-W01-1T00:00:00.005+02`;
    const wdW01MidnightLocal = `${year}-W01-1T00:00:00`;
    const wdW01UTC = `${year}-W01-1T11:00:00.1Z`;

    ['Europe/Stockholm', 'America/Los_Angeles', 'Asia/Shanghai'].forEach((tz) => {
      describe(`anno ${year} in ${tz}`, () => {
        before(() => (process.env.TZ = tz));
        after(() => (process.env.TZ = TZ));

        it(`anno ${year} allows week ${w}`, () => {
          expect(ISODate.parse(wdLast)).to.deep.equal({ Y, W: w, D: 1, isValid: true });
        });

        it(`parses "${wdLast}" to date Monday`, () => {
          const dt = getDate(wdLast);
          expect(dt.getDay(), dt.toISOString()).to.equal(1);
          expect(dt.getHours(), dt.toISOString()).to.equal(0);
          expect(dt.getMinutes(), dt.toISOString()).to.equal(0);
          expect(dt.getSeconds(), dt.toISOString()).to.equal(0);
        });

        it(`parses "${wdFirst}" to date Monday`, () => {
          const dt = getDate(wdFirst);
          expect(dt.getDay(), dt.toISOString()).to.equal(1);
        });

        it(`parses "${wdW01MidnightInTz}" with timezone to timestamp`, () => {
          const dt = getDate(wdW01MidnightInTz);
          const monWeekOne = getUTCWeekOneDate(year);

          expect(dt, dt.toISOString()).to.deep.equal(new Date(monWeekOne.getTime() - 2 * 3600 * 1000 + 5));
        });

        it(`parses "${wdW01UTC}" to UTC timestamp`, () => {
          const dt = getDate(wdW01UTC);
          const monWeekOne = getUTCWeekOneDate(year);

          expect(dt, dt.toISOString()).to.deep.equal(new Date(monWeekOne.getTime() + 11 * 3600 * 1000 + 100));
        });

        /** In 17th century Sweden the timezone offset is 53 minutes and some (?) */
        /** In 18th century China the timezone offset off as well (?) */
        if (Y > 1999) {
          it(`parses "${wdW01MidnightLocal}" to local timestamp`, () => {
            const dt = getDate(wdW01MidnightLocal);

            expect(dt.getDay(), 'Monday').to.equal(1);
            expect(dt.getHours(), 'hours').to.equal(0);
            expect(dt.getMinutes(), 'minutes').to.equal(0);
            expect(dt.getSeconds(), 'seconds').to.equal(0);

            const monWeekOne = getUTCWeekOneDate(year);
            expect(dt, dt.toISOString()).to.deep.equal(new Date(monWeekOne.getTime() + dt.getTimezoneOffset() * 60000));
          });
        }

        it(`#getUTCWeekOneDate(${Y}) returns Monday week one date`, () => {
          const monWeekOne = getUTCWeekOneDate(Y);
          const weekdayDt = monWeekOne.getUTCDay();
          expect(weekdayDt, 'weekday').to.equal(1);

          const thuWeekOne = new Date(monWeekOne.getTime() + 3 * 24 * 3600 * 1000);

          expect(thuWeekOne.getUTCFullYear(), thuWeekOne.toISOString()).to.equal(Y);
        });

        it(`#getUTCLastWeekOfYear(${Y}) returns expected last week ${w}`, () => {
          const week = getUTCLastWeekOfYear(Y);
          expect(week).to.equal(w);
        });

        [`${year}-W14-2T12:01:30.005Z`, `${year}-W02-3`, `${year}-W04-1`, wdLast, wdFirst].forEach((wd) => {
          it(`#getISOWeekDate returns date as ISO week date ~ ${wd}`, () => {
            const isoDate = new ISODate(wd);
            const dt = isoDate.toDate();
            const isow = getISOWeekString(dt);
            expect(isow).to.match(/^\d{4}-W\d+-\dT/);
            expect(getDate(isow), isow).to.deep.equal(dt);
          });
        });

        it(`#getISOWeekDate UTC 28th of December returns week ${w}`, () => {
          const dt = new Date(`${year}-12-28T00:00:00Z`);
          expect(getISOWeekString(dt)).to.include(`-W${w}-`);
        });

        if (w === 52) {
          it(`anno ${year} throws if week is ${w + 1}`, () => {
            expect(() => {
              ISODate.parse(`${year}-W${w + 1}-1`);
            }).to.throw(RangeError, /(Unexpected|Invalid) ISO 8601 week date/i);
          });
        }
      });
    });
  });

  [
    ['2009-W01', { Y: 2009, W: 1, D: 1 }],
    ['2009W01', { Y: 2009, W: 1, D: 1 }],
    ['2009-W52', { Y: 2009, W: 52, D: 1 }],
    ['2009-W01-1', { Y: 2009, W: 1, D: 1 }],
    ['2009W011', { Y: 2009, W: 1, D: 1 }],
    ['2010-W01-1', { Y: 2010, W: 1, D: 1 }],
    ['2011-W01-1', { Y: 2011, W: 1, D: 1 }],
    ['2012-W01-1', { Y: 2012, W: 1, D: 1 }],
    ['2013-W01-1', { Y: 2013, W: 1, D: 1 }],
    ['2014-W01-1', { Y: 2014, W: 1, D: 1 }],
    ['2015-W01-1', { Y: 2015, W: 1, D: 1 }],
    ['2016-W01-1', { Y: 2016, W: 1, D: 1 }],
    ['2017-W01-1', { Y: 2017, W: 1, D: 1 }],
    ['2018-W01-1', { Y: 2018, W: 1, D: 1 }],
    ['2019-W01-1', { Y: 2019, W: 1, D: 1 }],
    ['2020-W01-1', { Y: 2020, W: 1, D: 1 }],
    ['2021-W01-1', { Y: 2021, W: 1, D: 1 }],
    ['2022-W01-1', { Y: 2022, W: 1, D: 1 }],
    ['2023-W01-1', { Y: 2023, W: 1, D: 1 }],
    ['2024-W40-5', { Y: 2024, W: 40, D: 5 }],
    ['2020-W53-2', { Y: 2020, W: 53, D: 2 }],
    ['2009-W53-7', { Y: 2009, W: 53, D: 7 }],
    ['2009-W01-1T08:06:30', { Y: 2009, W: 1, D: 1, H: 8, m: 6, S: 30 }],
    ['2009-W53-7T08:06:30.001', { Y: 2009, W: 53, D: 7, H: 8, m: 6, S: 30, F: 1 }],
    ['+2009-W53-7', { Y: 2009, W: 53, D: 7 }],
    ['-2009-W40-7', { Y: -2009, W: 40, D: 7 }],
    ['+010009-W01-1', { Y: 10009, W: 1, D: 1 }],
    ['-00002-W40-7', { Y: -2, W: 40, D: 7 }],
    ['−00002-W40-7', { Y: -2, W: 40, D: 7 }],
  ].forEach(([dt, expected]) => {
    it(`parse "${dt}" is parsed as expected`, () => {
      expect(ISODate.parse(dt)).to.deep.equal({ ...expected, isValid: true });
    });
  });

  [
    ['1942-W01-1', { Y: 1941, M: 11, D: 29 }],
    ['1942-W02-1', { Y: 1942, M: 0, D: 5 }],
    ['1942-W52-1', { Y: 1942, M: 11, D: 21 }],
    ['1942-W53-2', { Y: 1942, M: 11, D: 29 }],
    ['1942-W53-7', { Y: 1943, M: 0, D: 3 }],
    ['1943-W01-1', { Y: 1943, M: 0, D: 4 }],
    ['1943-W02-1', { Y: 1943, M: 0, D: 11 }],
    ['1943-W52-1', { Y: 1943, M: 11, D: 27 }],
    ['1943-W52-7', { Y: 1944, M: 0, D: 2 }],
    ['1976-W53-6', { Y: 1977, M: 0, D: 1 }],
    ['1976-W53-7', { Y: 1977, M: 0, D: 2 }],
    ['1977-W52-6', { Y: 1977, M: 11, D: 31 }],
    ['1977-W52-7', { Y: 1978, M: 0, D: 1 }],
    ['1978-W01-1', { Y: 1978, M: 0, D: 2 }],
    ['1978-W52-7', { Y: 1978, M: 11, D: 31 }],
    ['1979-W01-1', { Y: 1979, M: 0, D: 1 }],
    ['1979-W52-7', { Y: 1979, M: 11, D: 30 }],
    ['1980-W01-1', { Y: 1979, M: 11, D: 31 }],
    ['1980-W01-2', { Y: 1980, M: 0, D: 1 }],
    ['1980-W52-7', { Y: 1980, M: 11, D: 28 }],
    ['1981-W01-1', { Y: 1980, M: 11, D: 29 }],
    ['1981-W01-2', { Y: 1980, M: 11, D: 30 }],
    ['1981-W01-3', { Y: 1980, M: 11, D: 31 }],
    ['1981-W01-4', { Y: 1981, M: 0, D: 1 }],
    ['1981-W53-4', { Y: 1981, M: 11, D: 31 }],
    ['1981-W53-5', { Y: 1982, M: 0, D: 1 }],
    ['1981-W53-6', { Y: 1982, M: 0, D: 2 }],
    ['1981-W53-7', { Y: 1982, M: 0, D: 3 }],
    ['2009-W01-1', { Y: 2008, M: 11, D: 29 }],
    ['2009-W01-2', { Y: 2008, M: 11, D: 30 }],
    ['2009-W01-3', { Y: 2008, M: 11, D: 31 }],
    ['2009-W01-4', { Y: 2009, M: 0, D: 1 }],
    ['2009-W01-5', { Y: 2009, M: 0, D: 2 }],
    ['2009-W01-6', { Y: 2009, M: 0, D: 3 }],
    ['2009-W01-7', { Y: 2009, M: 0, D: 4 }],
    ['2009-W44-1', { Y: 2009, M: 9, D: 26 }],
    ['2009-W53-7', { Y: 2010, M: 0, D: 3 }],
    ['2024-W40-4', { Y: 2024, M: 9, D: 3 }],
    ['2024-W40-4T00:00Z', { Y: 2024, M: 9, D: 3, Z: 'Z' }],
    ['2024-W14-2T08:06:00', { Y: 2024, M: 3, D: 2, H: 8, m: 6 }],
    ['2024-W14-2T08:06:00+02', { Y: 2024, M: 3, D: 2, H: 8, m: 6, Z: '+', OH: 2 }],
    ['2024-W40-1T08:06:30Z', { Y: 2024, M: 8, D: 30, H: 8, m: 6, S: 30, Z: 'Z' }],
    ['2024-W40-7T08:06:00+02', { Y: 2024, M: 9, D: 6, H: 8, m: 6, Z: '+', OH: 2 }],
  ].forEach(([wd, expected]) => {
    it(`parses "${wd}" to expected date Date(${[expected.Y, expected.M, expected.D]})`, () => {
      expect(getDate(wd), wd).to.deep.equal(getDateFromParts(expected));
    });
  });

  describe('interval start and duration', () => {
    [
      ['2007-W09-7/P1Y2M10DT2H30M', { Y: 1, M: 2, D: 10, H: 2, m: 30 }],
      ['2007-W09-7/PT2H30M1.5S', { H: 2, m: 30, S: 1.5 }],
    ].forEach(([interval, expected]) => {
      it(`"${interval}" has the expected parsed start date and duration parts`, () => {
        const iso = parseInterval(interval);
        expect(iso.start.result).to.include({ Y: 2007, W: 9, D: 7 });
        expect(iso.duration.result).to.include(expected);
      });
    });
  });

  describe('interval start week and end week', () => {
    [
      ['2007-W01/W03-2', { Y: 2007, M: 0, D: 16 }],
      ['2007-W01-1/2', { Y: 2007, M: 0, D: 2 }],
      ['2007-W01/2', { Y: 2007, M: 0, D: 2 }],
      ['2007-W01/W03-2T12:00', { Y: 2007, M: 0, D: 16, H: 12, m: 0 }],
      ['2007-W01/2T12:00', { Y: 2007, M: 0, D: 2, H: 12, m: 0 }],
      ['2007-W01/2008-12-31', { Y: 2008, M: 11, D: 31 }],
      ['2007-W01/12-31', { Y: 2007, M: 11, D: 31 }],
      ['2007-W50-5T13:30/15:30', { Y: 2007, M: 11, D: 14, H: 15, m: 30 }],
      ['2007-W01/2007-W03-1', { Y: 2007, M: 0, D: 15 }],
      ['2009-W01/2009-W53-7', { Y: 2010, M: 0, D: 3 }],
    ].forEach(([interval, expected]) => {
      it(`"${interval}" returns expected end date`, () => {
        const iso = parseInterval(interval);

        const expectedEnd = getDateFromParts(expected);

        expect(iso.endDate, 'endDate').to.deep.equal(expectedEnd);
      });
    });

    ['2007-W03-1/W53', '2007W031/W53', '2007-W03-1/W00'].forEach((interval) => {
      it(`invalid partial week "${interval}" throws week RangeError`, () => {
        expect(() => parseInterval(interval)).to.throw(RangeError, /Invalid ISO 8601 week date/i);
      });
    });

    ['2007-W03-1/10', '2007W031/10'].forEach((interval) => {
      it(`invalid partial end date "${interval}" throws invalid partial RangeError`, () => {
        expect(() => parseInterval(interval)).to.throw(RangeError, /partial date/i);
      });
    });

    ['2007-W03-1/0', '2007-W03-1/8'].forEach((interval) => {
      it(`partial end date with invalid weekday throws unexpected RangeError`, () => {
        expect(() => parseInterval(interval)).to.throw(RangeError, /unexpected/i);
      });
    });
  });

  describe('invalid week source', () => {
    [
      '2008-W53-1',
      '2008-W53',
      '2008W53',
      '2009-W54-1',
      '2020-W59-1',
      '2020-W53-8',
      '2020-W53-0',
      '+020-W26-1',
      '+20-W26-1',
      '+2-W26-1',
      '+2025W341T0427Z',
    ].forEach((wd) => {
      it(`parse "${wd}" throws RangeError`, () => {
        expect(() => {
          ISODate.parse(wd);
        }).to.throw(RangeError, /(Unexpected|Invalid) ISO 8601/i);
      });
    });

    ['2025W321', '2025-W321', '2025W32-1', '-00001W01'].forEach((wd) => {
      it(`enforce separators throws if source lacks date separator when parsing "${wd}"`, () => {
        expect(() => {
          new ISODate(wd, { enforceSeparators: true }).parse();
        }).to.throw(RangeError, /Unexpected ISO 8601/i);
      });
    });
  });

  describe('#getISOWeekString', () => {
    it('returns week number of Saturday 5th November 2016 (leap year)', () => {
      expect(getISOWeekString(new Date(Date.UTC(2016, 10, 5)))).to.equal('2016-W44-6T00:00:00.000Z');
    });

    it('returns previous year if local date is passed - 2016-01-01', () => {
      expect(getISOWeekString(new Date(2016, 0, 1))).to.match(/^2015-W53-[45]/);
    });

    it('returns week of now if called without date arg', () => {
      expect(getISOWeekString()).to.match(/^\d+-W\d\d-\dT/);
    });

    it('returns Thursday first week 1970 if 0 is passed', () => {
      expect(getISOWeekString(0)).to.equal('1970-W01-4T00:00:00.000Z');
    });
  });

  describe('#getUTCWeekNumber', () => {
    it('returns week number of Saturday 5th November 2016 (leap year)', () => {
      expect(getUTCWeekNumber(new Date(Date.UTC(2016, 10, 5)))).to.deep.equal({ Y: 2016, W: 44, weekday: 6 });
    });

    it('returns previous year if local date is passed - 2016-01-01', () => {
      const weekLocal = getUTCWeekNumber(new Date(2016, 0, 1));
      expect(weekLocal).to.have.property('Y', 2015);
      expect(weekLocal).to.have.property('W', 53);
      expect(weekLocal).to.have.property('weekday').that.is.within(4, 5);
    });

    it('returns week number of now if called without date arg', () => {
      const weekNow = getUTCWeekNumber();
      expect(weekNow)
        .to.have.property('Y')
        .that.is.above(new Date().getUTCFullYear() - 1);
      expect(weekNow).to.have.property('W').that.is.within(1, 53);
      expect(weekNow).to.have.property('weekday').that.is.within(1, 7);
    });

    it('returns Thursday first week 1970 if 0 is passed', () => {
      expect(getUTCWeekNumber(0)).to.deep.equal({ Y: 1970, W: 1, weekday: 4 });
    });
  });
});
