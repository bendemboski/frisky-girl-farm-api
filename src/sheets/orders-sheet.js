const Sheet = require('./sheet');
const { indexToColumn } = require('./a1-utils');
const {
  OrdersNotOpenError,
  NegativeQuantityError,
  ProductNotFoundError,
  QuantityNotAvailableError
} = require('./errors');

const sheetName = 'Orders';
const namesRowIndex = 0;
const pricesRowIndex = 1;
const imagesRowIndex = 2;
const limitsRowIndex = 3;
const totalsRowIndex = 4;
const firstUserRowIndex = 5;

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
  // `{ products, userRowIndex }`. `userRowIndex` is the 0-based index within
  // the user rows of the row containing the user's order, or `-1` if the user
  // does not have an order yet. `products` is a hash whose keys are the
  // 0-based index of the column containing the product (which we use as
  // product ids) and whose values are
  // `{ name, imageUrl, price, available, ordered }`, where:
  // `name` is the name of the product
  // `imageUrl` is the URL of the product image
  // `price` is the price of the product
  // `available` is the number of units of the product available for to order,
  //             ignoring any they have already ordered (i.e. the max they
  //             could set their order to without exceeding availability). If
  //             there is no limit on the product, this will be set to -1.
  // `ordered` is the number of units of the product the user has ordered
  async getForUser(userId) {
    let columns;
    try {
      columns = await this.getAll({ majorDimension: 'COLUMNS' });
    } catch (e) {
      if (e.code === 400) {
        throw new OrdersNotOpenError();
      } else {
        throw e;
      }
    }

    // Row 0 contains the user ids for the user order rows.
    let userRowIndex = columns[0].slice(firstUserRowIndex).indexOf(userId);
    let products = {};
    columns.slice(1).forEach((column, i) => {
      let limit = column[limitsRowIndex];
      // has to be non-empty and non-zero for product to appear
      if (limit) {
        // Determine how many this user has ordered
        let ordered;
        if (userRowIndex !== -1) {
          ordered = column[firstUserRowIndex + userRowIndex] || 0;
        } else {
          ordered = 0;
        }

        let available;
        if (limit < 0) {
          available = -1;
        } else {
          // the limit minus the total is the *additional* units the user could
          // order, but we want the *total* units the user could order, so we
          // have to add back what they've already ordered
          available = limit - column[totalsRowIndex] + ordered;
        }

        // id is i + 1 because we're skipping the first column in our iteration
        products[i + 1] = {
          name: column[namesRowIndex],
          imageUrl: column[imagesRowIndex],
          price: column[pricesRowIndex],
          available,
          ordered
        };
      }
    });

    return { products, userRowIndex };
  }

  // Set the quantity ordered of a product for a user.
  async setOrdered(userId, productId, quantity) {
    if (quantity < 0) {
      throw new NegativeQuantityError();
    }

    let { products, userRowIndex } = await this.getForUser(userId);
    let product = products[productId];
    if (!product) {
      throw new ProductNotFoundError();
    }

    let { available } = product;
    if (available !== -1 && quantity > available) {
      throw new QuantityNotAvailableError({ available });
    }

    if (userRowIndex !== -1) {
      // Add 1 to row index because the rows in the A1 notation are 1-based
      await this.update(`${indexToColumn(productId)}${firstUserRowIndex + userRowIndex + 1}`, [ [ quantity ] ]);
    } else {
      let row = [ userId, ...Object.keys(products).map(() => 0) ];
      row[productId] = quantity;
      await this.append(`A${firstUserRowIndex + 1}`, row);
    }

    product.ordered = quantity;
    return products;
  }
}

module.exports = OrdersSheet;
