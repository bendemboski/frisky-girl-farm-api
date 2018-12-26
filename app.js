const sls = require('serverless-http');
const createClient = require('./src/sheets/create-client');
const Spreadsheet = require('./src/sheets/spreadsheet');
const buildApp = require('./src/build-app');

module.exports = {
  server: sls(buildApp(async () => new Spreadsheet({
    id: process.env.GOOGLE_SPREADSHEET_ID,
    client: await createClient({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_CLIENT_PRIVATE_KEY
    })
  })))
};
