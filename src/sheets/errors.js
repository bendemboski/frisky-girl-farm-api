class SheetsError extends Error {
}

function makeError(statusCode, code) {
  class Err extends SheetsError {
    constructor(extra) {
      super(code);
      Error.captureStackTrace(this, Err);
      this.statusCode = statusCode;
      this.code = code;
      this.extra = extra;
    }
  }
  return Err;
}

const OrdersNotOpenError = makeError(404, 'ordersNotOpen');
const NegativeQuantityError = makeError(400, 'negativeQuantity');
const ProductNotFoundError = makeError(404, 'productNotFound');
const QuantityNotAvailableError = makeError(409, 'quantityNotAvailable');
const UnknownUserError = makeError(401, 'unknownUser');

module.exports = {
  SheetsError,
  OrdersNotOpenError,
  NegativeQuantityError,
  ProductNotFoundError,
  QuantityNotAvailableError,
  UnknownUserError
};
