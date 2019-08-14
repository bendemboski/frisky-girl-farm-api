require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const OrdersSheet = require('../src/sheets/orders-sheet');
const {
  OrdersNotOpenError,
  NegativeQuantityError,
  ProductNotFoundError,
  QuantityNotAvailableError
} = require('../src/sheets/errors');
const MockSheetsClient = require('./support/mock-sheets-client');

describe('OrdersSheet', function() {
  let client;
  let sheet;

  beforeEach(function() {
    client = new MockSheetsClient();
    sheet = new OrdersSheet({
      client,
      spreadsheetId: 'ssid'
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('getForUser', function() {
    it('includes name, image URL and price', async function() {
      client.setOrders(
        [ 1, 1, 1 ]
      );

      let ret = await sheet.getForUser('ashley@friskygirlfarm.com');
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
      client.setOrders(
        [ 1, 0, 1 ]
      );

      let ret = await sheet.getForUser('ashley@friskygirlfarm.com');
      expect(ret.products).to.have.keys('1', '3');
      expect(ret).to.deep.nested.include({
        'products.1.name': 'Lettuce',
        'products.3.name': 'Spicy Greens'
      });
    });

    it('works with no users', async function() {
      client.setOrders(
        [ 7, 3, 5 ]
      );

      let ret = await sheet.getForUser('ashley@friskygirlfarm.com');
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
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 2 ]
      );

      let ret = await sheet.getForUser('ashley@friskygirlfarm.com');
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
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 2 ]
      );

      let ret = await sheet.getForUser('ashley@friskygirlfarm.com');
      expect(ret).to.deep.nested.include({
        'products.1.available': 4,
        'products.1.ordered': 4,
        'products.2.available': 1,
        'products.2.ordered': 0,
        'products.3.available': 3,
        'products.3.ordered': 1
      });
    });

    it('works with blank user cells', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, '', 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, '' ]
      );

      let ret = await sheet.getForUser('ashley@friskygirlfarm.com');
      expect(ret).to.deep.nested.include({
        'products.1.available': 4,
        'products.1.ordered': 4,
        'products.2.available': 1,
        'products.2.ordered': 0,
        'products.3.available': 5,
        'products.3.ordered': 1
      });
    });

    it('fails if there is no orders sheet', async function() {
      client.setNoOrders();
      await expect(sheet.getForUser('ashley@friskygirlfarm.com')).to.eventually.be.rejectedWith(OrdersNotOpenError);
    });
  });

  describe('setOrdered', function() {
    beforeEach(function() {
      client.stubUpdateOrder();
    });

    it('works when the user has no row', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );
      client.stubAppendOrder();

      let ret = await sheet.setOrdered('ashley@friskygirlfarm.com', 3, 2);
      expect(ret).to.deep.nested.include({
        '1.available': 0,
        '1.ordered': 0,
        '2.available': 1,
        '2.ordered': 0,
        '3.available': 4,
        '3.ordered': 2
      });

      expect(client.spreadsheets.values.append).to.have.been.calledOnce;
      expect(client.spreadsheets.values.append).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!A6',
        requestBody: { values: [ [ 'ashley@friskygirlfarm.com', 0, 0, 2 ] ] }
      });
    });

    it('works when the user has a row', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 0 ]
      );

      let ret = await sheet.setOrdered('ashley@friskygirlfarm.com', 3, 2);
      expect(ret).to.deep.nested.include({
        '1.available': 3,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 4,
        '3.ordered': 2
      });

      expect(client.spreadsheets.values.update).to.have.been.calledOnce;
      expect(client.spreadsheets.values.update).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ [ 2 ] ] }
      });
    });

    it('works for increasing the quantity of a product', async function() {
      client.setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 1 ]
      );

      let ret = await sheet.setOrdered('ashley@friskygirlfarm.com', 3, 3);
      expect(ret).to.deep.nested.include({
        '1.available': 3,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 5,
        '3.ordered': 3
      });

      expect(client.spreadsheets.values.update).to.have.been.calledOnce;
      expect(client.spreadsheets.values.update).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ [ 3 ] ] }
      });
    });

    it('works for decreasing the quantity of a product', async function() {
      client.setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('ashley@friskygirlfarm.com', 3, 2);
      expect(ret).to.deep.nested.include({
        '1.available': 3,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 5,
        '3.ordered': 2
      });

      expect(client.spreadsheets.values.update).to.have.been.calledOnce;
      expect(client.spreadsheets.values.update).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ [ 2 ] ] }
      });
    });

    it('works for zeroing out the quantity of a product', async function() {
      client.setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('ashley@friskygirlfarm.com', 3, 0);
      expect(ret).to.deep.nested.include({
        '1.available': 3,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 5,
        '3.ordered': 0
      });

      expect(client.spreadsheets.values.update).to.have.been.calledOnce;
      expect(client.spreadsheets.values.update).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ [ 0 ] ] }
      });
    });

    it('works if the order consumes all remaining availability', async function() {
      client.setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 0 ]
      );

      let ret = await sheet.setOrdered('ashley@friskygirlfarm.com', 3, 5);
      expect(ret).to.deep.nested.include({
        '1.available': 3,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 5,
        '3.ordered': 5
      });

      expect(client.spreadsheets.values.update).to.have.been.calledOnce;
      expect(client.spreadsheets.values.update).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ [ 5 ] ] }
      });
    });

    it('accounts for the current ordered quantity when checking availability', async function() {
      client.setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 3 ]
      );

      let ret = await sheet.setOrdered('ashley@friskygirlfarm.com', 3, 4);
      expect(ret).to.deep.nested.include({
        '1.available': 3,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 0,
        '3.available': 5,
        '3.ordered': 4
      });

      expect(client.spreadsheets.values.update).to.have.been.calledOnce;
      expect(client.spreadsheets.values.update).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!D7',
        requestBody: { values: [ [ 4 ] ] }
      });
    });

    it('fails on a negative quantity or unknown product', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'uid1', 4, 0, 1 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 0 ]
      );

      await expect(sheet.setOrdered('ashley@friskygirlfarm.com', 3, -2)).to.eventually.be.rejectedWith(NegativeQuantityError);
      await expect(sheet.setOrdered('ashley@friskygirlfarm.com', 7, 3)).to.eventually.be.rejectedWith(ProductNotFoundError);
      expect(client.spreadsheets.values.update).to.not.have.been.called;
    });

    it('fails if the product is disabled', async function() {
      client.setOrders(
        [ 7, 3, 0 ],
        [ 'uid1', 4, 0, 0 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 0 ]
      );

      await expect(sheet.setOrdered('ashley@friskygirlfarm.com', 3, 1)).to.eventually.be.rejectedWith(ProductNotFoundError);
      expect(client.spreadsheets.values.update).to.not.have.been.called;
    });

    it('fails if the order exceeds the availability', async function() {
      client.setOrders(
        [ 7, 3, 6 ],
        [ 'uid1', 4, 0, 2 ],
        [ 'ashley@friskygirlfarm.com', 3, 0, 3 ]
      );

      await expect(sheet.setOrdered('ashley@friskygirlfarm.com', 3, 5))
        .to.eventually.be.rejectedWith(QuantityNotAvailableError)
        .with.nested.property('extra.available', 4);
      expect(client.spreadsheets.values.update).to.not.have.been.called;
    });

    it('fails if there is no orders sheet', async function() {
      client.setNoOrders();
      await expect(sheet.setOrdered('ashley@friskygirlfarm.com', 3, 3)).to.eventually.be.rejectedWith(OrdersNotOpenError);
    });
  });
});
