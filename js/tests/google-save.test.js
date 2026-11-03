const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../_legacy/poly/js/app.js'), 'utf8');
const helperSource = source.slice(0, source.indexOf('var app = new Vue({'));

function createGoogleHelpers() {
  function TestImage() {
    this.naturalWidth = 1000;
    this.naturalHeight = 1000;
  }
  Object.defineProperty(TestImage.prototype, 'src', {
    set: function () { setImmediate(() => this.onload()); }
  });

  const context = {
    document: {
      addEventListener: function () {},
      createElement: function () {
        const canvas = {
          width: 0,
          height: 0,
          getContext: function () {
            return { fillRect: function () {}, drawImage: function () {} };
          },
          toDataURL: function () {
            return 'data:image/jpeg;base64,' + 'a'.repeat(Math.ceil(canvas.width * canvas.height * 0.4));
          }
        };
        return canvas;
      }
    },
    Image: TestImage,
    fetch: null,
    window: { parent: null }
  };
  context.window.parent = context.window;
  vm.createContext(context);
  vm.runInContext(helperSource, context);
  return context;
}

test('compresses quote photos collectively and avoids duplicate single-photo fields', async () => {
  const helpers = createGoogleHelpers();
  const photo = 'data:image/jpeg;base64,' + 'p'.repeat(30000);
  const items = Array.from({ length: 7 }, function (_, index) {
    return { title: 'Позиция ' + index, details: 'Данные позиции', photo: photo, photos: [photo] };
  });
  const record = {
    id: 'quote-7',
    managerId: 'manager-1',
    company: 'Карина',
    total: 1632440,
    items: items
  };

  const prepared = await helpers.prepareGoogleRecord(record);

  assert.ok(JSON.stringify(prepared.items).length <= 45000);
  assert.equal(prepared.items.length, 7);
  prepared.items.forEach(function (item) {
    assert.equal(item.photos, undefined);
    assert.ok(item.photo.startsWith('data:image/jpeg;base64,'));
    assert.ok(item.photo.length < photo.length);
  });
  assert.equal(record.items[0].photo.length, photo.length);
});

test('reports when non-photo quote data already exceeds the Google cell budget', async () => {
  const helpers = createGoogleHelpers();
  const record = {
    id: 'quote-too-large',
    managerId: 'manager-1',
    items: [{ title: 'x'.repeat(46000), photo: 'data:image/jpeg;base64,' + 'p'.repeat(100) }]
  };

  await assert.rejects(helpers.prepareGoogleRecord(record), /без фото превышают лимит/);
});

test('confirms a quote only after the old Google endpoint returns the same saved items and photos', async () => {
  const helpers = createGoogleHelpers();
  const photo = 'data:image/jpeg;base64,' + 'p'.repeat(30000);
  let savedRecord = null;
  const postedBodies = [];
  helpers.fetch = function (url, options) {
    if (options && options.method === 'POST') {
      const payload = JSON.parse(options.body);
      savedRecord = payload.record;
      postedBodies.push(options.body);
      return Promise.resolve({ ok: false });
    }
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve({ status: 'ok', data: [savedRecord] }); }
    });
  };
  const record = {
    id: 'quote-save',
    managerId: 'manager-1',
    managerName: 'Manager',
    date: '03.11.2026',
    company: 'Карина',
    summary: 'Product (1)',
    total: 100,
    includeVat: true,
    items: [{ title: 'Product', details: 'Details', quantity: 1, total: 100, photo: photo, photos: [photo] }]
  };

  await helpers.sendGoogleRecord({
    googleScriptUrl: 'https://script.google.com/macros/s/test/exec',
    currentManager: { id: 'manager-1' }
  }, record, false);

  assert.equal(postedBodies.length, 1);
  assert.ok(JSON.stringify(savedRecord.items).length <= 45000);
  assert.equal(savedRecord.items[0].photos, undefined);
  assert.ok(savedRecord.items[0].photo.startsWith('data:image/jpeg;base64,'));
  assert.equal(record.items[0].photo.length, photo.length);
});

test('accepts Google Sheets date conversion and metadata stored on the first item', () => {
  const helpers = createGoogleHelpers();
  const record = {
    id: '1793623321838',
    managerId: 'm_igor',
    managerName: 'Manager',
    date: '03.11.2026',
    company: 'Карина',
    summary: 'Product (1)',
    total: 1231720,
    includeVat: true,
    items: [{ id: 1, title: 'Product', details: 'Details', quantity: 1, photo: 'data:image/jpeg;base64,photo', unitPrice: 1231720 }]
  };
  const googleRecord = JSON.parse(JSON.stringify(record));
  googleRecord.date = '2026-11-02T19:00:00.000Z';
  googleRecord.items[0].__meta = { includeVat: true, quoteSettings: null, updatedAt: '2026-11-03T06:11:00.000Z' };

  assert.equal(helpers.matchesGoogleRecord(record, googleRecord), true);
});
