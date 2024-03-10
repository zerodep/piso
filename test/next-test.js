import * as ck from 'chronokinesis';

import { next } from '../src/index.js';

describe('next', () => {
  after(ck.reset);

  describe('Europe/Stockholm', () => {
    let tz;
    before(() => {
      tz = ck.timezone('Europe/Stockholm', 2023, 0, 1);
    });
    after(ck.reset);

    [
      ['2024-01-01', [2024, 0, 1]],
      ['2024-01-01T12:00', [2024, 0, 1, 12, 0]],
      ['2024-01-01T12:00:42', [2024, 0, 1, 12, 0, 42]],
      ['2024-01-01T12:00:42.01', [2024, 0, 1, 12, 0, 42.01]],
      ['2024-01-01/P1Y', [2025, 0, 1]],
      ['P1Y/2025-01-01', [2024, 0, 1]],
    ].forEach(([interval, dt]) => {
      it(`"${interval}" returns expected new Date(${dt})`, () => {
        tz.freeze(2023, 0, 1);
        const date = new Date(...dt);
        expect(next(interval)).to.deep.equal(date);
      });
    });

    it('"P1Y/2025-01-01" when end date has passed returns end date', () => {
      tz.freeze(2025, 1, 2);
      expect(next('P1Y/2025-02-01')).to.deep.equal(new Date(2025, 1, 1));
    });

    describe('repeat', () => {
      describe('three repetitions from start date "R3/2023-02-01T12:00/PT1H"', () => {
        const interval = 'R3/2023-02-01T12:00/PT1H';

        it('first repeat returns 13:00 at start date', () => {
          tz.travel(2023, 0, 1);
          const nextDate = next(interval);
          expect(nextDate.getHours()).to.equal(13);
          expect(nextDate.toISOString()).to.equal('2023-02-01T12:00:00.000Z');
        });

        it('first repeat returns 13:00', () => {
          tz.travel(2023, 0, 1);
          expect(next(interval).getHours()).to.equal(13);
        });

        it('one hour has passed returns 14:00', () => {
          tz.travel(next(interval).getTime() + 1);
          expect(next(interval).getHours()).to.equal(14);
        });

        it('two hours has passed and third repeat returns 14:00', () => {
          tz.freeze(next(interval).getTime() + 1);
          tz.freeze(next(interval).getTime());
          expect(next(interval).getHours()).to.equal(15);
        });

        it('three hours has passed and third repeat returns 14:00', () => {
          tz.freeze(next(interval).getTime() + 1);
          tz.freeze(next(interval).getTime());
          tz.freeze(next(interval).getTime());
          expect(next(interval).getHours()).to.equal(15);
        });

        it('four hours has passed and third repeat returns 14:00', () => {
          tz.freeze(next(interval).getTime() + 1);
          tz.freeze(next(interval).getTime());
          tz.freeze(next(interval).getTime());
          tz.freeze(next(interval).getTime());
          expect(next(interval).getHours()).to.equal(15);
        });
      });
    });
  });

  describe('Asia/Shanghai', () => {
    let tz;
    before(() => {
      tz = ck.timezone('Asia/Shanghai', 2023, 0, 1);
    });
    after(ck.reset);

    [
      ['2024-01-01', [2024, 0, 1]],
      ['2024-01-01T12:00', [2024, 0, 1, 12, 0]],
    ].forEach(([interval, dt]) => {
      it(`${interval} returns expected new Date(${dt})`, () => {
        tz.travel(2023, 0, 1);
        const date = new Date(...dt);
        expect(next(interval)).to.deep.equal(date);
      });
    });
  });
});
