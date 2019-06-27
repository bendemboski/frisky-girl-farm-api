const Sheet = require('./sheet');
const { SpreadsheetLockedError } = require('./errors');
const log = require('../log');

const sheetName = 'Mutex';
const mutexLockedRange = 'A2:B2';

const retryInterval = 1000;
const maxSeconds = 15;

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
    let start = new Date();
    let maxTime = this.maxTime || (maxSeconds * 1000);

    while (!await this._tryLock(userId)) {
      if (new Date() - start > maxTime) {
        log('Exceeded max time to lock mutex');
        throw new SpreadsheetLockedError();
      }
      await sleep(this.retryInterval || retryInterval);
    }
  }

  // Unlock the mutex
  async unlock() {
    log('Unlocking mutex');
    await this.clear(mutexLockedRange);
    log('Mutex unlocked');
  }

  async _tryLock(userId) {
    log('Trying to lock mutex');
    let appendedRange = await this.append('A1', [ userId, new Date().toISOString() ]);
    if (appendedRange === mutexLockedRange) {
      log('Mutex locked!');
      return true;
    } else {
      log('Mutex not locked, clearing');
      await this.clear(appendedRange);
      log('Mutex cleared');
      return false;
    }
  }
}

module.exports = MutexSheet;
