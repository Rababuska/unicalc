const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
global.window.dispatchEvent = function () {};
global.CustomEvent = function (type, options) {
  this.type = type;
  this.detail = options && options.detail;
};
global.localStorage = {
  store: {},
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
  setItem: function (key, value) { this.store[key] = String(value); },
  removeItem: function (key) { delete this.store[key]; }
};
require('../core/history.js');

test('preserves local photos when a synced history record has no photos', () => {
  const photo = 'data:image/jpeg;base64,local-photo';
  window.OrderHistory.upsert({
    id: 'quote-1',
    managerId: 'manager-1',
    company: 'Client',
    total: 100,
    updatedAt: '2026-11-03T10:00:00.000Z',
    items: [{ title: 'Product', details: 'Details', photos: [photo], photo: photo }]
  });

  window.OrderHistory.replaceManager('manager-1', [{
    id: 'quote-1',
    company: 'Client',
    total: 100,
    updatedAt: '2026-11-03T10:01:00.000Z',
    items: [{ title: 'Product', details: 'Details' }]
  }]);

  const record = window.OrderHistory.getRecords().find(function (item) { return item.id === 'quote-1'; });
  assert.deepEqual(record.items[0].photos, [photo]);
  assert.equal(record.items[0].photo, photo);
});

test('does not attach local photos to a different synced item', () => {
  const photo = 'data:image/jpeg;base64,local-photo';
  window.OrderHistory.upsert({
    id: 'quote-2',
    managerId: 'manager-1',
    company: 'Client',
    total: 100,
    updatedAt: '2026-11-03T10:00:00.000Z',
    items: [{ title: 'Old product', details: 'Details', photos: [photo] }]
  });

  window.OrderHistory.replaceManager('manager-1', [{
    id: 'quote-2',
    company: 'Client',
    total: 100,
    updatedAt: '2026-11-03T10:01:00.000Z',
    items: [{ title: 'New product', details: 'Details' }]
  }]);

  const record = window.OrderHistory.getRecords().find(function (item) { return item.id === 'quote-2'; });
  assert.equal(record.items[0].photos, undefined);
});

test('keeps photos returned by Google when syncing a history record', () => {
  window.OrderHistory.clear();
  const photo = 'data:image/jpeg;base64,google-photo';
  window.OrderHistory.replaceManager('manager-1', [{
    id: 'quote-3',
    company: 'Client',
    total: 100,
    updatedAt: '2026-11-03T10:01:00.000Z',
    items: [{ title: 'Product', details: 'Details', photo: photo, photos: [photo] }]
  }]);

  const record = window.OrderHistory.getRecords().find(function (item) { return item.id === 'quote-3'; });
  assert.equal(record.items[0].photo, photo);
  assert.deepEqual(record.items[0].photos, [photo]);
});
