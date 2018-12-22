const MutexSheet = require('./mutex-sheet');
const OrdersSheet = require('./orders-sheet');

class Spreadsheet {
  constructor({ id, client }) {
    this.mutex = new MutexSheet({ client, spreadsheetId: id });
    this.orders = new OrdersSheet({ client, spreadsheetId: id });
  }

  async getProducts(userId) {
    let { products } = await this.orders.getForUser(userId);
    return products;
  }

  async setProductOrdered(userId, productName, quantity) {
    await this.mutex.lock();

    try {
      return await this.orders.setOrdered(userId, productName, quantity);
    } finally {
      this.mutex.unlock();
    }
  }
}

module.exports = Spreadsheet;
