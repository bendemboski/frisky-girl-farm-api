const Sheet = require('./sheet');
const { UserNotFoundError } = require('./errors');

const sheetName = 'Users';
const emailColumnIndex = 0;
const nameColumnIndex = 1;
const locationColumnIndex = 2;
const balanceColumnIndex = 3;

class UsersSheet extends Sheet {
  constructor({ client, spreadsheetId }) {
    super({ client, spreadsheetId, sheetName });
  }

  async getUser(userId) {
    let [ , ...users ] = await this.getAll({ majorDimension: 'ROWS' });
    let user = users.find((u) => u[emailColumnIndex] === userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      email: user[emailColumnIndex],
      name: user[nameColumnIndex],
      location: user[locationColumnIndex],
      balance: user[balanceColumnIndex]
    };
  }
}

module.exports = UsersSheet;
