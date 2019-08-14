require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const UsersSheet = require('../src/sheets/users-sheet');
const { UnknownUserError } = require('../src/sheets/errors');
const MockSheetsClient = require('./support/mock-sheets-client');

describe('UsersSheet', function() {
  let client;
  let sheet;

  beforeEach(function() {
    client = new MockSheetsClient();
    client.setUsers([
      [ ' spacey@friskygirlfarm.com ', 'Spacey McWhitespace', 'Wallingford', 35.00, 100.00, 65.00 ]
    ]);

    sheet = new UsersSheet({
      client,
      spreadsheetId: 'ssid'
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('getUser', function() {
    it('works', async function() {
      expect(await sheet.getUser('ashley@friskygirlfarm.com')).to.deep.equal({
        email: 'ashley@friskygirlfarm.com',
        name: 'Ashley Wilson',
        location: 'Wallingford',
        balance: 45.00
      });
    });

    it('matches with extra whitespace', async function() {
      expect(await sheet.getUser(' ashley@friskygirlfarm.com ')).to.deep.equal({
        email: 'ashley@friskygirlfarm.com',
        name: 'Ashley Wilson',
        location: 'Wallingford',
        balance: 45.00
      });

      expect(await sheet.getUser('spacey@friskygirlfarm.com')).to.deep.equal({
        email: 'spacey@friskygirlfarm.com',
        name: 'Spacey McWhitespace',
        location: 'Wallingford',
        balance: 35.00
      });

      expect(await sheet.getUser(' spacey@friskygirlfarm.com     ')).to.deep.equal({
        email: 'spacey@friskygirlfarm.com',
        name: 'Spacey McWhitespace',
        location: 'Wallingford',
        balance: 35.00
      });
    });

    it('throws when the user is not found', async function() {
      expect(sheet.getUser('becky@friskygirlfarm.com')).to.eventually.be.rejectedWith(UnknownUserError);
    });
  });
});
