require('./support/setup');
const { expect } = require('chai');
const sinon = require('sinon');
const MutexSheet = require('../src/sheets/mutex-sheet');
const { SheetLockedError } = require('../src/sheets/errors');

describe('MutexSheet', function() {
  let values;
  let sheet;

  beforeEach(function() {
    values = {};

    sheet = new MutexSheet({
      client: {
        spreadsheets: {
          values
        }
      },
      spreadsheetId: 'ssid'
    });
    sheet.retryInterval = 10;
  });

  afterEach(function() {
    sinon.restore();
  });

  it('locks when the sheet is empty', async function() {
    values.append = sinon.stub().resolves({
      data: {
        updates: {
          updatedRange: 'Mutex!A2:B2'
        }
      }
    });

    let now = new Date();
    sinon.useFakeTimers(now);

    await expect(sheet.lock('uid')).to.eventually.be.fulfilled;
    expect(values.append).to.have.been.calledOnce;
    expect(values.append).to.have.been.calledWithMatch({
      spreadsheetId: 'ssid',
      range: 'Mutex!A1',
      requestBody: {
        values: [ 'uid', now.toISOString() ]
      }
    });
  });

  it('it does not lock when the sheet is not empty', async function() {
    values.append = sinon.stub().resolves({
      data: {
        updates: {
          updatedRange: 'Mutex!A3:B3'
        }
      }
    });
    values.clear = sinon.stub().resolves();

    await expect(sheet.lock('uid')).to.eventually.be.rejectedWith(SheetLockedError);
    expect(values.append).to.have.been.called;
    expect(values.clear).to.have.callCount(values.append.callCount);
    expect(values.clear).to.have.been.calledWithMatch({
      spreadsheetId: 'ssid',
      range: 'Mutex!A3:B3'
    });
  });

  it('it locks when the lock is released during the lock operation', async function() {
    values.append = sinon.stub();
    values.append.onFirstCall().resolves({
      data: {
        updates: {
          updatedRange: 'Mutex!A3:B3'
        }
      }
    });
    values.append.onSecondCall().resolves({
      data: {
        updates: {
          updatedRange: 'Mutex!A2:B2'
        }
      }
    });
    values.clear = sinon.stub().resolves();

    await expect(sheet.lock('uid')).to.eventually.be.fulfilled;
    expect(values.append).to.have.been.calledTwice;
    expect(values.clear).to.have.been.calledOnce;
    expect(values.append.secondCall).to.have.been.calledWithMatch({
      spreadsheetId: 'ssid',
      range: 'Mutex!A1',
      requestBody: { values: sinon.match.array.startsWith([ 'uid' ]) }
    });
  });

  it('releases', async function() {
    values.clear = sinon.stub().resolves();

    await expect(sheet.unlock('uid')).to.eventually.be.fulfilled;
    expect(values.clear).to.have.been.calledOnce;
    expect(values.clear.firstCall).to.have.been.calledWithMatch({
      spreadsheetId: 'ssid',
      range: 'Mutex!A2:B2'
    });
  });
});
