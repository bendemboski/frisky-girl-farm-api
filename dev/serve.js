#!/usr/bin/env node

const buildApp = require('../src/build-app');
const createSpreadsheet = require('./create-spreadsheet');

let app = buildApp(createSpreadsheet);
app.listen(3000);
