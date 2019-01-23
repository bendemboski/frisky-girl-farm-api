const { readFileSync } = require('fs');
const path = require('path');

const createClient = require('../src/sheets/create-client');
const Spreadsheet = require('../src/sheets/spreadsheet');

async function createSpreadsheet(stage = 'prod') {
  let { privateKey, email, spreadsheetId } = JSON.parse(readFileSync(path.join(__dirname, '..', `config.${stage}.json`)));

  return new Spreadsheet({
    id: spreadsheetId,
    client: await createClient({
      email,
      key: privateKey
    })
  });
}

module.exports = createSpreadsheet;
