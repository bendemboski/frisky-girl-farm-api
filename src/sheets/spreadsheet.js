const UsersSheet = require('./users-sheet');
const OrdersSheet = require('./orders-sheet');
const log = require('../log');

class Spreadsheet {
  constructor({ id, client }) {
    this.users = new UsersSheet({ client, spreadsheetId: id });
    this.orders = new OrdersSheet({ client, spreadsheetId: id });
  }

  async getUser(userId) {
    return await this.users.getUser(userId);
  }

  async getProducts(userId) {
    let { products } = await this.orders.getForUser(userId);
    return products;
  }

  async setProductOrder(userId, productId, quantity) {
    try {
      log('setting order');
      return await this.orders.setOrdered(userId, productId, quantity);
    } catch (e) {
      log('failed to set order', e);
      throw e;
    }
  }
}

module.exports = Spreadsheet;
