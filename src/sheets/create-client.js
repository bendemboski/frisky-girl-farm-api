const { google } = require('googleapis');

const scopes = [ 'https://www.googleapis.com/auth/spreadsheets' ];

// Create an authenticated Google sheets API client
async function createClient({ email, key } = {}) {
  let jwtClient = new google.auth.JWT(email, null, key, scopes);
  await jwtClient.authorize();
  return google.sheets({
    auth: jwtClient,
    version: 'v4'
  });
}

module.exports = createClient;
