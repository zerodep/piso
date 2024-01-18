import { ISODurationParser } from '../src/index.js';

describe('duration', () => {
  [
    ['P1Y', { Y: 1 }],
    ['PT0S', { S: 0 }],
    ['P0D', { D: 0 }],
    ['P1Y2M3W4DT5H6M7S', { Y: 1, M: 2, W: 3, D: 4, H: 5, m: 6, S: 7 }],
  ].forEach(([dur, expected]) => {
    it(`"${dur}" is parsed as expected`, () => {
      expect(ISODurationParser.parse(dur)).to.deep.equal(expected);
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
        ISODurationParser.parse(dur);
      }, dur).to.throw(expected);
    });
  });

  describe('write(c)', () => {
    it('ends parsing when falsy character appear', () => {
      const dur = 'PT0.1S';
      const writer = new ISODurationParser();
      for (let i = 0; i <= dur.length; i++) {
        writer.write(dur[i], i);
      }

      expect(writer.result).to.have.property('S', 0.1);
    });
  });
});
