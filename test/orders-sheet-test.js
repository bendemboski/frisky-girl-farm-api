require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const OrdersSheet = require('../src/sheets/orders-sheet');
const {
  SheetsError,
  sheetNotFound,
  negativeQuantity,
  productNotFound,
  quantityNotAvailable
} = require('../src/sheets/errors');

describe('OrdersSheet', function() {
  let values;
  let getStub;
  let sheet;

  beforeEach(function() {
    values = {};

    values.get = sinon.stub();
    getStub = values.get.withArgs({
      spreadsheetId: 'ssid',
      range: 'Orders',
      majorDimension: 'COLUMNS',
      valueRenderOption: 'UNFORMATTED_VALUE'
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

  describe('getForUser', function() {
    it('includes name, image URL and price', async function() {
      setOrders(
        [ 1, 1, 1 ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret.products).to.have.keys('1', '2', '3');
      expect(ret).to.deep.nested.include({
        'products.1.name': 'Lettuce',
        'products.1.imageUrl': 'http://lettuce.com/image.jpg',
        'products.1.price': 0.15,
        'products.2.name': 'Kale',
        'products.2.imageUrl': 'http://kale.com/image.jpg',
        'products.2.price': 0.85,
        'products.3.name': 'Spicy Greens',
        'products.3.imageUrl': 'http://spicy-greens.com/image.jpg',
        'products.3.price': 15.00
      });
    });

    it('omits products with a limit of 0', async function() {
      setOrders(
        [ 1, 0, 1 ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret.products).to.have.keys('1', '3');
      expect(ret).to.deep.nested.include({
        'products.1.name': 'Lettuce',
        'products.3.name': 'Spicy Greens'
      });
    });

    it('works with no users', async function() {
      setOrders(
        [ 7, 3, 5 ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret).to.deep.nested.include({
        'products.1.available': 7,
        'products.1.ordered': 0,
        'products.2.available': 3,
        'products.2.ordered': 0,
        'products.3.available': 5,
        'products.3.ordered': 0
      });
    });

    it('works when the user has no row', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid2', 3, 2, 2 ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret).to.deep.nested.include({
        'products.1.available': 0,
        'products.1.ordered': 0,
        'products.2.available': 1,
        'products.2.ordered': 0,
        'products.3.available': 2,
        'products.3.ordered': 0
      });
    });

    it('works when the user has a row', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid', 4, 0, 1 ],
        [ 'uid2', 3, 2, 2 ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret).to.deep.nested.include({
        'products.1.available': 0,
        'products.1.ordered': 4,
        'products.2.available': 1,
        'products.2.ordered': 0,
        'products.3.available': 2,
        'products.3.ordered': 1
      });
    });

    it('works with blank user cells', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid', 4, '', 1 ],
        [ 'uid2', 3, 2, '' ]
      );

      let ret = await sheet.getForUser('uid');
      expect(ret).to.deep.nested.include({
        'products.1.available': 0,
        'products.1.ordered': 4,
        'products.2.available': 1,
        'products.2.ordered': 0,
        'products.3.available': 4,
        'products.3.ordered': 1
      });
    });

    it('fails if there is no orders sheet', async function() {
      getStub.resetBehavior();
      getStub.rejects({ code: 400 });

      await expect(sheet.getForUser('uid')).to.eventually.be.rejectedWith(SheetsError, sheetNotFound);
    });
  });

  describe('setOrdered', function() {
    beforeEach(function() {
      values.update = sinon.stub().resolves();
      values.batchUpdate = sinon.stub().resolves();
    });

    it('works when the user has no row', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid2', 3, 2, 0 ]
      );

      values.append = sinon.stub();
      values.append.withArgs(sinon.match({
        spreadsheetId: 'ssid',
        range: 'Orders!B1'
      })).resolves({ data: { updates: { updatedRange: 'Orders!A8:D8' } } });

      let ret = await sheet.setOrdered('uid', 3, 2);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 0,
        '2.available': 1,
        '2.ordered': 0,
        '3.available': 2,
        '3.ordered': 2
      });

      expect(values.append).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!B1',
        requestBody: { values: [ 'uid', 0, 0, 2 ] }
      });
    });

    it('works when the user has a row', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 0 ]
      );

      let ret = await sheet.setOrdered('uid', 3, 2);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 2,
        '3.ordered': 2
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ 2 ] }
      });
    });

    it('works for increasing the quantity of a product', async function() {
      setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 1 ]
      );

      let ret = await sheet.setOrdered('uid', 3, 3);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 2,
        '3.ordered': 3
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ 3 ] }
      });
    });

    it('works for decreasing the quantity of a product', async function() {
      setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('uid', 3, 2);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 3,
        '3.ordered': 2
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ 2 ] }
      });
    });

    it('works for zeroing out the quantity of a product', async function() {
      setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('uid', 3, 0);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 5,
        '3.ordered': 0
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ 0 ] }
      });
    });

    it('works if the order consumes all remaining availability', async function() {
      setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 0 ]
      );

      let ret = await sheet.setOrdered('uid', 3, 5);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 0,
        '3.ordered': 5
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ 5 ] }
      });
    });

    it('accounts for the current ordered quantity when checking availability', async function() {
      setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('uid', 3, 4);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 1,
        '3.ordered': 4
      });

      expect(values.update).to.have.been.calledOnceWith({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ 4 ] }
      });
    });

    it('fails on a negative quantity or unknown product', async function() {
      setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'uid', 3, 0, 0 ]
      );

      await expect(sheet.setOrdered('uid', 3, -2)).to.eventually.be.rejectedWith(SheetsError, negativeQuantity);
      await expect(sheet.setOrdered('uid', 7, 3)).to.eventually.be.rejectedWith(SheetsError, productNotFound);
      expect(values.update).to.not.have.been.called;
      expect(values.batchUpdate).to.not.have.been.called;
    });

    it('fails if the order exceeds the availability', async function() {
      setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 2 ],
        [ 'uid', 3, 0, 3 ]
      );

      await expect(sheet.setOrdered('uid', 3, 5)).to.eventually.be.rejectedWith(SheetsError, quantityNotAvailable);
      expect(values.update).to.not.have.been.called;
      expect(values.batchUpdate).to.not.have.been.called;
    });

    it('fails if there is no orders sheet', async function() {
      getStub.resetBehavior();
      getStub.rejects({ code: 400 });

      await expect(sheet.setOrdered('uid', 3, 3)).to.eventually.be.rejectedWith(SheetsError, sheetNotFound);
    });
  });
});
