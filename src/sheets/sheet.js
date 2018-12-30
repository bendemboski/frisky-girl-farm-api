//
// Base class representing a sheet within a spreadsheet
//
class Sheet {
  constructor({ client, spreadsheetId, sheetName }) {
    this.client = client;
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName;
  }

  async getAll({ majorDimension } = {}) {
    let { data: { values } } = await this._values.get({
      spreadsheetId: this.spreadsheetId,
      range: this.sheetName,
      majorDimension,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    return values;
  }

  async append(range, values) {
    let {
      data: {
        updates: {
          updatedRange
        }
      }
    } = await this._values.append({
      spreadsheetId: this.spreadsheetId,
      range: this._range(range),
      valueInputOption: 'RAW',
      requestBody: { values: [ values ] }
    });
    return updatedRange.split('!')[1];
  }

  async update(range, values, { majorDimension } = {}) {
    let requestBody = { values };
    if (majorDimension) {
      requestBody.majorDimension = majorDimension;
    }
    await this._values.update({
      spreadsheetId: this.spreadsheetId,
      range: this._range(range),
      valueInputOption: 'RAW',
      requestBody
    });
  }

  async clear(range) {
    await this._values.clear({
      spreadsheetId: this.spreadsheetId,
      range: this._range(range)
    });
  }

  get _values() {
    return this.client.spreadsheets.values;
  }

  _range(range) {
    return `${this.sheetName}!${range}`;
  }
}

module.exports = Sheet;
