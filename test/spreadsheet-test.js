require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const OrdersSheet = require('../src/sheets/spreadsheet');
const {
  SheetNotFoundError,
  SheetLockedError,
  QuantityNotAvailableError
} = require('../src/sheets/errors');

describe('Spreadsheet', function() {
  let values;
  let spreadsheet;

  beforeEach(function() {
    values = {};

    values.get = sinon.stub().withArgs({
      spreadsheetId: 'ssid',
      range: 'Orders',
      majorDimension: 'ROWS'
    });

    spreadsheet = new OrdersSheet({
      client: {
        spreadsheets: {
          values
        }
      },
      spreadsheetId: 'ssid'
    });
    spreadsheet.mutex.retryInterval = 10;
  });

  afterEach(function() {
    sinon.restore();
  });

  function setOrders(totals, ...users) {
    let ordered = [ 'ordered', 0, 0, 0 ];
    users.forEach((orders) => {
      ordered[1] += orders[1] || 0;
      ordered[2] += orders[2] || 0;
      ordered[3] += orders[3] || 0;
    });
    values.get.resolves([
      [ '', 'Lettuce', 'Kale', 'Spicy Greens' ],
      totals,
      ordered,
      ...users
    ]);
  }

  describe('getProducts', function() {
    it('works', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 2, 0 ]
      );

      let ret = await spreadsheet.getProducts('uid');
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 3,
        'Kale.available': 1,
        'Kale.ordered': 2,
        'Spicy Greens.available': 4,
        'Spicy Greens.ordered': 0
      });
    });

    it('propagates errors', async function() {
      values.get.resetBehavior();
      values.get.rejects({ code: 400 });

      await expect(spreadsheet.getProducts('uid')).to.eventually.be.rejectedWith(SheetNotFoundError);
    });
  });

  describe('setProductOrdered', function() {
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
        [ 'total', 7, 3, 5 ],
        [ 'uid2', 4, 0, 1 ],
        [ 'uid', 3, 2, 0 ]
      );

      let ret = await spreadsheet.setProductOrdered('uid', 'Spicy Greens', 3);
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 3,
        'Kale.available': 1,
        'Kale.ordered': 2,
        'Spicy Greens.available': 1,
        'Spicy Greens.ordered': 3
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

      await expect(spreadsheet.setProductOrdered('uid', 'Spicy Greens', 3)).to.be.rejectedWith(SheetLockedError);
    });

    it('propagates errors', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ],
        [ 'uid', 4, 0, 1 ],
        [ 'uid2', 3, 2, 0 ]
      );
      await expect(spreadsheet.setProductOrdered('uid', 'Spicy Greens', 6)).to.be.rejectedWith(QuantityNotAvailableError);

      values.get.resetBehavior();
      values.get.rejects({ code: 400 });

      await expect(spreadsheet.setProductOrdered('uid', 'Spicy Greens', 1)).to.eventually.be.rejectedWith(SheetNotFoundError);
    });
  });
});
