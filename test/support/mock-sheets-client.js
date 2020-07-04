const sinon = require('sinon');

class MockSheetsClient {
  constructor() {
    this.spreadsheets = { values: {} };
  }

  setUsers(extraUsers = []) {
    this.spreadsheets.values.get = this.spreadsheets.values.get || sinon.stub();

    this.spreadsheets.values.get.withArgs({
      spreadsheetId: 'ssid',
      range: 'Users',
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE'
    }).resolves({
      data: {
        values: [
          [ 'email', 'name', 'location', 'balance', 'starting balance', 'spent' ],
          [ 'ellen@friskygirlfarm.com', 'Ellen Scheffer', 'Lake City', 25.00, 100.00, 75.00 ],
          [ 'ashley@friskygirlfarm.com', 'Ashley Wilson', 'Wallingford', 45.00, 100.00, 55.00 ],
          ...extraUsers
        ]
      }
    });
  }

  setNoOrders() {
    this._stubGetOrders().rejects({ code: 400 });
  }

  setOrders(totals, ...users) {
    let ordered = [ 0, 0, 0 ];
    users.forEach((orders) => {
      ordered[0] += orders[1] || 0;
      ordered[1] += orders[2] || 0;
      ordered[2] += orders[3] || 0;
    });

    this._stubGetOrders().resolves({
      data: {
        values: [
          [ '', 'price', 'image', 'total', 'ordered', ...users.map((u) => u[0]) ],
          [ 'Lettuce', 0.15, 'http://lettuce.com/image.jpg', totals[0], ordered[0], ...users.map((u) => u[1]) ],
          [ 'Kale', 0.85, 'http://kale.com/image.jpg', totals[1], ordered[1], ...users.map((u) => u[2]) ],
          [ 'Spicy Greens', 15.00, 'http://spicy-greens.com/image.jpg', totals[2], ordered[2], ...users.map((u) => u[3]) ]
        ]
      }
    });
  }

  resetOrders() {
    this._stubGetOrders().resetBehavior();
  }

  stubAppendOrder() {
    this.spreadsheets.values.append = this.spreadsheets.values.append || sinon.stub();
    this.spreadsheets.values.append.withArgs(sinon.match({
      spreadsheetId: 'ssid',
      range: 'Orders!A6'
    })).resolves({ data: { updates: { updatedRange: 'Orders!A8:D8' } } });
  }

  stubUpdateOrder() {
    this.spreadsheets.values.update = this.spreadsheets.values.update || sinon.stub();
    this.spreadsheets.values.update.withArgs(sinon.match({ range: 'Orders!' })).resolves();
  }

  _stubGetOrders() {
    this.spreadsheets.values.get = this.spreadsheets.values.get || sinon.stub();

    return this.spreadsheets.values.get.withArgs({
      spreadsheetId: 'ssid',
      range: 'Orders',
      majorDimension: 'COLUMNS',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
  }
}

module.exports = MockSheetsClient;
