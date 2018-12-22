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
    return await this._values.get({
      spreadsheetId: this.spreadsheetId,
      range: this.sheetName,
      majorDimension
    });
  }

  async getRange(range) {
    return await this._values.get({
      spreadsheetId: this.spreadsheetId,
      range: this._range(range)
    });
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
      requestBody: { values }
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
      requestBody
    });
  }

  async batchUpdate(updates) {
    await this._values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        data: updates.map(({ range, majorDimension, values }) => {
          let ret = {
            range: this._range(range),
            values
          };
          if (majorDimension) {
            ret.majorDimension = majorDimension;
          }
          return ret;
        })
      }
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
