const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const asyncHandler = require('express-async-handler');

const createClient = require('./sheets/create-client');
const Spreadsheet = require('./sheets/spreadsheet');

async function getSpreadsheet() {
  return new Spreadsheet({
    id: process.env.GOOGLE_SPREADSHEET_ID,
    client: await createClient({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_CLIENT_PRIVATE_KEY
    })
  });
}

function buildApp() {
  let app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({
    type: [ 'application/json' ]
  }));
  app.use(cors());

  //
  // get products
  //
  app.get('/products', asyncHandler(async (req, res) => {
    let {
      query: { userId }
    } = req;

    let spreadsheet = await getSpreadsheet();
    let products = await spreadsheet.getProducts(userId);
    return res.status(200).json(Object.keys(products).map((id) => {
      return Object.assign({ id }, products[id]);
    }));
  }));

  app.put('/products/:id', asyncHandler(async (req, res) => {
    let {
      query: { userId },
      params: { id: productId },
      body: { quantity }
    } = req;

    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ code: 'badInput', message: "Must specify 'quantity' as a non-negative number" });
    }

    let spreadsheet = await getSpreadsheet();
    return res.status(200).json(await spreadsheet.setProductOrder(userId, productId, quantity));
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