require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const OrdersSheet = require('../src/sheets/orders-sheet');
const {
  SheetNotFoundError,
  NegativeQuantityError,
  ProductNotFoundError,
  QuantityNotAvailableError
} = require('../src/sheets/errors');

describe('OrdersSheet', function() {
  let values;
  let sheet;

  beforeEach(function() {
    values = {};

    values.get = sinon.stub().withArgs({
      spreadsheetId: 'ssid',
      range: 'Orders',
      majorDimension: 'ROWS'
    });

    sheet = new OrdersSheet({
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

  describe('getForUser', function() {
    it('works with no users', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret).to.deep.nested.include({
        'products.Lettuce.available': 7,
        'products.Lettuce.ordered': 0,
        'products.Kale.available': 3,
        'products.Kale.ordered': 0,
        'products.Spicy Greens.available': 5,
        'products.Spicy Greens.ordered': 0
      });
    });

    it('works when the user has no row', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid2', 3, 2, 2 ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret).to.deep.nested.include({
        'products.Lettuce.available': 0,
        'products.Lettuce.ordered': 0,
        'products.Kale.available': 1,
        'products.Kale.ordered': 0,
        'products.Spicy Greens.available': 2,
        'products.Spicy Greens.ordered': 0
      });
    });

    it('works when the user has a row', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ],
        [ 'uid', 4, 0, 1 ],
        [ 'uid2', 3, 2, 2 ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret).to.deep.nested.include({
        'products.Lettuce.available': 0,
        'products.Lettuce.ordered': 4,
        'products.Kale.available': 1,
        'products.Kale.ordered': 0,
        'products.Spicy Greens.available': 2,
        'products.Spicy Greens.ordered': 1
      });
    });

    it('works with blank user cells', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ],
        [ 'uid', 4, '', 1 ],
        [ 'uid2', 3, 2, '' ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret).to.deep.nested.include({
        'products.Lettuce.available': 0,
        'products.Lettuce.ordered': 4,
        'products.Kale.available': 1,
        'products.Kale.ordered': 0,
        'products.Spicy Greens.available': 4,
        'products.Spicy Greens.ordered': 1
      });
    });

    it('fails if there is no orders sheet', async function() {
      values.get.resetBehavior();
      values.get.rejects({ code: 400 });

      await expect(sheet.getForUser('uid')).to.eventually.be.rejectedWith(SheetNotFoundError);
    });
  });

  describe('setOrdered', function() {
    beforeEach(function() {
      values.update = sinon.stub().resolves();
      values.batchUpdate = sinon.stub().resolves();
    });

    it('works when the user has no row', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid2', 3, 2, 0 ]
      );

      let ret = await sheet.setOrdered('uid', 'Spicy Greens', 2);
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 0,
        'Kale.available': 1,
        'Kale.ordered': 0,
        'Spicy Greens.available': 2,
        'Spicy Greens.ordered': 2
      });

      expect(values.batchUpdate).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        requestBody: {
          data: [
            {
              range: 'Orders!A6',
              values: [ 'uid' ]
            },
            {
              range: 'Orders!D6',
              values: [ 2 ]
            }
          ]
        }
      });
    });

    it('works when the user has a row', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 0 ]
      );

      let ret = await sheet.setOrdered('uid', 'Spicy Greens', 2);
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 3,
        'Kale.available': 3,
        'Kale.ordered': 0,
        'Spicy Greens.available': 2,
        'Spicy Greens.ordered': 2
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D5',
        requestBody: { values: [ 2 ] }
      });
    });

    it('works for increasing the quantity of a product', async function() {
      setOrders(
        [ 'total', 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 1 ]
      );

      let ret = await sheet.setOrdered('uid', 'Spicy Greens', 3);
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 3,
        'Kale.available': 3,
        'Kale.ordered': 0,
        'Spicy Greens.available': 2,
        'Spicy Greens.ordered': 3
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D5',
        requestBody: { values: [ 3 ] }
      });
    });

    it('works for decreasing the quantity of a product', async function() {
      setOrders(
        [ 'total', 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('uid', 'Spicy Greens', 2);
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 3,
        'Kale.available': 3,
        'Kale.ordered': 0,
        'Spicy Greens.available': 3,
        'Spicy Greens.ordered': 2
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D5',
        requestBody: { values: [ 2 ] }
      });
    });

    it('works for zeroing out the quantity of a product', async function() {
      setOrders(
        [ 'total', 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('uid', 'Spicy Greens', 0);
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 3,
        'Kale.available': 3,
        'Kale.ordered': 0,
        'Spicy Greens.available': 5,
        'Spicy Greens.ordered': 0
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D5',
        requestBody: { values: [ 0 ] }
      });
    });

    it('works if the order consumes all remaining availability', async function() {
      setOrders(
        [ 'total', 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 0 ]
      );

      let ret = await sheet.setOrdered('uid', 'Spicy Greens', 5);
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 3,
        'Kale.available': 3,
        'Kale.ordered': 0,
        'Spicy Greens.available': 0,
        'Spicy Greens.ordered': 5
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D5',
        requestBody: { values: [ 5 ] }
      });
    });

    it('accounts for the current ordered quantity when checking availability', async function() {
      setOrders(
        [ 'total', 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('uid', 'Spicy Greens', 4);
      expect(ret).to.deep.nested.include({
        'Lettuce.available': 0,
        'Lettuce.ordered': 3,
        'Kale.available': 3,
        'Kale.ordered': 0,
        'Spicy Greens.available': 1,
        'Spicy Greens.ordered': 4
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D5',
        requestBody: { values: [ 4 ] }
      });
    });

    it('fails on a negative quantity or unknown product', async function() {
      setOrders(
        [ 'total', 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 0 ]
      );

      await expect(sheet.setOrdered('uid', 'Spicy Greens', -2)).to.eventually.be.rejectedWith(NegativeQuantityError);
      await expect(sheet.setOrdered('uid', 'Shake n Bake', 3)).to.eventually.be.rejectedWith(ProductNotFoundError);
      expect(values.update).to.not.have.been.called;
      expect(values.batchUpdate).to.not.have.been.called;
    });

    it('fails if the order exceeds the availability', async function() {
      setOrders(
        [ 'total', 7, 3, 6 ],
        [ 'uid1', 4, 0, 2 ],
        [ 'uid', 3, 0, 3 ]
      );

      await expect(sheet.setOrdered('uid', 'Spicy Greens', 5)).to.eventually.be.rejectedWith(QuantityNotAvailableError);
      expect(values.update).to.not.have.been.called;
      expect(values.batchUpdate).to.not.have.been.called;
    });

    it('fails if there is no orders sheet', async function() {
      values.get.rejects({ code: 400 });

      await expect(sheet.setOrdered('uid', 'Spicy Greens', 3)).to.eventually.be.rejectedWith(SheetNotFoundError);
    });
  });
});
