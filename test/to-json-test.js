import { parseInterval, ISOInterval } from '@0dep/piso';

describe('to JSON and to ISO string', () => {
  describe('interval', () => {
    [
      ['R-1/P1M', 'R-1/P1M'],
      ['R/P1M', 'R-1/P1M'],
      ['P1,000001M', 'P1.000001M'],
      ['2007-03-01T13:00:00Z/P1Y2M10DT2H30M', '2007-03-01T13:00:00.000Z/P1Y2M10DT2H30M'],
      ['R2/2007-03-01T13:00:00Z/P1Y2M10DT2H30M', 'R2/2007-03-01T13:00:00.000Z/P1Y2M10DT2H30M'],
      ['R20/P2Y/2008-03-01T13:00:00Z', 'R20/P2Y/2008-03-01T13:00:00.000Z'],
      ['2007-12-12/2027-01-01', '2007-12-11T23:00:00.000Z/2026-12-31T23:00:00.000Z'],
      ['2007-12-12/13', '2007-12-11T23:00:00.000Z/2007-12-12T23:00:00.000Z'],
      ['R2/2024-02-03T08:06:30−02/PT1H', 'R2/2024-02-03T10:06:30.000Z/PT1H'],
      ['20240127T120001,001Z', '2024-01-27T12:00:01.001Z'],
    ].forEach(([itv, iso]) => {
      it(`${itv} toJSON and toISOString returns normalized interval string`, () => {
        const interval = new ISOInterval(itv);

        expect(interval.toISOString(), interval).to.equal(iso);
        expect(interval.toJSON(), interval).to.equal(iso);
      });

      it(`${itv} when serialized toJSON is used`, () => {
        const body = {
          interval: new ISOInterval(itv),
        };

        expect(JSON.stringify(body)).to.equal(`{"interval":"${iso}"}`);
      });

      it(`${itv} when deserialized and parsed the same result is returned`, () => {
        const body = JSON.stringify({
          interval: new ISOInterval(itv),
        });

        expect(parseInterval(JSON.parse(body).interval).toJSON()).to.equal(iso);
      });
    });

    it('#toJSON looses repetition if not needed', () => {
      const interval = new ISOInterval('R2/2007-03-01T13:00:00Z');
      expect(interval.toJSON()).to.equal('2007-03-01T13:00:00.000Z');
    });

    it('#toJSON looses date fraction precision since that is what JavaScript does', () => {
      const interval = new ISOInterval('R2/2007-03-01T13:00:30.1235Z/PT1.50M');
      expect(interval.toJSON()).to.equal('R2/2007-03-01T13:00:30.124Z/PT1.5M');
    });

    it('#toJSON returns null if invalid', () => {
      const interval = new ISOInterval('Last monday');
      expect(interval.toJSON()).to.be.null;
    });

    it('#toISOString throws if invalid', () => {
      expect(() => new ISOInterval('Until monday').toISOString()).to.throw(RangeError);
    });
  });
});
