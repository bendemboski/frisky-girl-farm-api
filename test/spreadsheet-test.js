require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const Spreadsheet = require('../src/sheets/spreadsheet');
const {
  OrdersNotOpenError,
  QuantityNotAvailableError,
  UnknownUserError
} = require('../src/sheets/errors');
const MockSheetsClient = require('./support/mock-sheets-client');

describe('Spreadsheet', function() {
  let client;
  let spreadsheet;

  beforeEach(function() {
    client = new MockSheetsClient();

    client.setUsers();
    client.setOrders(
      [ 7, 3, 5 ],
      [ 'ellen@friskygirlfarm.com', 4, 0, 1 ],
      [ 'ashley@friskygirlfarm.com', 3, 2, 0 ]
    );

    spreadsheet = new Spreadsheet({
      client,
      id: 'ssid'
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('getUser', function() {
    it('works', async function() {
      expect(await spreadsheet.getUser('ashley@friskygirlfarm.com')).to.deep.equal({
        email: 'ashley@friskygirlfarm.com',
        name: 'Ashley Wilson',
        location: 'Wallingford',
        balance: 45.00
      });
    });

    it('propagates errors', async function() {
      expect(spreadsheet.getUser('becky@friskygirlfarm.com')).to.eventually.be.rejectedWith(UnknownUserError);
    });
  });

  describe('getProducts', function() {
    it('works', async function() {
      let ret = await spreadsheet.getProducts('ashley@friskygirlfarm.com');
      expect(ret).to.deep.nested.include({
        '1.name': 'Lettuce',
        '1.imageUrl': 'http://lettuce.com/image.jpg',
        '1.price': 0.15,
        '1.available': 3,
        '1.ordered': 3,
        '2.name': 'Kale',
        '2.imageUrl': 'http://kale.com/image.jpg',
        '2.price': 0.85,
        '2.available': 3,
        '2.ordered': 2,
        '3.name': 'Spicy Greens',
        '3.imageUrl': 'http://spicy-greens.com/image.jpg',
        '3.price': 15.00,
        '3.available': 4,
        '3.ordered': 0
      });
    });

    it('propagates errors', async function() {
      client.setNoOrders();
      await expect(spreadsheet.getProducts('ashley@friskygirlfarm.com')).to.eventually.be.rejectedWith(OrdersNotOpenError);
    });
  });

  describe('setProductOrder', function() {
    it('works', async function() {
      client.stubUpdateOrder();

      let ret = await spreadsheet.setProductOrder('ashley@friskygirlfarm.com', 3, 3);
      expect(ret).to.deep.nested.include({
        '1.available': 3,
        '1.ordered': 3,
        '2.available': 3,
        '2.ordered': 2,
        '3.available': 4,
        '3.ordered': 3
      });
    });

    it('propagates errors', async function() {
      await expect(spreadsheet.setProductOrder('ashley@friskygirlfarm.com', 3, 6))
        .to.eventually.be.rejectedWith(QuantityNotAvailableError)
        .with.nested.property('extra.available', 4);

      client.resetOrders();
      client.setNoOrders();

      await expect(spreadsheet.setProductOrder('ashley@friskygirlfarm.com', 3, 1)).to.eventually.be.rejectedWith(OrdersNotOpenError);
    });
  });
});
