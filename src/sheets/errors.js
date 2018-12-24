class SheetsError extends Error {
  constructor(code, ...args) {
    super(code, ...args);
    Error.captureStackTrace(this, SheetsError);
    this.isSheetsError = true;
    this.code = code;
  }
}

const sheetNotFound = 'sheetNotFound';
const spreadsheetLocked = 'spreadsheetLocked';
const negativeQuantity = 'negativeQuantity';
const productNotFound = 'productNotFound';
const quantityNotAvailable = 'quantityNotAvailable';

module.exports = {
  SheetsError,
  sheetNotFound,
  spreadsheetLocked,
  negativeQuantity,
  productNotFound,
  quantityNotAvailable
};
