require('./support/setup');
const { expect } = require('chai');
const { indexToColumn } = require('../src/sheets/a1-utils');

describe('a1 utils', function() {
  describe('indexToColumn', function() {
    it('works', function() {
      expect(indexToColumn(0)).to.equal('A');
      expect(indexToColumn(5)).to.equal('F');
      expect(indexToColumn(25)).to.equal('Z');
      expect(indexToColumn(26)).to.equal('AA');
      expect(indexToColumn(31)).to.equal('AF');
      expect(indexToColumn(26 * 6 + 1)).to.equal('FB');
      expect(indexToColumn(26 * 26 * 6 + 26 * 8 + 10)).to.equal('FHK');
    });
  });
});
