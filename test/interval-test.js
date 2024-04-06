import * as ck from 'chronokinesis';

import { parseInterval, parseDuration, ISOInterval, getExpireAt, getStartAt } from '../src/index.js';
import { getDateFromParts } from './helpers.js';

describe('ISO 8601 interval', () => {
  after(ck.reset);

  describe('start at', () => {
    [
      ['2007-03-01T13:00:00Z/P2Y', { Y: 2007, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['2007-03-01T13:00Z/P2Y', { Y: 2007, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['2008-03-01T13:00:00Z/P2Y', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['2008-03-01/P2Y', { Y: 2008, M: 2, D: 1 }],
    ].forEach(([interval, expected]) => {
      it(`getStartAt("${interval}") with returns start date`, () => {
        const startAt = getStartAt(interval);
        expect(startAt).to.deep.equal(getDateFromParts(expected));
      });
    });

    [
      ['P2Y/2007-03-01T13:00:00Z', { Y: 2005, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['P2Y/2007-03-01T13:00Z', { Y: 2005, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['P2Y/2008-03-01T13:00:00Z', { Y: 2006, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['P2Y/2008-03-01', { Y: 2006, M: 2, D: 1 }],
    ].forEach(([interval, expected]) => {
      it(`getStartAt("${interval}") with end date returns end date with applied duration`, () => {
        const startAt = getStartAt(interval);
        expect(startAt).to.deep.equal(getDateFromParts(expected));
      });
    });

    [
      ['R2/2007-03-01T13:00:00Z/P2Y', { Y: 2009, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['R2/2007-03-01T13:00Z/P2Y', { Y: 2009, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['R2/2008-03-01T13:00:00Z/P2Y', { Y: 2010, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['R2/2008-01-01/P1M', { Y: 2008, M: 1, D: 1 }],
      ['R2/2008-03-01/P1M', { Y: 2008, M: 3, D: 1 }],
      ['R2/2008-03-01/P2Y', { Y: 2010, M: 2, D: 1 }],
    ].forEach(([interval, expected]) => {
      it(`getStartAt("${interval}") with repeat, start date has passed returns start date with first applied duration`, () => {
        const parsed = parseInterval(interval);

        ck.freeze(parsed.startDate.getTime());

        expect(getStartAt(interval), 'at start date').to.deep.equal(getDateFromParts(expected));

        ck.freeze(parsed.startDate.getTime() + 1);

        expect(getStartAt(interval), 'one ms beyond start date').to.deep.equal(getDateFromParts(expected));
      });

      it(`getStartAt("${interval}") first repeat has passed, start date returns start date with second applied duration`, () => {
        const parsed = parseInterval(interval);

        ck.freeze(parsed.startDate.getTime());

        const expireAt = getStartAt(interval);
        ck.freeze(expireAt);

        expect(expireAt).to.deep.equal(getDateFromParts(expected));
      });
    });

    [
      ['R3/P2Y/2007-03-01T13:00:00Z', { Y: 2003, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['R3/P2Y/2007-03-01T13:00Z', { Y: 2009, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['R3/P2Y/2008-03-01T13:00:00Z', { Y: 2010, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['R3/P1M/2008-01-01', { Y: 2008, M: 1, D: 1 }],
      ['R3/P1M/2008-03-01', { Y: 2008, M: 3, D: 1 }],
      ['R3/P2Y/2008-03-01', { Y: 2010, M: 2, D: 1 }],
    ].forEach(([interval, expected]) => {
      it(`getStartAt("${interval}") with repeat, end date has NOT passed returns end date all applied durations`, () => {
        const parsed = parseInterval(interval);

        ck.freeze(Date.UTC(1990, 0, 1));

        const first = getStartAt(interval);
        expect(first, 'way before end date').to.deep.equal(getDateFromParts(expected));

        ck.freeze(first.getTime() - 1);

        expect(getStartAt(interval), 'one ms before first').to.deep.equal(getDateFromParts(expected));
      });

      it(`getStartAt("${interval}") first repeat has passed, end date returns start date with second applied duration`, () => {
        const parsed = parseInterval(interval);

        ck.freeze(parsed.endDate.getTime());

        const expireAt = getStartAt(interval);
        ck.freeze(expireAt);

        expect(expireAt).to.deep.equal(getDateFromParts(expected));
      });
    });

    it('with monthly-hourly repetitions, duration, and end date returns date relative to end date', () => {
      ck.freeze(Date.UTC(2024, 0, 27, 12, 0, 42, 12));

      const interval = 'R4/P1MT1H/2024-07-27T00:00Z';

      let startAt = getStartAt(interval);
      expect(startAt, 'first repetition').to.deep.equal(new Date(Date.UTC(2024, 3, 26, 21, 0)));

      ck.freeze(startAt);

      startAt = getStartAt(interval);
      expect(startAt, 'second repetition').to.deep.equal(new Date(Date.UTC(2024, 4, 26, 22, 0)));

      ck.freeze(startAt);

      startAt = getStartAt(interval);
      expect(startAt, 'third repetition').to.deep.equal(new Date(Date.UTC(2024, 5, 26, 23, 0)));

      ck.freeze(startAt);

      startAt = getStartAt(interval);
      expect(startAt, 'fourth repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));

      ck.freeze(startAt);

      startAt = getStartAt(interval);
      expect(startAt, 'after fourth repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));
    });
  });

  describe('expire at', () => {
    [
      ['P2Y/2007-03-01T13:00:00Z', { Y: 2007, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['P2Y/2007-03-01T13:00Z', { Y: 2007, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['P2Y/2008-03-01T13:00:00Z', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['P2Y/2008-03-01', { Y: 2008, M: 2, D: 1 }],
    ].forEach(([interval, expected]) => {
      it(`getExpireAt("${interval}") with end date returns end date`, () => {
        const expireAt = getExpireAt(interval);
        expect(expireAt).to.deep.equal(getDateFromParts(expected));
      });
    });

    [
      ['2007-03-01T13:00:00Z/P2Y', { Y: 2009, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['2007-03-01T13:00Z/P2Y', { Y: 2009, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['2008-03-01T13:00:00Z/P2Y', { Y: 2010, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['2008-03-01/P1M', { Y: 2008, M: 3, D: 1 }],
      ['2008-03-01/P2Y', { Y: 2010, M: 2, D: 1 }],
    ].forEach(([interval, expected]) => {
      it(`getExpireAt("${interval}") with start date and duration returns start date with applied duration`, () => {
        const expireAt = getExpireAt(interval);
        expect(expireAt).to.deep.equal(getDateFromParts(expected));
      });
    });

    [
      ['R2/2007-03-01T13:00:00Z/P2Y', { Y: 2009, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['R2/2007-03-01T13:00Z/P2Y', { Y: 2009, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['R2/2008-03-01T13:00:00Z/P2Y', { Y: 2010, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['R2/2008-03-01/P1M', { Y: 2008, M: 3, D: 1 }],
      ['R2/2008-03-01/P2Y', { Y: 2010, M: 2, D: 1 }],
    ].forEach(([interval, expected]) => {
      it(`getExpireAt("${interval}") with repeat, start date returns start date with first applied duration`, () => {
        const parsed = parseInterval(interval);

        ck.freeze(parsed.startDate.getTime());

        const expireAt = getExpireAt(interval);
        expect(expireAt).to.deep.equal(getDateFromParts(expected));
      });

      it(`getExpireAt("${interval}") first repeat has passed, start date returns start date with second applied duration`, () => {
        const parsed = parseInterval(interval);

        ck.freeze(parsed.startDate.getTime());

        const expireAt = getExpireAt(interval);
        ck.freeze(expireAt);

        expect(expireAt).to.deep.equal(getDateFromParts(expected));
      });
    });

    it('with duration returns duration applied to now', () => {
      ck.freeze(Date.UTC(2024, 3, 27));

      const expireAt = getExpireAt('P1M');
      expect(expireAt).to.deep.equal(new Date(Date.UTC(2024, 4, 27)));
    });

    it('with duration and passed start date returns duration applied to start date', () => {
      const expireAt = getExpireAt('P1M', new Date(Date.UTC(2024, 5, 27)));
      expect(expireAt).to.deep.equal(new Date(Date.UTC(2024, 6, 27)));
    });

    it('with repetitions and duration returns date compared to passed start date', () => {
      const startDate = ck.freeze(Date.UTC(2024, 3, 27));

      const interval = 'R3/P1M';

      let expireAt = getExpireAt(interval, startDate);
      expect(expireAt, 'first repetition').to.deep.equal(new Date(Date.UTC(2024, 4, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval, startDate);
      expect(expireAt, 'second repetition').to.deep.equal(new Date(Date.UTC(2024, 5, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval, startDate);
      expect(expireAt, 'third repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval, startDate);
      expect(expireAt, 'after third repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));
    });

    it('with repetitions, start date, and monthly duration returns date relative to start date', () => {
      ck.freeze(Date.UTC(2024, 0, 27, 12, 0, 42, 12));

      const interval = 'R3/2024-07-27T00:00Z/P1M';

      let expireAt = getExpireAt(interval);
      expect(expireAt, 'first repetition').to.deep.equal(new Date(Date.UTC(2024, 7, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'second repetition').to.deep.equal(new Date(Date.UTC(2024, 8, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'third repetition').to.deep.equal(new Date(Date.UTC(2024, 9, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'after third repetition').to.deep.equal(new Date(Date.UTC(2024, 9, 27)));
    });

    it('with three repetitions, monthly duration, and end date returns date relative to end date', () => {
      ck.freeze(Date.UTC(2024, 0, 27, 12, 0, 42, 12));

      const interval = 'R3/P1M/2024-07-27T00:00Z';

      let expireAt = getExpireAt(interval);
      expect(expireAt, 'first repetition').to.deep.equal(new Date(Date.UTC(2024, 4, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'second repetition').to.deep.equal(new Date(Date.UTC(2024, 5, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'third repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'after third repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));
    });

    it('with hourly repetitions, duration, and end date returns date relative to end date', () => {
      ck.freeze(Date.UTC(2024, 0, 27, 12, 0, 42, 12));

      const interval = 'R4/PT1H/2024-07-27T00:00Z';

      let expireAt = getExpireAt(interval);
      expect(expireAt, 'first repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 26, 21, 0)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'second repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 26, 22, 0)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'third repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 26, 23, 0)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'fourth repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'after fourth repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));
    });

    it('with yearly repetitions, duration, and end date returns date relative to end date', () => {
      ck.freeze(Date.UTC(1700, 0, 27, 12, 0, 42, 12));

      const interval = 'R200/P1Y/2024-07-27T00:00Z';

      for (let year = 1825; year < 2025; year++) {
        let expireAt = getExpireAt(interval);

        expect(expireAt, year).to.deep.equal(new Date(Date.UTC(year, 6, 27)));

        ck.freeze(expireAt);
      }

      expect(getExpireAt(interval), 'last repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));
    });

    it('with repeated monthly-hourly duration, and end date returns date relative to end date', () => {
      ck.freeze(Date.UTC(2024, 0, 27, 12, 0, 42, 12));

      const interval = 'R4/P1MT1H/2024-07-27T00:00Z';

      let expireAt = getExpireAt(interval);
      expect(expireAt, 'first repetition').to.deep.equal(new Date(Date.UTC(2024, 3, 26, 21, 0)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'second repetition').to.deep.equal(new Date(Date.UTC(2024, 4, 26, 22, 0)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'third repetition').to.deep.equal(new Date(Date.UTC(2024, 5, 26, 23, 0)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'fourth repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));

      ck.freeze(expireAt);

      expireAt = getExpireAt(interval);
      expect(expireAt, 'after fourth repetition').to.deep.equal(new Date(Date.UTC(2024, 6, 27)));
    });
  });

  describe('interval start date', () => {
    [
      ['2007-03-01T13:00:00Z/P1Y2M10DT2H30M', { Y: 2007, M: 2, D: 1, H: 13, m: 0, S: 0 }],
      ['2007-03-01T13:00Z/P1Y2M10DT2H30M', { Y: 2007, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['20070301T1300Z/P1Y2M10DT2H30M', { Y: 2007, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['2007-03-01T13:00+01/P1Y2M10DT2H30M', { Y: 2007, M: 2, D: 1, H: 13, m: 0, Z: '+' }],
      ['20070301T1300+01/P1Y2M10DT2H30M', { Y: 2007, M: 2, D: 1, H: 13, m: 0, Z: '+' }],
      ['2007-03-01/P1Y2M10DT2H30M', { Y: 2007, M: 2, D: 1 }],
      ['2008-03-01T13:00:00+01:00', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: '+', OH: 1, Om: 0 }],
      ['2008-03-01T13:00:00+0100', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: '+', OH: 1, Om: 0 }],
      ['2008-03-01T13:00:00+01:00:30', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: '+', OH: 1, Om: 0, OS: 30 }],
      ['2008-03-01T13:00:00+010030', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: '+', OH: 1, Om: 0, OS: 30 }],
      ['2008-03-01T24:00:00', { Y: 2008, M: 2, D: 1, H: 24, m: 0, S: 0 }],
    ].forEach(([interval, expected]) => {
      it(`"${interval}" has the expected parsed start date parts`, () => {
        const iso = parseInterval(interval);
        expect(iso.start.result).to.include(expected);
        expect(iso.parsed, 'parsed chars').to.equal(interval);
      });
    });

    it('with duration has the expected parsed start date chars', () => {
      const iso = parseInterval('2007-03-01T13:00+01/P1Y2M10DT2H30M');
      expect(iso.start.parsed, 'parsed start date chars', '2007-03-01T13:00+01');
      expect(iso.parsed, 'parsed chars').to.equal('2007-03-01T13:00+01/P1Y2M10DT2H30M');
    });
  });

  describe('interval start and duration', () => {
    [
      ['2007-03-01/P1Y2M10DT2H30M', { Y: 1, M: 2, D: 10, H: 2, m: 30 }],
      ['2007-03-01/PT2H30M1.5S', { H: 2, m: 30, S: 1.5 }],
    ].forEach(([interval, expected]) => {
      it(`"${interval}" has the expected parsed start date and duration parts`, () => {
        const iso = parseInterval(interval);
        expect(iso.start.result).to.include({ Y: 2007, M: 2, D: 1 });
        expect(iso.duration.result).to.include(expected);
      });
    });
  });

  describe('duration only', () => {
    [
      ['P1Y2M10DT2H30M', { Y: 1, M: 2, D: 10, H: 2, m: 30 }],
      ['PT2H30M1.5S', { H: 2, m: 30, S: 1.5 }],
    ].forEach(([interval, expected]) => {
      it(`parsed ${interval} has the expected duration`, () => {
        const iso = parseInterval(interval);
        expect(iso.duration.result).to.include(expected);
      });
    });
  });

  describe('interval start and end date', () => {
    [
      ['2007-01-01/2007-03-01T13:00:00Z', { Y: 2007, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['2007-01-01/2008-03-01T13:00:00Z', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['2007-01-01/2008-03-01T13:00Z', { Y: 2008, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['2007-01-01/2008-03-01T13:00:00+00', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: '+', OH: 0 }],
      ['2007-01-01/2008-03-01T13:00:00+01:00', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: '+', OH: 1, Om: 0 }],
      ['2007-01-01/01T13:00:30', { Y: 2007, M: 0, D: 1, H: 13, m: 0, S: 30 }],
      ['2007-01-01/01T13:00:30.1', { Y: 2007, M: 0, D: 1, H: 13, m: 0, S: 30, F: 100 }],
      ['2007-01-01/01T13:00-03', { Y: 2007, M: 0, D: 1, H: 13, m: 0, Z: '-', OH: 3 }],
      ['2007-01-01/01T13:00:30.42', { Y: 2007, M: 0, D: 1, H: 13, m: 0, S: 30, F: 420 }],
      ['2007-01-01/01T13:00:30.1-03', { Y: 2007, M: 0, D: 1, H: 13, m: 0, S: 30, F: 100, Z: '-', OH: 3 }],
      ['2007-01-01/2008-03', { Y: 2008, M: 2, D: 1 }],
      ['2007-01-01/2008-03-02', { Y: 2008, M: 2, D: 2 }],
      ['2007-01-01/2008-03-01T13:00-03:30', { Y: 2008, M: 2, D: 1, H: 13, m: 0, Z: '-', OH: 3, Om: 30 }],
      ['2007-03-01/31', { Y: 2007, M: 2, D: 31 }],
      ['2007-02-01/28', { Y: 2007, M: 1, D: 28 }],
      ['2020-02-01/29', { Y: 2020, M: 1, D: 29 }],
      ['2019-02-01/2020-02-29', { Y: 2020, M: 1, D: 29 }],
      ['2007-04-01/30', { Y: 2007, M: 3, D: 30 }],
      ['2007-01-01/31', { Y: 2007, M: 0, D: 31 }],
      ['2007-01-01/02-28', { Y: 2007, M: 1, D: 28 }],
      ['2007-01-01/10', { Y: 2007, M: 0, D: 10 }],
      ['2007-01-01/02', { Y: 2007, M: 0, D: 2 }],
      ['2007-01-01/03T01:30', { Y: 2007, M: 0, D: 3, H: 1, m: 30 }],
      ['2007-01-01/03-14', { Y: 2007, M: 2, D: 14 }],
      ['2007-01-01/03-14T01:30', { Y: 2007, M: 2, D: 14, H: 1, m: 30 }],
    ].forEach(([interval, expected]) => {
      it(`"${interval}" has the expected parsed end date parts`, () => {
        const iso = parseInterval(interval);
        expect(iso.end.result).to.deep.equal(expected);
        expect(iso.parsed, 'parsed chars').to.equal(interval);
      });

      it(`"${interval}" returns expected start and end date`, () => {
        const iso = parseInterval(interval);

        const expectedStart = getDateFromParts(iso.start.result);
        const expectedEnd = getDateFromParts(iso.end.result);

        expect(iso.startDate, 'startDate').to.deep.equal(expectedStart);
        expect(iso.endDate, 'endDate').to.deep.equal(expectedEnd);
      });
    });

    it('parsed 2007-12-14T13:30/15:30 has the expected start and end date', () => {
      const iso = parseInterval('2007-12-14T13:30/15:30');
      expect(iso.start.result).to.include({ Y: 2007, M: 11, D: 14, H: 13, m: 30 });
      expect(iso.duration).to.be.undefined;
      expect(iso.end.result).to.deep.equal({ Y: 2007, M: 11, D: 14, H: 15, m: 30 });
    });

    it('parsed 2007-03-01T13:00:00Z/2008-05-11T15:30:00Z has the expected start and end date', () => {
      const iso = parseInterval('2007-03-01T13:00:00Z/2008-05-11T15:30:00Z');
      expect(iso.start.result).to.deep.equal({ Y: 2007, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' });
      expect(iso.duration).to.be.undefined;
      expect(iso.end.result).to.deep.equal({ Y: 2008, M: 4, D: 11, H: 15, m: 30, S: 0, Z: 'Z' });
    });

    it('parsed 2008-02-15/03-14 has the expected start and end date', () => {
      const iso = parseInterval('2008-02-15/03-14');
      expect(iso.start.result).to.deep.equal({ Y: 2008, M: 1, D: 15 });
      expect(iso.duration).to.be.undefined;
      expect(iso.end.result).to.deep.equal({ Y: 2008, M: 2, D: 14 });
    });

    it('parsed 2007-11-13/15 has the expected start and end date', () => {
      const iso = parseInterval('2007-11-13/15');
      expect(iso.start.result).to.deep.equal({ Y: 2007, M: 10, D: 13 });
      expect(iso.duration).to.be.undefined;
      expect(iso.end.result).to.deep.equal({ Y: 2007, M: 10, D: 15 });
    });

    it('parsed 2007-11-13T09:00/15T17:00 has the expected start and end date', () => {
      const iso = parseInterval('2007-11-13T09:00/15T17:00');
      expect(iso.start.result).to.deep.equal({ Y: 2007, M: 10, D: 13, H: 9, m: 0 });
      expect(iso.duration).to.be.undefined;
      expect(iso.end.result).to.deep.equal({ Y: 2007, M: 10, D: 15, H: 17, m: 0 });
    });

    it('parsed 2007-11-13T00:00/16T00:00 has the expected start and end date', () => {
      const iso = parseInterval('2007-11-13T00:00/16T00:00');
      expect(iso.start.result).to.deep.equal({ Y: 2007, M: 10, D: 13, H: 0, m: 0 });
      expect(iso.duration).to.be.undefined;
      expect(iso.end.result).to.deep.equal({ Y: 2007, M: 10, D: 16, H: 0, m: 0 });
    });

    ['2007-03-01/32', '2007-02-01/29', '2019-02-01/29', '2007-04-01/31', '2007-01-01/00', '2007-02-01/02-29', '2020-02-01/02-30'].forEach(
      (interval) => {
        it(`invalid partial end date in "${interval}" throws RangeError`, () => {
          expect(() => parseInterval(interval)).to.throw(RangeError, /partial date/i);
        });
      },
    );
  });

  describe('interval duration and end date', () => {
    [
      ['P2Y/2007-03-01T13:00:00Z', { Y: 2007, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['P2Y/2007-03-01T13:00Z', { Y: 2007, M: 2, D: 1, H: 13, m: 0, Z: 'Z' }],
      ['P2Y/2008-03-01T13:00:00Z', { Y: 2008, M: 2, D: 1, H: 13, m: 0, S: 0, Z: 'Z' }],
      ['P2Y/2008-03-01', { Y: 2008, M: 2, D: 1 }],
    ].forEach(([interval, expected]) => {
      it(`parsed ${interval} has the expected duration and end date`, () => {
        const iso = parseInterval(interval);
        expect(iso.duration.result).to.include({ Y: 2 });
        expect(iso.end.result).to.deep.equal(expected);
        expect(iso.parsed, 'parsed chars').to.equal(interval);
      });

      it(`getExpireAt("${interval}") returns expected`, () => {
        const endDate = getExpireAt(interval);
        expect(endDate).to.deep.equal(getDateFromParts(expected));
      });
    });
  });

  describe('repeat', () => {
    [
      ['R5/2008-03-01T13:00:00Z', 5],
      ['R20/2008-03-01T13:00:00Z', 20],
      ['R-1/2008-03-01T13:00:00Z', -1],
    ].forEach(([interval, expectedRepeat]) => {
      it(`parsed ${interval} has the expected repeat and start date`, () => {
        const iso = parseInterval(interval);
        expect(iso.repeat).to.equal(expectedRepeat);
        expect(iso.start.result).to.include({ Y: 2008, H: 13, Z: 'Z' });
        expect(iso.parsed).to.equal(interval);
      });

      it(`parsed ${interval} has type without repeat`, () => {
        const iso = parseInterval(interval);
        expect((iso.type | 1) === iso.type).to.be.false;
      });
    });

    [
      ['R3/P2Y/2007-03-01T13:00:00Z', 3],
      ['R20/P2Y/2008-03-01T13:00:00Z', 20],
      ['R-1/P2Y/2008-03-01T13:00:00Z', -1],
    ].forEach(([interval, expected]) => {
      it(`parsed ${interval} has the expected repeat duration and end date`, () => {
        const iso = parseInterval(interval);
        expect(iso.repeat, 'repeat').to.equal(expected);
        expect(iso.duration.result, 'duration').to.deep.equal({ Y: 2 });
        expect(iso.end.result, 'end').to.include({ M: 2, Z: 'Z' });
      });

      it(`parsed ${interval} has type with repeat`, () => {
        const iso = parseInterval(interval);
        expect((iso.type | 1) === iso.type).to.be.true;
      });
    });

    it('"R-1/P2Y" has repeat type', () => {
      const iso = parseInterval('R-1/P2Y');
      expect((iso.type & 1) === 1).to.be.true;
    });

    ['R3/2007-03-01T13:00:00Z/15:00', 'R1/P2Y', 'R0/P2Y'].forEach((interval) => {
      it(`"${interval}" has type without repeat`, () => {
        const iso = parseInterval(interval);
        expect((iso.type & 1) === 1).to.be.false;
      });
    });

    it('negative repeat above 1 throws range error', () => {
      expect(() => {
        parseInterval('R-2/P2Y/2008-03-01T13:00:00Z');
      }).to.throw(RangeError);
    });

    it('empty negative repeat throws range error', () => {
      expect(() => {
        parseInterval('R-/P2Y/2008-03-01T13:00:00Z');
      }).to.throw(RangeError);
    });
  });

  describe('invalid interval throws', () => {
    [undefined, null, '', 1, {}].forEach((interval) => {
      it(`invalid source type "${interval}" throws type error`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(TypeError);
      });
    });

    ['  ', 'Last wednesday', 'Past wednesday', 'Rather', 'R/And again', '2pac', '2024-03-08/R', '2024-03-00', 'R3//2027-02-01'].forEach(
      (interval) => {
        it(`non "${interval}" throws range error`, () => {
          expect(() => {
            parseInterval(interval);
          }).to.throw(RangeError);
        });
      },
    );

    ['2027-0101', '202701-01', '2027-01-01T1200', '2027-01-01T12:0000', '20270101T12:0000', '20270101T1200:00'].forEach((interval) => {
      it(`unbalanced separators in start date "${interval}" throws range error`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /unexpected/i);
      });
    });

    [
      '2007-12-12/2027-0101',
      '2007-12-12/202701-01',
      '2007-12-12/2027-01-01T1200',
      '2007-12-12/2027-01-01T12:0000',
      '2007-12-12/20270101T12:0000',
      '20071212/20270101T1200:00',
    ].forEach((interval) => {
      it(`unbalanced end date and time separator in "${interval}" throws range error`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /unexpected/i);
      });
    });

    ['2007-12-12/20270101T120000', '20071212/2027-01-01T12:00:00', '2007-12-12/13T1200', '20071212/12:00:00'].forEach((interval) => {
      it(`unbalanced start and end separator in "${interval}" throws range error`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /unexpected/i);
      });
    });

    ['R3/2023-12-11/PT2H/2008-03-01', '2023-12-11/PT2H/2008-03-01'].forEach((interval) => {
      it(`start, duration and end ${interval} interval is not allowed`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /combination/i);
      });
    });

    ['PT2H/15:30', 'PT2H/15', 'PT2H/15T12:00'].forEach((interval) => {
      it(`duration and partial end ${interval} interval is not allowed`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /unexpected/i);
      });
    });

    ['2019-02-01/29', '2019-02-01/29T12:30', '2019-02-01/13-29', '2019-02-01/2020-13', '2019-02-01/2021-02-29'].forEach((interval) => {
      it(`invalid end date "${interval}" interval throws`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /Invalid .* date/i);
      });
    });

    ['2019-02-28/01', '2019-02-28/01T12:30', '2019-02-28/01-29', '2019-02-01T03:00/01:00'].forEach((interval) => {
      it(`end date before start date "${interval}" interval throws`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /end date/i);
      });
    });

    ['2019-02-01/U', '2019-02-01/29U', '2019-02-01/03-29U', '2019-02-01/2020-03-29U'].forEach((interval) => {
      it(`unexpected end date "${interval}" char throws`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /unexpected/i);
      });
    });

    ['2019-02-01T12:30Z/02T25:30'].forEach((interval) => {
      it(`end relative invalid time ${interval} interval throws`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /Invalid ISO 8601 hours/i);
      });
    });

    ['2019-02-01T12:30Z/02T12:30+Z', '2019-02-01T12:30Z/02T12:30+25'].forEach((interval) => {
      it(`end relative invalid timezone offset ${interval} interval throws`, () => {
        expect(() => {
          parseInterval(interval);
        }).to.throw(RangeError, /unexpected/i);
      });
    });
  });

  describe('parseDuration', () => {
    it('Start and duration, such as "2007-03-01T13:00:00Z/P1Y2M10DT2H30M"', () => {
      expect(parseDuration('2007-03-01T13:00:00Z/P1Y2M10DT2H30M').result).to.deep.include({
        Y: 1,
        M: 2,
        D: 10,
        H: 2,
        m: 30,
      });
    });

    it('Duration and end, such as "P1Y2M10DT2H30M/2008-05-11T15:30:00Z"', () => {
      expect(parseDuration('P1Y2M10DT2H30M/2008-05-11T15:30:00Z').result).to.deep.include({
        Y: 1,
        M: 2,
        D: 10,
        H: 2,
        m: 30,
      });
    });

    it('Duration only, such as "P1Y2M10DT2H30M", with additional context information', () => {
      expect(parseDuration('P1Y2M10DT2H30M').result).to.deep.include({
        Y: 1,
        M: 2,
        D: 10,
        H: 2,
        m: 30,
      });
    });

    it('Repeat the interval of "P1Y2M10DT2H30M" five times starting at "2008-03-01T13:00:00Z"', () => {
      expect(parseDuration('R5/2008-03-01T13:00:00Z/P1Y2M10DT2H30M').result).to.deep.include({
        Y: 1,
        M: 2,
        D: 10,
        H: 2,
        m: 30,
      });
    });

    it('handles R/2017-01-01/P3M', () => {
      expect(parseDuration('R/2017-01-01/P3M').result).to.deep.include({
        M: 3,
      });
    });

    it('handles R-1/2017-01-01/P3M', () => {
      expect(parseDuration('R-1/2017-01-01/P3M').result).to.deep.include({
        M: 3,
      });
    });

    it('allows weeks', () => {
      expect(parseDuration('P1W').result).to.deep.include({
        W: 1,
      });
    });

    it('allows fractions', () => {
      expect(parseDuration('P1Y2M3DT4H5M0.6S').result).to.deep.include({
        Y: 1,
        M: 2,
        D: 3,
        H: 4,
        m: 5,
        S: 0.6,
      });
    });

    it('Fractions are allowed on the smallest unit in the string, e.g. P0.5D or PT1.0001S but not PT0.5M0.1S', () => {
      expect(parseDuration('P0.5D').result).to.deep.include({
        D: 0.5,
      });

      expect(parseDuration('PT1.0001S').result).to.deep.include({
        S: 1.0001,
      });

      expect(() => {
        parseDuration('PT0.5M0.1S');
      }).to.throw(RangeError);

      expect(() => {
        parseDuration('P1.2Y0.5M');
      }).to.throw(RangeError);

      expect(() => {
        parseDuration('P1.2YT0.1S');
      }).to.throw(RangeError);
    });

    it('invalid repeat duration throws', () => {
      expect(() => {
        parseDuration('R3P');
      }).to.throw(RangeError);
    });

    it('duration without designator throws', () => {
      expect(() => {
        parseDuration('P1');
      }).to.throw(RangeError);

      expect(() => {
        parseDuration('P1/15:30');
      }).to.throw(RangeError);

      expect(() => {
        parseDuration('PT1H2');
      }).to.throw(RangeError);

      expect(() => {
        parseDuration('PT1H2/15:30');
      }).to.throw(RangeError);
    });

    ['P1Y1D1M', 'PT1H1S1M'].forEach((interval) => {
      it(`duration ${interval} with flipped duration parts throws`, () => {
        expect(() => {
          parseDuration('P1Y1D1M');
        }).to.throw(RangeError);
      });
    });
  });

  describe('ISOInterval', () => {
    it('parse on parse returns the same', () => {
      const intervalParser = new ISOInterval('2007-03-01T13:00:00Z/P1Y2M10DT2H30M');

      expect(intervalParser.parse().start).to.equal(intervalParser.parse().start);
    });

    it('next on next returns the same', () => {
      const intervalParser = new ISOInterval('2007-03-01T13:00:00Z/P1Y2M10DT2H30M');

      expect(intervalParser.next()).to.deep.equal(intervalParser.next());
    });

    it('startDate contains parsed start date', () => {
      const intervalParserUTC = new ISOInterval('2007-03-01T13:00:00Z/P1Y2M10DT2H30M');
      const intervalParser = new ISOInterval('2007-03-01T13:00:00/P1Y2M10DT2H30M');

      expect(intervalParserUTC.parse().startDate, 'UTC').to.deep.equal(new Date(Date.UTC(2007, 2, 1, 13, 0)));
      expect(intervalParser.parse().startDate, 'local').to.deep.equal(new Date(2007, 2, 1, 13, 0));
    });

    it('unparsed return startDate and endDate as null', () => {
      expect(new ISOInterval('2007-03-01T13:00:00/P1Y2M10DT2H30M').startDate).to.be.null;
      expect(new ISOInterval('P1Y2M10DT2H30M/2007-03-01T13:00:00').endDate).to.be.null;
    });

    it('getDates(null) with repeat and duration returns dates calculated from now', () => {
      ck.freeze(Date.UTC(2024, 3, 24));
      const interval = new ISOInterval('R4/P1Y').parse();
      expect(interval.getDates()).to.deep.equal([
        new Date(Date.UTC(2025, 3, 24)),
        new Date(Date.UTC(2026, 3, 24)),
        new Date(Date.UTC(2027, 3, 24)),
        new Date(Date.UTC(2028, 3, 24)),
      ]);
    });

    it('getDates(fromDate) with repeat and duration returns dates calculated from passed date', () => {
      const interval = new ISOInterval('R5/P1Y');
      expect(interval.getDates(new Date(Date.UTC(2022, 3, 24)))).to.deep.equal([
        new Date(Date.UTC(2023, 3, 24)),
        new Date(Date.UTC(2024, 3, 24)),
        new Date(Date.UTC(2025, 3, 24)),
        new Date(Date.UTC(2026, 3, 24)),
        new Date(Date.UTC(2027, 3, 24)),
      ]);
    });

    it('getDates(fromDate) on getDates() returns the same since the list is cached', () => {
      ck.freeze(Date.UTC(2022, 3, 24));

      const interval = new ISOInterval('R5/P1Y');
      interval.getDates();

      expect(interval.getDates(new Date(Date.UTC(2028, 3, 24)))).to.deep.equal([
        new Date(Date.UTC(2023, 3, 24)),
        new Date(Date.UTC(2024, 3, 24)),
        new Date(Date.UTC(2025, 3, 24)),
        new Date(Date.UTC(2026, 3, 24)),
        new Date(Date.UTC(2027, 3, 24)),
      ]);
    });

    it('getDates() on getDates(fromDate) returns the same since the list is cached', () => {
      const interval = new ISOInterval('R5/P1Y');
      interval.getDates(new Date(Date.UTC(2022, 3, 24)));

      expect(interval.getDates()).to.deep.equal([
        new Date(Date.UTC(2023, 3, 24)),
        new Date(Date.UTC(2024, 3, 24)),
        new Date(Date.UTC(2025, 3, 24)),
        new Date(Date.UTC(2026, 3, 24)),
        new Date(Date.UTC(2027, 3, 24)),
      ]);
    });

    it('getDates() where start and end are equal returns only start', () => {
      ck.freeze(Date.UTC(2024, 3, 24));
      const interval = new ISOInterval('2007-03-01/2007-03-01').parse();
      expect(interval.getDates()).to.deep.equal([new Date(2007, 2, 1)]);
    });

    it('getDates() with repeat monthly interval and end date returns expected', () => {
      const interval = new ISOInterval('R12/P1M/2007-03-01T00:00Z').parse();

      expect(interval.getDates()).to.deep.equal([
        new Date(Date.UTC(2006, 3, 1)),
        new Date(Date.UTC(2006, 4, 1)),
        new Date(Date.UTC(2006, 5, 1)),
        new Date(Date.UTC(2006, 6, 1)),
        new Date(Date.UTC(2006, 7, 1)),
        new Date(Date.UTC(2006, 8, 1)),
        new Date(Date.UTC(2006, 9, 1)),
        new Date(Date.UTC(2006, 10, 1)),
        new Date(Date.UTC(2006, 11, 1)),
        new Date(Date.UTC(2007, 0, 1)),
        new Date(Date.UTC(2007, 1, 1)),
        new Date(Date.UTC(2007, 2, 1)),
      ]);
    });

    it('getDates() with repeat monthly plus one day interval and end date returns expected', () => {
      const interval = new ISOInterval('R12/P1M1D/2007-03-01T00:00Z').parse();

      expect(interval.getDates()).to.deep.equal([
        new Date(Date.UTC(2006, 2, 21)),
        new Date(Date.UTC(2006, 3, 22)),
        new Date(Date.UTC(2006, 4, 23)),
        new Date(Date.UTC(2006, 5, 24)),
        new Date(Date.UTC(2006, 6, 25)),
        new Date(Date.UTC(2006, 7, 26)),
        new Date(Date.UTC(2006, 8, 27)),
        new Date(Date.UTC(2006, 9, 28)),
        new Date(Date.UTC(2006, 10, 29)),
        new Date(Date.UTC(2006, 11, 30)),
        new Date(Date.UTC(2007, 0, 31)),
        new Date(Date.UTC(2007, 2, 1)),
      ]);
    });

    it('getDates() with repeat from start date and monthly plus one day duration returns expected', () => {
      const interval = new ISOInterval('R7/2007-02-01T00:00Z/P1M1D').parse();

      expect(interval.getDates()).to.deep.equal([
        new Date(Date.UTC(2007, 1, 1)),
        new Date(Date.UTC(2007, 2, 2)),
        new Date(Date.UTC(2007, 3, 3)),
        new Date(Date.UTC(2007, 4, 4)),
        new Date(Date.UTC(2007, 5, 5)),
        new Date(Date.UTC(2007, 6, 6)),
        new Date(Date.UTC(2007, 7, 7)),
      ]);
    });

    it('start date interval getDates() returns start date', () => {
      const interval = new ISOInterval('2024-03-24T00:00Z').parse();
      expect(interval.getDates()).to.deep.equal([new Date(Date.UTC(2024, 2, 24))]);
    });

    it('repeat and start date interval getDates() returns start date', () => {
      const interval = new ISOInterval('R3/2024-03-24T00:00Z').parse();
      expect(interval.getDates()).to.deep.equal([new Date(Date.UTC(2024, 2, 24))]);
    });

    it('repeat start and end date interval getDates() returns start and end date', () => {
      let interval = new ISOInterval('R3/2024-03-24T00:00Z/25T12:00Z').parse();
      expect(interval.getDates()).to.deep.equal([new Date(Date.UTC(2024, 2, 24)), new Date(Date.UTC(2024, 2, 25, 12, 0))]);
    });
  });
});
