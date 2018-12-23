class OrdersSheetError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, OrdersSheetError);
    this.isSheetsError = true;
  }
}

class SheetNotFoundError extends OrdersSheetError {
  constructor(...args) {
    super(...args);
    this.code = 'sheetNotFound';
  }
}
class SpreadsheetLockedError extends OrdersSheetError {
  constructor(...args) {
    super(...args);
    this.code = 'spreadsheetLocked';
  }
}
class NegativeQuantityError extends OrdersSheetError {
  constructor(...args) {
    super(...args);
    this.code = 'negativeQuantity';
  }
}
class ProductNotFoundError extends OrdersSheetError {
  constructor(...args) {
    super(...args);
    this.code = 'productNotFound';
  }
}
class QuantityNotAvailableError extends OrdersSheetError {
  constructor(...args) {
    super(...args);
    this.code = 'quantityNotAvailable';
  }
}

module.exports = {
  SheetNotFoundError,
  SpreadsheetLockedError,
  NegativeQuantityError,
  ProductNotFoundError,
  QuantityNotAvailableError
};
