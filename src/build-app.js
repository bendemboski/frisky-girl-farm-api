const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const asyncHandler = require('express-async-handler');

const {
  SheetsError,
  UnknownUserError
} = require('./sheets/errors');

function serializeProducts(products) {
  return {
    products: Object.keys(products).map((id) => {
      return Object.assign({ id: `${id}` }, products[id]);
    })
  };
}

function buildApp(spreadsheetFactory) {
  let app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({
    type: [ 'application/json' ]
  }));
  app.use(cors());

  //
  // get current user
  //
  app.get('/users/:id', asyncHandler(async (req, res) => {
    let {
      params: { id: userId }
    } = req;

    let spreadsheet = await spreadsheetFactory();
    try {
      let user = await spreadsheet.getUser(userId);
      return res.status(200).json(user);
    } catch (e) {
      if (e instanceof UnknownUserError) {
        return res.status(404).json({ code: e.code });
      }
      throw e;
    }
  }));

  //
  // get products
  //
  app.get('/products', asyncHandler(async (req, res) => {
    let {
      query: { userId }
    } = req;

    let spreadsheet = await spreadsheetFactory();
    let products = await spreadsheet.getProducts(userId);
    return res.status(200).json(serializeProducts(products));
  }));

  //
  // set user's order for a product
  //
  app.put('/products/:id', asyncHandler(async (req, res) => {
    let {
      query: { userId },
      params: { id: productId },
      body: { ordered }
    } = req;

    let spreadsheet = await spreadsheetFactory();

    // Verify that the user exists
    await spreadsheet.getUser(userId);

    if (typeof ordered !== 'number' || ordered < 0) {
      return res.status(400).json({ code: 'badInput', message: "Must specify 'ordered' as a non-negative number" });
    }

    let products = await spreadsheet.setProductOrder(userId, parseInt(productId, 10), ordered);
    return res.status(200).json(serializeProducts(products));
  }));

  // Log errors
  app.use(function(err, req, res, next) {
    if (err instanceof SheetsError) {
      // One of our sheets errors
      let { code, extra } = err;
      res.status(err.statusCode).json({ code, extra });
    } else {
      console.error(err); // eslint-disable-line no-console
      next(err);
    }
  });

  return app;
}

module.exports = buildApp;