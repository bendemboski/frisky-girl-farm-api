const Sheet = require('./sheet');
const { SpreadsheetLockedError } = require('./errors');

const sheetName = 'Mutex';
const mutexLockedRange = 'A2:B2';

const retryInterval = 500;
const maxTries = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//
// The Mutex sheet is used for locking the spreadsheet to prevent concurrent
// access allowing the orders to exceed the availability. It contains a single
// header row, and clients append a row and if they end up being the first row
// before the header, then they get the lock.
//
// If a client ends up not in the first row, they will retry every
// `retryInterval` milliseconds up to `maxTries` times before giving up and
// telling the user to try again later.
//
class MutexSheet extends Sheet {
  constructor({ client, spreadsheetId }) {
    super({ client, spreadsheetId, sheetName });
  }

  // Try to lock the mutex, throwing a SheetLockedError() if unable to
  async lock(userId) {
    let tries = 0;
    while (!await this._tryLock(userId)) {
      if (++tries === maxTries) {
        throw new SpreadsheetLockedError();
      }
      await sleep(this.retryInterval || retryInterval);
    }
  }

  // Unlock the mutex
  async unlock() {
    await this.clear(mutexLockedRange);
  }

  async _tryLock(userId) {
    let appendedRange = await this.append('A1', [ userId, new Date().toISOString() ]);
    if (appendedRange === mutexLockedRange) {
      return true;
    } else {
      await this.clear(appendedRange);
      return false;
    }
  }
}

module.exports = MutexSheet;
