require('./support/setup');
const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const buildApp = require('../src/build-app');
const MockSheetsClient = require('./support/mock-sheets-client');
const Spreadsheet = require('../src/sheets/spreadsheet');

describe('API', function() {
  let client;
  let api;

  beforeEach(function() {
    client = new MockSheetsClient();
    client.setUsers();

    api = chai.request(buildApp(async () => {
      let spreadsheet = new Spreadsheet({
        id: 'ssid',
        client
      });
      return spreadsheet;
    }));
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('GET /users/:id', function() {
    it('works', async function() {
      let res = await api.get('/users/ashley@friskygirlfarm.com');
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        email: 'ashley@friskygirlfarm.com',
        name: 'Ashley Wilson',
        location: 'Wallingford',
        balance: 45.00
      });
    });

    it('fails when the user is not found', async function() {
      let res = await api.get('/users/becky@friskygirlfarm.com');
      expect(res).to.have.status(404);
      expect(res.body).to.include({ code: 'unknownUser' });
    });
  });

  describe('GET /products', function() {
    it('works', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );

      let res = await api.get('/products?userId=ashley@friskygirlfarm.com');
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        products: [
          {
            id: '1',
            name: 'Lettuce',
            imageUrl: 'http://lettuce.com/image.jpg',
            price: 0.15,
            available: 4,
            ordered: 4
          },
          {
            id: '2',
            name: 'Kale',
            imageUrl: 'http://kale.com/image.jpg',
            price: 0.85,
            available: 1,
            ordered: 0
          },
          {
            id: '3',
            name: 'Spicy Greens',
            imageUrl: 'http://spicy-greens.com/image.jpg',
            price: 15.00,
            available: 5,
            ordered: 1
          }
        ]
      });
    });

    it('works with 0/unlimited quantities', async function() {
      client.setOrders(
        [ 0, -1, 2 ],
        [ 'ashley@friskygirlfarm.com', 0, 2, 1 ],
        [ 'ellen@friskygirlfarm.com', 0, 0, 1 ]
      );

      let res = await api.get('/products?userId=ashley@friskygirlfarm.com');
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        products: [
          {
            id: '2',
            name: 'Kale',
            imageUrl: 'http://kale.com/image.jpg',
            price: 0.85,
            available: -1,
            ordered: 2
          },
          {
            id: '3',
            name: 'Spicy Greens',
            imageUrl: 'http://spicy-greens.com/image.jpg',
            price: 15.00,
            available: 1,
            ordered: 1
          }
        ]
      });
    });

    it('fails if ordering is not open', async function() {
      client.setNoOrders();
      let res = await api.get('/products?userId=ashley@friskygirlfarm.com');
      expect(res).to.have.status(404);
      expect(res.body).to.include({ code: 'ordersNotOpen' });
    });
  });

  describe('PUT /products/:id', async function() {
    it('works', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );
      client.stubUpdateOrder();

      let res = await api.put('/products/3?userId=ashley@friskygirlfarm.com').send({ ordered: 3 });
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        products: [
          {
            id: '1',
            name: 'Lettuce',
            imageUrl: 'http://lettuce.com/image.jpg',
            price: 0.15,
            available: 4,
            ordered: 4
          },
          {
            id: '2',
            name: 'Kale',
            imageUrl: 'http://kale.com/image.jpg',
            price: 0.85,
            available: 1,
            ordered: 0
          },
          {
            id: '3',
            name: 'Spicy Greens',
            imageUrl: 'http://spicy-greens.com/image.jpg',
            price: 15.00,
            available: 5,
            ordered: 3
          }
        ]
      });

      expect(client.spreadsheets.values.update).to.have.been.calledOnce;
      expect(client.spreadsheets.values.update).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!D6',
        requestBody: { values: [ [ 3 ] ] }
      });
    });

    it('works with unlimited quantities', async function() {
      client.setOrders(
        [ -1, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );
      client.stubUpdateOrder();

      let res = await api.put('/products/1?userId=ashley@friskygirlfarm.com').send({ ordered: 7 });
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({
        products: [
          {
            id: '1',
            name: 'Lettuce',
            imageUrl: 'http://lettuce.com/image.jpg',
            price: 0.15,
            available: -1,
            ordered: 7
          },
          {
            id: '2',
            name: 'Kale',
            imageUrl: 'http://kale.com/image.jpg',
            price: 0.85,
            available: 1,
            ordered: 0
          },
          {
            id: '3',
            name: 'Spicy Greens',
            imageUrl: 'http://spicy-greens.com/image.jpg',
            price: 15.00,
            available: 5,
            ordered: 1
          }
        ]
      });

      expect(client.spreadsheets.values.update).to.have.been.calledOnce;
      expect(client.spreadsheets.values.update).to.have.been.calledWithMatch({
        spreadsheetId: 'ssid',
        range: 'Orders!B6',
        requestBody: { values: [ [ 7 ] ] }
      });
    });

    it('fails if the user is unknown', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );

      let res = await api.put('/products/3?userId=becky@friskygirlfarm.com').send({ ordered: 3 });
      expect(res).to.have.status(401);
      expect(res.body).to.include({ code: 'unknownUser' });
    });

    it('fails if `ordered` is missing', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );

      let res = await api.put('/products/3?userId=ashley@friskygirlfarm.com').send({ blurble: 3 });
      expect(res).to.have.status(400);
      expect(res.body).to.include({ code: 'badInput' });
    });

    it('fails if `ordered` is not a number', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );

      let res = await api.put('/products/3?userId=ashley@friskygirlfarm.com').send({ ordered: 'foo' });
      expect(res).to.have.status(400);
      expect(res.body).to.include({ code: 'badInput' });
    });

    it('fails if `ordered` is negative', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );

      let res = await api.put('/products/3?userId=ashley@friskygirlfarm.com').send({ ordered: -2 });
      expect(res).to.have.status(400);
      expect(res.body).to.include({ code: 'badInput' });
    });

    it('fails if ordering is not open', async function() {
      client.setNoOrders();

      let res = await api.put('/products/3?userId=ashley@friskygirlfarm.com').send({ ordered: 3 });
      expect(res).to.have.status(404);
      expect(res.body).to.include({ code: 'ordersNotOpen' });
    });

    it('fails if the product is not found', async function() {
      client.setOrders(
        [ 7, 3, 5 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 1 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );

      let res = await api.put('/products/9?userId=ashley@friskygirlfarm.com').send({ ordered: 3 });
      expect(res).to.have.status(404);
      expect(res.body).to.include({ code: 'productNotFound' });
    });

    it('fails if the product is not available', async function() {
      client.setOrders(
        [ 7, 3, 0 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 0 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 0 ]
      );

      let res = await api.put('/products/3?userId=ashley@friskygirlfarm.com').send({ ordered: 3 });
      expect(res).to.have.status(404);
      expect(res.body).to.include({ code: 'productNotFound' });
    });

    it('fails if the order exceeds the quantity available', async function() {
      client.setOrders(
        [ 7, 3, 4 ],
        [ 'ashley@friskygirlfarm.com', 4, 0, 0 ],
        [ 'ellen@friskygirlfarm.com', 3, 2, 2 ]
      );

      let res = await api.put('/products/3?userId=ashley@friskygirlfarm.com').send({ ordered: 3 });
      expect(res).to.have.status(409);
      expect(res.body).to.deep.include({
        code: 'quantityNotAvailable',
        extra: { available: 2 }
      });
    });
  });
});
