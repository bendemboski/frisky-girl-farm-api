require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const Spreadsheet = require('../src/sheets/spreadsheet');
const {
  SheetsError,
  sheetNotFound,
  spreadsheetLocked,
  quantityNotAvailable
} = require('../src/sheets/errors');

describe('Spreadsheet', function() {
  let values;
  let getStub;
  let spreadsheet;

  beforeEach(function() {
    values = {};

    values.get = sinon.stub();
    getStub = values.get.withArgs({
      spreadsheetId: 'ssid',
      range: 'Orders',
      majorDimension: 'COLUMNS'
    });

    spreadsheet = new Spreadsheet({
      client: {
        spreadsheets: {
          values
        }
      },
      id: 'ssid'
    });
    spreadsheet.mutex.retryInterval = 10;
  });

  afterEach(function() {
    sinon.restore();
  });

  function setOrders(totals, ...users) {
    let ordered = [ 0, 0, 0 ];
    users.forEach((orders) => {
      ordered[0] += orders[1] || 0;
      ordered[1] += orders[2] || 0;
      ordered[2] += orders[3] || 0;
    });

    getStub.resolves({
      data: {
        values: [
          [ '', 'image', 'price', 'total', 'ordered', ...users.map((u) => u[0]) ],
          [ 'Lettuce', 'http://lettuce.com/image.jpg', 0.15, totals[0], ordered[0], ...users.map((u) => u[1]) ],
          [ 'Kale', 'http://kale.com/image.jpg', 0.85, totals[1], ordered[1], ...users.map((u) => u[2]) ],
          [ 'Spicy Greens', 'http://spicy-greens.com/image.jpg', 15.00, totals[2], ordered[2], ...users.map((u) => u[3]) ]
        ]
      }
    });
  }

  describe('getProducts', function() {
    it('works', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 2, 0 ]
      );

      let ret = await spreadsheet.getProducts('uid');
      expect(ret).to.deep.nested.include({
        '1.name': 'Lettuce',
        '1.imageUrl': 'http://lettuce.com/image.jpg',
        '1.price': 0.15,
        '1.available': 0,
        '1.ordered': 3,
        '2.name': 'Kale',
        '2.imageUrl': 'http://kale.com/image.jpg',
        '2.price': 0.85,
        '2.available': 1,
        '2.ordered': 2,
        '3.name': 'Spicy Greens',
        '3.imageUrl': 'http://spicy-greens.com/image.jpg',
        '3.price': 15.00,
        '3.available': 4,
        '3.ordered': 0
      });
    });

    it('propagates errors', async function() {
      values.get.resetBehavior();
      values.get.rejects({ code: 400 });

      await expect(spreadsheet.getProducts('uid')).to.eventually.be.rejectedWith(SheetsError, sheetNotFound);
    });
  });

  describe('setProductOrder', function() {
    beforeEach(function() {
      values.append = sinon.stub().withArgs({
        spreadsheetId: 'ssid',
        range: 'Mutex!A1',
        requestBody: { values: sinon.match.array.startsWith([ 'uid' ]) }
      }).resolves({
        data: {
          updates: {
            updatedRange: 'Mutex!A2:B2'
          }
        }
      });

      values.clear = sinon.stub().withArgs({
        spreadsheetId: 'ssid',
        range: 'Mutex!A3:B3'
      }).resolves();

      values.update = sinon.stub().resolves();
    });

    it('works and locks the mutex', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid2', 4, 0, 1 ],
        [ 'uid', 3, 2, 0 ]
      );

      let ret = await spreadsheet.setProductOrder('uid', 3, 3);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 3,
        '2.available': 1,
        '2.ordered': 2,
        '3.available': 1,
        '3.ordered': 3
      });
      expect(values.append).to.have.been.calledOnce;
      expect(values.clear).to.have.been.calledOnce;
      expect(values.update).to.have.been.calledAfter(values.append);
      expect(values.update).to.have.been.calledBefore(values.clear);
    });

    it('fails if it cannot lock the mutex', async function() {
      values.append.resetBehavior();
      values.append.resolves({
        data: {
          updates: {
            updatedRange: 'Mutex!A3:B3'
          }
        }
      });

      await expect(spreadsheet.setProductOrder('uid', 3, 3)).to.be.rejectedWith(SheetsError, spreadsheetLocked);
    });

    it('propagates errors', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid', 4, 0, 1 ],
        [ 'uid2', 3, 2, 0 ]
      );
      await expect(spreadsheet.setProductOrder('uid', 3, 6)).to.be.rejectedWith(SheetsError, quantityNotAvailable);

      values.get.resetBehavior();
      values.get.rejects({ code: 400 });

      await expect(spreadsheet.setProductOrder('uid', 3, 1)).to.eventually.be.rejectedWith(SheetsError, sheetNotFound);
    });
  });
});
