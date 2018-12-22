const createClient = require('./create-client');
const Spreadsheet = require('./spreadsheet');

const spreadsheetId = '1UlkZvwdVadW-Dc_1QhzZ8DbkVPFv9LskVH0_S702t28';

async function createSpreadsheet() {
  return new Spreadsheet({ id: spreadsheetId, client: await createClient() });
}
