class OrdersSheetError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, OrdersSheetError);
  }
}

class SheetNotFoundError extends OrdersSheetError {}
class SpreadsheetLockedError extends OrdersSheetError {}
class NegativeQuantityError extends OrdersSheetError {}
class ProductNotFoundError extends OrdersSheetError {}
class QuantityNotAvailableError extends OrdersSheetError {}

module.exports = {
  SheetNotFoundError,
  SpreadsheetLockedError,
  NegativeQuantityError,
  ProductNotFoundError,
  QuantityNotAvailableError
};
