const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const asyncHandler = require('express-async-handler');

const createClient = require('./sheets/create-client');
const Spreadsheet = require('./sheets/spreadsheet');

function buildApp() {
  let app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({
    type: [ 'application/json' ]
  }));
  app.use(cors());

  let spreadsheet = new Spreadsheet({
    id: process.env.GOOGLE_SPREADSHEET_ID,
    client: createClient({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_CLIENT_PRIVATE_KEY
    })
  });

  //
  // get products
  //
  app.get('/products', asyncHandler(async (req, res) => {
    let {
      query: { userId }
    } = req;

    return res.status(200).json(await spreadsheet.getProducts(userId));
  }));

  app.post('/products', asyncHandler(async (req, res) => {
    let {
      query: { userId },
      body: { product, quantity }
    } = req;

    if (!product || typeof product !== 'string') {
      return res.status(400).json({ code: 'badInput', message: "Must specify 'product' as a string" });
    }

    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ code: 'badInput', message: "Must specify 'quantity' as a non-negative number" });
    }

    return res.status(200).json(await spreadsheet.getProducts(userId, product, quantity));
  }));

  // Log errors
  app.use(function(err, req, res, next) {
    console.error(err); // eslint-disable-line no-console

    let { isSheetsError, code } = err;
    if (isSheetsError && code) {
      // One of our sheets errors
      res.status().json({ code });
    } else {
      next(err);
    }
  });

  return app;
}

module.exports = buildApp;