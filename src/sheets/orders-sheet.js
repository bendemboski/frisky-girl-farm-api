const Sheet = require('./sheet');
const { indexToColumn } = require('./a1-utils');
const {
  SheetNotFoundError,
  NegativeQuantityError,
  ProductNotFoundError,
  QuantityNotAvailableError
} = require('./errors');

const sheetName = 'Orders';
const namesRowIndex = 0;
const limitsRowIndex = 1;
const totalsRowIndex = 2;
const firstUserRowIndex = 3;

//
// The orders sheet contains the current week's products and orders. Row 1,
// columns B and later contain the names of the products. Row 2, columns B
// and later contain the order limits for each product. Row 3, columns B and
// later contain formulas for the total quantity ordered for each product.
// Rows 4 and later contain the user orders, where column A is the user's id,
// and the other columns are the quantites of the products they have ordered
// (blank means 0).
//
class OrdersSheet extends Sheet {
  constructor({ client, spreadsheetId }) {
    super({ client, spreadsheetId, sheetName });
  }

  // Get the order data for a user. Used both to return to the client to render
  // the products, and to load just before modifying a user's order. Returns
  // `{ products: [ { [name]: column, available, ordered } ], numUsers, userIndex }`.
  // `name` is the name of the product
  // `column` is the A1-notation of the column containing the product
  // `available` is the number of units of the product still available to order
  // `ordered` is the number of units of the product the user has ordered
  // `numUsers` is the total numbers of rows containing user orders
  // `userIndex` is the index of the current user in the user rows, or -1
  async getForUser(userId) {
    let rows;
    try {
      rows = await this.getAll({ majorDimension: 'ROWS' });
    } catch (e) {
      if (e.code === 400) {
        throw new SheetNotFoundError();
      }
      throw e;
    }
    let [ , ...names ] = rows[namesRowIndex];
    let [ , ...limits ] = rows[limitsRowIndex];
    let [ , ...totals ] = rows[totalsRowIndex];
    let userRows = rows.slice(firstUserRowIndex);

    let products = {};
    names.forEach((name, i) => {
      products[name] = {
        column: indexToColumn(i + 1),
        available: limits[i] - totals[i],
        ordered: 0
      };
    });

    let userIndex = userRows.findIndex(([ rowUserId ]) => rowUserId === userId);
    if (userIndex !== -1) {
      userRows[userIndex].slice(1).forEach((ordered, i) => {
        products[names[i]].ordered = ordered || 0;
      });
    }

    return { products, numUsers: userRows.length, userIndex };
  }

  // Set the quantity ordered of a product for a user. Must be called with the
  // spreadsheet's mutex locked
  async setOrdered(userId, productName, quantity) {
    if (quantity < 0) {
      throw new NegativeQuantityError();
    }

    let data = await this.getForUser(userId);
    let { products, userIndex, numUsers } = data;
    let product = products[productName];
    if (!product) {
      throw new ProductNotFoundError();
    }

    let { column, available, ordered } = product;
    if (quantity > available + ordered) {
      throw new QuantityNotAvailableError();
    }

    if (userIndex !== -1) {
      await this.update(`${column}${firstUserRowIndex + userIndex + 1}`, [ quantity ]);
    } else {
      let newRowIndex = firstUserRowIndex + numUsers + 1;
      await this.batchUpdate([
        { range: `A${newRowIndex}`, values: [ userId ] },
        { range: `${column}${newRowIndex}`, values: [ quantity ] }
      ]);
      data.userIndex = numUsers;
      data.numUsers += 1;
    }

    product.available -= (quantity - product.ordered);
    product.ordered = quantity;
    return products;
  }
}

module.exports = OrdersSheet;
