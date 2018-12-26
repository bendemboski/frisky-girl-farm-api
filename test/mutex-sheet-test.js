require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const MutexSheet = require('../src/sheets/mutex-sheet');
const { SpreadsheetLockedError } = require('../src/sheets/errors');
const MockSheetsClient = require('./support/mock-sheets-client');

describe('MutexSheet', function() {
  let client;
  let sheet;

  beforeEach(function() {
    client = new MockSheetsClient();

    sheet = new MutexSheet({
      client,
      spreadsheetId: 'ssid'
    });
    sheet.retryInterval = 10;
  });

  afterEach(function() {
    sinon.restore();
  });

  it('locks when the sheet is empty', async function() {
    client.setMutexUnlocked();

    let now = new Date();
    sinon.useFakeTimers(now);

    await expect(sheet.lock('ashley@friskygirlfarm.com')).to.eventually.be.fulfilled;
    expect(client.spreadsheets.values.append).to.have.been.calledOnce;
    expect(client.spreadsheets.values.append).to.have.been.calledWithMatch({
      spreadsheetId: 'ssid',
      range: 'Mutex!A1',
      requestBody: {
        values: [ 'ashley@friskygirlfarm.com', now.toISOString() ]
      }
    });
  });

  it('it does not lock when the sheet is not empty', async function() {
    client.setMutexLocked();

    await expect(sheet.lock('ashley@friskygirlfarm.com')).to.eventually.be.rejectedWith(SpreadsheetLockedError);
    expect(client.spreadsheets.values.append).to.have.been.called;
    expect(client.spreadsheets.values.clear).to.have.callCount(client.spreadsheets.values.append.callCount);
    expect(client.spreadsheets.values.clear).to.have.been.calledWithMatch({
      spreadsheetId: 'ssid',
      range: 'Mutex!A3:B3'
    });
  });

  it('it locks when the lock is released during the lock operation', async function() {
    client.spreadsheets.values.append = client.spreadsheets.values.append || sinon.stub();
    client.spreadsheets.values.append.onFirstCall().resolves({
      data: {
        updates: {
          updatedRange: 'Mutex!A3:B3'
        }
      }
    });
    client.spreadsheets.values.append.onSecondCall().resolves({
      data: {
        updates: {
          updatedRange: 'Mutex!A2:B2'
        }
      }
    });
    client.spreadsheets.values.clear = client.spreadsheets.values.clear || sinon.stub();

    await expect(sheet.lock('ashley@friskygirlfarm.com')).to.eventually.be.fulfilled;
    expect(client.spreadsheets.values.append).to.have.been.calledTwice;
    expect(client.spreadsheets.values.clear).to.have.been.calledOnce;
    expect(client.spreadsheets.values.append.secondCall).to.have.been.calledWithMatch({
      spreadsheetId: 'ssid',
      range: 'Mutex!A1',
      requestBody: { values: sinon.match.array.startsWith([ 'ashley@friskygirlfarm.com' ]) }
    });
  });

  it('unlocks', async function() {
    client.stubUnlockMutex();

    await expect(sheet.unlock('ashley@friskygirlfarm.com')).to.eventually.be.fulfilled;
    expect(client.spreadsheets.values.clear).to.have.been.calledOnce;
    expect(client.spreadsheets.values.clear.firstCall).to.have.been.calledWithMatch({
      spreadsheetId: 'ssid',
      range: 'Mutex!A2:B2'
    });
  });
});
