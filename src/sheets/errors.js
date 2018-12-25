class SheetsError extends Error {
}

function makeError(statusCode, code) {
  class Err extends SheetsError {
    constructor(...args) {
      super(code, ...args);
      Error.captureStackTrace(this, Err);
      this.statusCode = statusCode;
      this.code = code;
    }
  }
  return Err;
}

const OrdersNotOpenError = makeError(404, 'ordersNotOpen');
const SpreadsheetLockedError = makeError(423, 'spreadsheetLocked');
const NegativeQuantityError = makeError(400, 'negativeQuantity');
const ProductNotFoundError = makeError(404, 'productNotFound');
const QuantityNotAvailableError = makeError(409, 'quantityNotAvailable');
const UserNotFoundError = makeError(401, 'userNotFound');

const sheetNotFound = 'sheetNotFound';
const spreadsheetLocked = 'spreadsheetLocked';
const negativeQuantity = 'negativeQuantity';
const productNotFound = 'productNotFound';
const quantityNotAvailable = 'quantityNotAvailable';
const userNotFound = 'userNotFound';

module.exports = {
  SheetsError,
  OrdersNotOpenError,
  SpreadsheetLockedError,
  NegativeQuantityError,
  ProductNotFoundError,
  QuantityNotAvailableError,
  UserNotFoundError,
  sheetNotFound,
  spreadsheetLocked,
  negativeQuantity,
  productNotFound,
  quantityNotAvailable,
  userNotFound
};
