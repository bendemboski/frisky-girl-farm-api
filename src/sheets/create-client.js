const { google } = require('googleapis');
const path = require('path');
const { readFileSync } = require('fs');

const credentialsPath = path.resolve(__dirname, '..', '..', 'credentials.json');
const { client_email: email, private_key: key } = JSON.parse(readFileSync(credentialsPath));
const scopes = [ 'https://www.googleapis.com/auth/spreadsheets' ];

// Create an authenticated Google sheets API client
async function createClient() {
  let jwtClient = new google.auth.JWT(email, null, key, scopes);
  await jwtClient.authorize();
  return google.sheets({
    auth: jwtClient,
    version: 'v4'
  });
}

module.exports = createClient;
