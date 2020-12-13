
const buildApp = require('../src/build-app');
const createSpreadsheet = require('./create-spreadsheet');

let [ , , stage = 'staging' ] = process.argv;

console.log(`Running against stage: ${stage}`); // eslint-disable-line no-console

let app = buildApp(() => createSpreadsheet(stage));
app.listen(3000);
