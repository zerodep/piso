import { ISOInterval, ISODuration } from '../src/index.js';

describe('duration', () => {
  [
    ['P1Y', { Y: 1 }],
    ['PT0S', { S: 0 }],
    ['P0D', { D: 0 }],
    ['P1Y2M3W4DT5H6M7S', { Y: 1, M: 2, W: 3, D: 4, H: 5, m: 6, S: 7 }],
  ].forEach(([dur, expected]) => {
    it(`"${dur}" is parsed as expected`, () => {
      expect(ISODuration.parse(dur)).to.deep.equal(expected);
    });
  });

  [
    ['Last wednesday', /unexpected/i],
    ['P1 Y', /unexpected/i],
    ['PP', /unexpected/i],
    ['P1Y2M3W4DT0.5H6M0.7S', /fractions are allowed/i],
    ['P1Y2M3W4DP0.5H6M0.7S', /unexpected/i],
    ['PT7', /EOL/i],
    ['P', /EOL/i],
    ['R/', /start character/i],
  ].forEach(([dur, expected]) => {
    it(`invalid "${dur}" throws`, () => {
      expect(() => {
        ISODuration.parse(dur);
      }, dur).to.throw(expected);
    });
  });

  describe('write(c)', () => {
    it('ends parsing when falsy character appear', () => {
      const dur = 'PT0.1S';
      const writer = new ISODuration();
      for (let i = 0; i <= dur.length; i++) {
        writer.write(dur[i], i);
      }

      expect(writer.result).to.have.property('S', 0.1);
    });
  });

  describe('toMilliseconds', () => {
    [
      ['PT1M5S', 65000],
      ['PT1M0.5S', 60500],
      ['PT0.5S', 500],
      ['PT0.01S', 10],
      ['PT0.001S', 1],
      ['PT0.0001S', 0],
      ['PT0.5M', 30000],
      ['PT0.5H', 1800000],
      ['PT1.5H', 5400000],
      ['P0.5D', 43200000],
      ['P1W', 7 * 24 * 3600 * 1000],
      ['P0.5W', 3.5 * 24 * 3600 * 1000],
      ['P0.5M', 15.5 * 24 * 3600 * 1000],
      ['P0.5D', 12 * 3600 * 1000],
      ['P1Y', Date.UTC(1971, 0, 1)],
      ['P1Y2M3W4DT5H6M7S', 38811967000],
      ['PT0S', 0],
      ['P0D', 0],
    ].forEach(([dur, expected]) => {
      it(`"without start date ${dur}" returns expected milliseconds ${expected} from epoch`, () => {
        const parser = new ISODuration(dur).parse();
        expect(parser.toMilliseconds()).to.deep.equal(expected);
      });
    });

    [
      '2020-01-01T00:00Z/P1M',
      '2020-02-01T00:00Z/P1M',
      '2020-02-01T00:00Z/P2M',
      '2020-02-01T00:00Z/P1Y2M',
      '2020-02-01T00:00Z/P1Y2M',
      '2020-01-01T00:00Z/P3Y1M',
    ].forEach((interval) => {
      it(`"${interval}" returns expected milliseconds from start date`, () => {
        const { startDate, duration } = new ISOInterval(interval).parse();
        const toDate = new Date(startDate);

        toDate.setUTCFullYear(toDate.getUTCFullYear() + (duration.result.Y ?? 0));
        toDate.setUTCMonth(toDate.getUTCMonth() + duration.result.M);

        expect(duration.toMilliseconds(startDate)).to.equal(toDate.getTime() - startDate.getTime());
      });
    });

    [
      ['2020-01-01T00:00Z/P0.1M', Math.round(3.1 * 24 * 3600 * 1000)],
      ['2020-01-01T00:00Z/P0.1Y', Math.round(36.6 * 24 * 3600 * 1000)],
      ['2020-01-01T00:00Z/P1.1M', Math.round((31 + 2.9) * 24 * 3600 * 1000)],
      ['2020-01-01T00:00Z/P3.1M', Math.round((31 + 29 + 31 + 3) * 24 * 3600 * 1000)],
      ['2020-01-01T00:00Z/P1.1Y', Math.round((366 + 36.5) * 24 * 3600 * 1000)],
      ['2020-02-01T00:00Z/P0.5M', Math.round(14.5 * 24 * 3600 * 1000)],
      ['2020-02-01T00:00Z/P0.2M', Math.round(5.8 * 24 * 3600 * 1000)],
      ['2020-02-01T00:00Z/P1Y0.2M', Math.round((366 + 5.6) * 24 * 3600 * 1000)],
      ['2020-02-01T00:00Z/P0.5Y', Math.round(183 * 24 * 3600 * 1000)],
      ['2020-02-01T00:00Z/P1Y0.5W', Math.round((366 + 3.5) * 24 * 3600 * 1000)],
      ['2020-02-01T00:00Z/P1Y0.5D', Math.round((366 + 0.5) * 24 * 3600 * 1000)],
      ['2019-02-01T00:00Z/P1Y0.5D', Math.round((365 + 0.5) * 24 * 3600 * 1000)],
      ['2019-02-01T00:00Z/P3Y0.5D', Math.round((366 + 365 + 365 + 0.5) * 24 * 3600 * 1000)],
      ['2019-02-01T00:00Z/PT0.5S', 500],
    ].forEach(([interval, expected]) => {
      it(`fractional "${interval}" returns expected milliseconds from start date`, () => {
        const { startDate, duration } = new ISOInterval(interval).parse();

        const ms = duration.toMilliseconds(startDate);

        expect(ms).to.equal(expected);
      });
    });

    it('ignores leap seconds', () => {
      const { startDate, duration } = new ISOInterval('1972-06-28T00:00Z/P3D').parse();

      const ms = duration.toMilliseconds(startDate);

      expect(ms).to.equal(3 * 24 * 3600 * 1000);
    });
  });

  describe('untilMilliseconds', () => {
    [
      ['PT1M5S', -65000],
      ['PT1M0.5S', -60500],
      ['PT0.5S', -500],
      ['PT0.01S', -10],
      ['PT0.001S', -1],
      ['PT0.0001S', 0],
      ['PT0.5M', -30000],
      ['PT0.5H', -1800000],
      ['PT1.5H', -5400000],
      ['P0.5D', -43200000],
      ['P1W', -1 * 7 * 24 * 3600 * 1000],
      ['P0.5W', -1 * 3.5 * 24 * 3600 * 1000],
      ['P0.5M', -1 * 15.5 * 24 * 3600 * 1000],
      ['P0.5D', -1 * 12 * 3600 * 1000],
      ['P1Y', -1 * Date.UTC(1971, 0, 1)],
      ['P1Y2M3W4DT5H6M7S', -38984767000],
      ['PT0S', 0],
      ['P0D', 0],
    ].forEach(([dur, expected]) => {
      it(`"without end date ${dur}" returns expected milliseconds ${expected} from epoch`, () => {
        const parser = new ISODuration(dur).parse();
        expect(parser.untilMilliseconds()).to.deep.equal(expected);
      });
    });

    [
      'P1M/2020-01-01T00:00Z',
      'P1M/2020-02-01T00:00Z',
      'P2M/2020-02-01T00:00Z',
      'P1Y2M/2020-02-01T00:00Z',
      'P1Y2M/2020-02-01T00:00Z',
      'P3Y1M/2020-01-01T00:00Z',
    ].forEach((interval) => {
      it(`"${interval}" returns expected milliseconds from end date`, () => {
        const { duration, endDate } = new ISOInterval(interval).parse();
        const untilDate = new Date(endDate);

        untilDate.setUTCFullYear(untilDate.getUTCFullYear() - (duration.result.Y ?? 0));
        untilDate.setUTCMonth(untilDate.getUTCMonth() - duration.result.M);

        expect(duration.untilMilliseconds(endDate)).to.equal(untilDate.getTime() - endDate.getTime());
      });
    });

    [
      ['P0.1M/2020-01-01T00:00Z', -1 * Math.round(3.1 * 24 * 3600 * 1000)],
      ['P0.5Y/2020-02-01T00:00Z', -1 * Math.round(182.5 * 24 * 3600 * 1000)],
      ['P0.1Y/2020-01-01T00:00Z', -1 * Math.round(36.5 * 24 * 3600 * 1000)],
      ['P1.1M/2020-01-01T00:00Z', -1 * Math.round((31 + 3) * 24 * 3600 * 1000)],
      ['P3.1M/2020-01-01T00:00Z', -1 * Math.round((31 + 30 + 31 + 3) * 24 * 3600 * 1000)],
      ['P1.1Y/2020-01-01T00:00Z', -1 * Math.round((365 + 36.5) * 24 * 3600 * 1000)],
      ['P0.5M/2020-02-01T00:00Z', -1 * Math.round(15.5 * 24 * 3600 * 1000)],
      ['P0.2M/2020-02-01T00:00Z', -1 * Math.round(6.2 * 24 * 3600 * 1000)],
      ['P1Y0.2M/2020-02-01T00:00Z', -1 * Math.round((365 + 6.2) * 24 * 3600 * 1000)],
      ['P1Y0.5W/2020-02-01T00:00Z', -1 * Math.round((365 + 3.5) * 24 * 3600 * 1000)],
      ['P1Y0.5D/2020-02-01T00:00Z', -1 * Math.round((365 + 0.5) * 24 * 3600 * 1000)],
      ['P1Y0.5D/2019-02-01T00:00Z', -1 * Math.round((365 + 0.5) * 24 * 3600 * 1000)],
      ['PT0.5S/2019-02-01T00:00Z', -500],
    ].forEach(([interval, expected]) => {
      it(`fractional "${interval}" returns expected milliseconds from end date`, () => {
        const { endDate, duration } = new ISOInterval(interval).parse();

        const ms = duration.untilMilliseconds(endDate);

        expect(ms).to.equal(expected);
      });
    });
  });
});
