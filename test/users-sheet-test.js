require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const UsersSheet = require('../src/sheets/users-sheet');
const {
  SheetsError,
  userNotFound
} = require('../src/sheets/errors');

describe('UsersSheet', function() {
  let values;
  let sheet;

  beforeEach(function() {
    values = {};

    values.get = sinon.stub();
    values.get.withArgs({
      spreadsheetId: 'ssid',
      range: 'Users',
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE'
    }).resolves({
      data: {
        values: [
          [ 'email', 'name', 'location', 'balance', 'starting balance', 'spent' ],
          [ 'ellen@friskygirlfarm.com', 'Ellen Scheffer', 'Lake City', 25.00, 100.00, 75.00 ],
          [ 'ashley@friskygirlfarm.com', 'Ashley Wilson', 'Wallingford', 45.00, 100.00, 55.00 ]
        ]
      }
    });

    sheet = new UsersSheet({
      client: {
        spreadsheets: {
          values
        }
      },
      spreadsheetId: 'ssid'
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('getUsers', function() {
    it('works', async function() {
      expect(await sheet.getUser('ashley@friskygirlfarm.com')).to.deep.equal({
        email: 'ashley@friskygirlfarm.com',
        name: 'Ashley Wilson',
        location: 'Wallingford',
        balance: 45.00
      });
    });

    it('throws when the user is not found', async function() {
      expect(sheet.getUser('becky@friskygirlfarm.com')).to.eventually.be.rejectedWith(SheetsError, userNotFound);
    });
  });
});
