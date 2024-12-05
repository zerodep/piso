import { ISODate, getDate } from '../src/index.js';

describe('ISO ordinal date', () => {
  it('parses ordinal date', () => {
    let dateString = '1981-095';
    expect(getDate(dateString), dateString).to.deep.equal(new Date(1981, 3, 5));

    dateString = '2007-195T12:30+02:00';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2007-07-14T10:30Z'));

    dateString = '2024-366T12:30+02:00';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2024-12-31T10:30Z'));

    dateString = '2023-365T12:30+02:00';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2023-12-31T10:30Z'));

    dateString = '2023365T1230+0200';
    expect(getDate(dateString), dateString).to.deep.equal(new Date('2023-12-31T10:30Z'));
  });

  [
    ['2007-318T12:00', 2007, 10, 14, 11, 0],
    ['2024-318T12:00Z', 2024, 10, 13, 12, 0],
  ].forEach(([dt, Y, M, D, H, m]) => {
    it(`parses ${dt} as expected`, () => {
      expect(getDate(dt), dt).to.deep.equal(new Date(Date.UTC(Y, M, D, H, m)));
    });
  });

  it('throws range error if too many days in ordinal date', () => {
    const dateString = '1981-366';
    expect(() => getDate(dateString), dateString).to.throw(RangeError, /invalid/i);
  });

  it('throws range error if 0 days in ordinal date', () => {
    const dateString = '1981-000';
    expect(() => getDate(dateString), dateString).to.throw(RangeError, /invalid/i);
  });

  ['1981-001-', '1981001-', '1981-001-01'].forEach((dateString) => {
    it(`${dateString} throws range error if succeeded by hyphen`, () => {
      expect(() => getDate(dateString), dateString).to.throw(RangeError, /unexpected/i);
    });
  });

  describe('leap year', () => {
    [2024, 2000, 1600].forEach((leapYear) => {
      const nonLeapYear = leapYear - 1;

      it(`366 days in leap year ${leapYear} is ok`, () => {
        const dateString = `${leapYear}-366`;
        expect(getDate(dateString), dateString).to.deep.equal(new Date(leapYear, 11, 31));
      });

      it(`365 days in non leap year ${nonLeapYear} is ok`, () => {
        const dateString = `${nonLeapYear}-365`;
        expect(getDate(dateString), dateString).to.deep.equal(new Date(nonLeapYear, 11, 31));
      });

      it(`366 days in non leap year ${nonLeapYear} throws range error`, () => {
        const dateString = `${nonLeapYear}-366`;
        expect(() => getDate(dateString), dateString).to.throw(RangeError);
      });

      it(`partial 366 days in leap year ${leapYear} is ok`, () => {
        expect(new ISODate('366', -1, null, true).parsePartialDate(leapYear, 0).toDate()).to.deep.equal(new Date(leapYear, 11, 31));
      });

      it(`partial 365 days in non leap year ${nonLeapYear} is ok`, () => {
        expect(new ISODate('365', -1, null, true).parsePartialDate(nonLeapYear, 0).toDate()).to.deep.equal(new Date(nonLeapYear, 11, 31));
      });

      it(`partial 366 days in non leap year ${nonLeapYear} throws range error`, () => {
        expect(() => new ISODate('366', -1, null, true).parsePartialDate(nonLeapYear, 0)).to.throw(RangeError);
      });
    });
  });

  describe('partial', () => {
    ['-001T12:00', '001-', '001T', '001Z', '100T0000', '1981001'].forEach((partialDateString) => {
      it(`parse partial ${partialDateString} with enforce separators throws range error`, () => {
        expect(() => new ISODate(partialDateString, -1, null, true).parsePartialDate(1981, 0), partialDateString).to.throw(
          RangeError,
          /unexpected/i,
        );
      });
    });

    ['001T12:00', '001-', '001T', '001Z', '100T12:00', '1981-001'].forEach((partialDateString) => {
      it(`parse partial ${partialDateString} without enforce separators throws range error`, () => {
        expect(() => new ISODate(partialDateString, -1, null, false).parsePartialDate(1981, 0), partialDateString).to.throw(
          RangeError,
          /unexpected/i,
        );
      });
    });
  });
});
