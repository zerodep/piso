import * as ck from 'chronokinesis';

import { next, parseInterval } from '../src/index.js';

describe('next(interval[, fromDate])', () => {
  after(ck.reset);

  describe('duration only', () => {
    it('returns now with applied duration', () => {
      ck.freeze(2023, 2, 21);

      expect(next('P1Y')).to.deep.equal(new Date(2024, 2, 21));
    });

    it('with from date returns from date with applied duration', () => {
      expect(next('P1Y', new Date(2022, 2, 21))).to.deep.equal(new Date(2023, 2, 21));
    });
  });

  describe('repeat and duration', () => {
    afterEach(ck.reset);

    it('returns now with applied duration if called without from date', () => {
      ck.freeze(2023, 2, 21);
      expect(next('R2/P1Y')).to.deep.equal(new Date(2024, 2, 21));
    });

    it('returns from date with applied duration', () => {
      expect(next('R2/P1Y', new Date(2023, 2, 21))).to.deep.equal(new Date(2024, 2, 21));
    });

    it('returns now with applied duration if from date is not passed when called again', () => {
      ck.freeze(2023, 2, 21);
      expect(next('R2/P1Y')).to.deep.equal(new Date(2024, 2, 21));
      expect(next('R2/P1Y')).to.deep.equal(new Date(2024, 2, 21));
    });

    it('with from date returns applied repeat when called again', () => {
      ck.freeze(2023, 2, 21);

      const first = next('R2/P1Y');

      expect(first).to.deep.equal(new Date(2024, 2, 21));

      ck.freeze(first);

      const second = next('R2/P1Y', first);

      expect(second).to.deep.equal(new Date(2025, 2, 21));

      ck.freeze(second);

      expect(next('R2/P1Y', first)).to.deep.equal(new Date(2025, 2, 21));
    });

    it('first repeat has passed returns next repeat from date', () => {
      ck.freeze(new Date(2022, 2, 21, 1, 0));
      expect(next('R2/P1Y', new Date(2022, 2, 21))).to.deep.equal(new Date(2023, 2, 21));
    });
  });

  describe('start date', () => {
    it('returns start date', () => {
      ck.freeze(2023, 2, 21);
      expect(next('2025-01-01')).to.deep.equal(new Date(2025, 0, 1));

      ck.freeze(2026, 2, 21);
      expect(next('2025-01-01')).to.deep.equal(new Date(2025, 0, 1));
    });

    it('returns start date ignoring repeat', () => {
      ck.freeze(2023, 2, 21);
      expect(next('R3/2025-01-01')).to.deep.equal(new Date(2025, 0, 1));

      ck.freeze(2026, 2, 21);
      expect(next('R-1/2025-01-01')).to.deep.equal(new Date(2025, 0, 1));
    });
  });

  describe('start and end date', () => {
    it('returns start date if not passed', () => {
      ck.freeze(2023, 2, 21);
      expect(next('2025-01-01/02')).to.deep.equal(new Date(2025, 0, 1));

      ck.freeze(2025, 0, 1);
      expect(next('2025-01-01/02')).to.deep.equal(new Date(2025, 0, 1));
    });

    it('returns end date if start date has passed', () => {
      ck.freeze(2025, 0, 1, 1, 0);
      expect(next('2025-01-01/02')).to.deep.equal(new Date(2025, 0, 2));
    });
  });

  describe('start date and duration', () => {
    it('if combination has not reached start date start date is returned', () => {
      ck.freeze(2023, 2, 21);

      expect(next('2025-01-01/P1Y')).to.deep.equal(new Date(2025, 0, 1));
    });

    it('if start date has passed returns applied duration', () => {
      ck.freeze(2025, 2, 21);

      expect(next('2025-01-01/P1Y')).to.deep.equal(new Date(2026, 0, 1));
    });
  });

  describe('duration and end date', () => {
    [
      ['P1Y/2025-01-01T00:00Z', [2024, 0, 1]],
      ['P1Y/2025-01-01T12:00-02', [2024, 0, 1, 12, 0]],
    ].forEach(([interval, dt]) => {
      it(`"${interval}" with future duration returns end date with applied duration`, () => {
        ck.freeze(2023, 2, 21);

        expect(next(interval), interval).to.deep.equal(new Date(Date.UTC(...dt)));
      });

      it(`if "${interval}" end date has passed returns end date`, () => {
        ck.freeze(2025, 2, 21);

        expect(next(interval)).to.deep.equal(parseInterval(interval).endDate);
      });

      it(`"${interval}" with passed applied duration returns end date`, () => {
        ck.freeze(Date.UTC(...dt) + 1);

        expect(next(interval)).to.deep.equal(parseInterval(interval).endDate);
      });
    });
  });

  describe('repeat, start date, and duration', () => {
    describe('three repetitions from start date "R3/2023-02-01T12:00Z/PT1H"', () => {
      const interval = 'R3/2023-02-01T12:00Z/PT1H';

      it('first repeat returns 12:00', () => {
        ck.travel(2023, 0, 1);
        const nextDate = next(interval);
        expect(nextDate.getUTCHours()).to.equal(12);
        expect(nextDate.toISOString()).to.equal('2023-02-01T12:00:00.000Z');
      });

      it('second repeat returns 13:00', () => {
        ck.travel(next(interval).getTime() + 1);
        expect(next(interval).getUTCHours()).to.equal(13);
      });

      it('third repeat returns 13:00', () => {
        ck.travel(next(interval).getTime() + 1);
        ck.travel(next(interval).getTime());
        expect(next(interval).getUTCHours()).to.equal(14);
      });

      it('interval has passed, still returns 14:00', () => {
        ck.freeze(next(interval).getTime());
        ck.freeze(next(interval).getTime());
        ck.freeze(next(interval).getTime());
        expect(next(interval).getUTCHours()).to.equal(14);
      });
    });
  });

  describe('repeat, duration, and end date', () => {
    const interval = 'R3/PT1H/2023-02-01T12:00Z';
    describe(`three repetitions until end date "${interval}"`, () => {
      it('first repeat returns 10:00', () => {
        ck.travel(2023, 0, 1);
        const nextDate = next(interval);
        expect(nextDate.getUTCHours()).to.equal(10);
        expect(nextDate.toISOString()).to.equal('2023-02-01T10:00:00.000Z');
      });

      it('second repeat returns 11:00', () => {
        ck.travel(next(interval).getTime() + 1);
        expect(next(interval).getUTCHours()).to.equal(11);
      });

      it('third repeat returns 12:00', () => {
        ck.freeze(next(interval).getTime() + 1);
        ck.freeze(next(interval).getTime());
        expect(next(interval).getUTCHours()).to.equal(12);
      });

      it('three hours has passed and third repeat returns 12:00', () => {
        ck.freeze(next(interval).getTime());
        ck.freeze(next(interval).getTime());
        ck.freeze(next(interval).getTime());
        expect(next(interval).getUTCHours()).to.equal(12);
      });

      it('four hours has passed interval still returns 12:00', () => {
        ck.freeze(next(interval).getTime());
        ck.freeze(next(interval).getTime());
        ck.freeze(next(interval).getTime());
        ck.freeze(next(interval).getTime());
        expect(next(interval).getUTCHours()).to.equal(12);
      });
    });
  });
});
