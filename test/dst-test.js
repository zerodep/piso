import { getDate, getExpireAt, getStartAt, parseDuration } from '@0dep/piso';

// Tests run with TZ=Europe/Stockholm, see setup.js.
// Daylight saving time 2024 starts Sunday March 31 at 02:00 CET (01:00Z), when the clock jumps to 03:00 CEST,
// and ends Sunday October 27 at 03:00 CEST (01:00Z), when the clock goes back to 02:00 CET.

describe('daylight saving time', () => {
  describe('parsing local wall time', () => {
    it('a time in the spring forward gap resolves to the hour after the gap', () => {
      expect(getDate('2024-03-31T02:30')).to.deep.equal(new Date(Date.UTC(2024, 2, 31, 1, 30)));
      expect(getDate('2024-03-31T02:30').getHours()).to.equal(3);
    });

    it('an ambiguous time in the fall back overlap resolves to the first occurrence', () => {
      expect(getDate('2024-10-27T02:30')).to.deep.equal(new Date(Date.UTC(2024, 9, 27, 0, 30)));
    });

    it('an explicit offset is not subject to the local transition', () => {
      expect(getDate('2024-03-31T02:30+01:00')).to.deep.equal(new Date(Date.UTC(2024, 2, 31, 1, 30)));
      expect(getDate('2024-03-31T02:30+02:00')).to.deep.equal(new Date(Date.UTC(2024, 2, 31, 0, 30)));
    });

    it('enforce UTC ignores the local transition', () => {
      expect(getDate('2024-03-31T02:30', true)).to.deep.equal(new Date(Date.UTC(2024, 2, 31, 2, 30)));
    });
  });

  describe('calendar day versus 24 hours', () => {
    const springStart = new Date(2024, 2, 30, 12);
    const fallStart = new Date(2024, 9, 26, 12);

    it('P1D keeps the local wall clock across spring forward, i.e. 23 hours', () => {
      const expireAt = parseDuration('P1D').applyDuration(springStart, 1, false);
      expect(expireAt).to.deep.equal(new Date(2024, 2, 31, 12));
      expect(expireAt.getTime() - springStart.getTime()).to.equal(23 * 3600000);
    });

    it('PT24H is exactly 24 hours and lands an hour later on the wall clock', () => {
      const expireAt = parseDuration('PT24H').applyDuration(springStart, 1, false);
      expect(expireAt).to.deep.equal(new Date(2024, 2, 31, 13));
      expect(expireAt.getTime() - springStart.getTime()).to.equal(24 * 3600000);
    });

    it('P1D keeps the local wall clock across fall back, i.e. 25 hours', () => {
      const expireAt = parseDuration('P1D').applyDuration(fallStart, 1, false);
      expect(expireAt).to.deep.equal(new Date(2024, 9, 27, 12));
      expect(expireAt.getTime() - fallStart.getTime()).to.equal(25 * 3600000);
    });

    it('PT24H across fall back lands an hour earlier on the wall clock', () => {
      expect(parseDuration('PT24H').applyDuration(fallStart, 1, false)).to.deep.equal(new Date(2024, 9, 27, 11));
    });

    it('subtracting P1D keeps the wall clock as well', () => {
      expect(parseDuration('P1D').applyDuration(new Date(2024, 9, 27, 12), -1, false)).to.deep.equal(fallStart);
      expect(parseDuration('P1D').applyDuration(new Date(2024, 2, 31, 12), -1, false)).to.deep.equal(springStart);
    });

    it('P1W keeps the wall clock across the transition', () => {
      expect(parseDuration('P1W').applyDuration(new Date(2024, 2, 28, 12), 1, false)).to.deep.equal(new Date(2024, 3, 4, 12));
    });

    it('P1D with the UTC flag is 24 hours regardless of local transition', () => {
      expect(parseDuration('P1D').applyDuration(springStart, 1, true)).to.deep.equal(new Date(2024, 2, 31, 13));
    });

    it('a fractional day is the fraction of the local calendar day', () => {
      // March 30 12:00 CET to March 31 12:00 CEST is 23 hours, half of which is 11.5 hours
      expect(parseDuration('P0.5D').applyDuration(springStart, 1, false)).to.deep.equal(new Date(2024, 2, 30, 23, 30));
      // one calendar day then half of the following 24 hour day
      expect(parseDuration('P1.5D').applyDuration(springStart, 1, false)).to.deep.equal(new Date(2024, 3, 1, 0));
    });

    it('duration getExpireAt and toMilliseconds apply in UTC so a day is always 24 hours', () => {
      expect(parseDuration('P1D').getExpireAt(springStart)).to.deep.equal(new Date(2024, 2, 31, 13));
      expect(parseDuration('P1D').toMilliseconds(springStart)).to.equal(24 * 3600000);
    });
  });

  describe('interval', () => {
    it('start/duration without offset expires on the local wall clock', () => {
      expect(getExpireAt('2024-03-30T12:00/P1D')).to.deep.equal(new Date(2024, 2, 31, 12));
      expect(getExpireAt('2024-10-26T12:00/P1D')).to.deep.equal(new Date(2024, 9, 27, 12));
    });

    it('duration/end without offset starts on the local wall clock', () => {
      expect(getStartAt('P1D/2024-03-31T12:00')).to.deep.equal(new Date(2024, 2, 30, 12));
      expect(getStartAt('P1D/2024-10-27T12:00')).to.deep.equal(new Date(2024, 9, 26, 12));
    });

    it('start/duration with Z is 24 hours', () => {
      expect(getExpireAt('2024-03-30T12:00Z/P1D')).to.deep.equal(new Date(Date.UTC(2024, 2, 31, 12)));
    });

    it('start/duration with enforce UTC is 24 hours', () => {
      expect(getExpireAt('2024-03-30T12:00/P1D', undefined, undefined, true)).to.deep.equal(new Date(Date.UTC(2024, 2, 31, 12)));
    });

    it('PT24H without offset is 24 hours', () => {
      expect(getExpireAt('2024-03-30T12:00/PT24H')).to.deep.equal(new Date(2024, 2, 31, 13));
    });
  });

  describe('repetitions', () => {
    const source = 'R-1/2024-03-01T02:30/P1D';

    it('an occurrence in the spring forward gap is pushed past the gap', () => {
      expect(getExpireAt(source, new Date(2024, 2, 30, 12))).to.deep.equal(new Date(2024, 2, 31, 3, 30));
    });

    it('the occurrence after the gap is back on the original wall clock', () => {
      expect(getExpireAt(source, new Date(2024, 2, 31, 4))).to.deep.equal(new Date(2024, 3, 1, 2, 30));
    });

    it('an occurrence in the fall back overlap is the first occurrence', () => {
      expect(getExpireAt(source, new Date(2024, 9, 26, 12))).to.deep.equal(new Date(Date.UTC(2024, 9, 27, 0, 30)));
      expect(getExpireAt(source, new Date(2024, 9, 27, 12))).to.deep.equal(new Date(2024, 9, 28, 2, 30));
    });
  });

  describe('month end clamp', () => {
    it('clamped day landing in the spring forward gap is pushed past the gap', () => {
      expect(parseDuration('P2M').applyDuration(new Date(2024, 0, 31, 2, 30), 1, false)).to.deep.equal(new Date(2024, 2, 31, 3, 30));
    });

    it('clamped day across fall back keeps the wall clock', () => {
      expect(parseDuration('P2M').applyDuration(new Date(2024, 7, 31, 2, 30), 1, false)).to.deep.equal(new Date(2024, 9, 31, 2, 30));
      expect(parseDuration('P1M').applyDuration(new Date(2024, 9, 31, 2, 30), -1, false)).to.deep.equal(new Date(2024, 8, 30, 2, 30));
    });
  });
});
