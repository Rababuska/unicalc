const test = require('node:test');
const assert = require('node:assert/strict');

const photoCache = new Map();
global.window = global;
global.window.dispatchEvent = function () {};
global.window.crypto = { randomUUID: function () { return 'item-1'; } };
global.CustomEvent = function (type, options) {
  this.type = type;
  this.detail = options && options.detail;
};
global.localStorage = {
  store: {},
  maxLength: 600,
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
  setItem: function (key, value) {
    if (String(value).length > this.maxLength) throw new Error('QuotaExceededError');
    this.store[key] = String(value);
  },
  removeItem: function (key) { delete this.store[key]; }
};
global.PhotoStorage = {
  save: function (key, photos) {
    photoCache.set(key, photos.slice());
    return Promise.resolve();
  },
  load: function (key) { return Promise.resolve(photoCache.get(key) || null); }
};

function loadOrderState() {
  const modulePath = require.resolve('../core/state.js');
  delete require.cache[modulePath];
  require(modulePath);
  return window.OrderState;
}

test('keeps photos in IndexedDB when localStorage quota is exceeded and restores them', async () => {
  const photo = 'data:image/jpeg;base64,' + 'x'.repeat(1200);
  let order = loadOrderState();
  order.add({ id: 'item-1', title: 'Product', quantity: 1, unitPrice: 1, photos: [photo] });

  const saved = JSON.parse(localStorage.getItem('unified-calc-order'));
  assert.deepEqual(saved[0].photos, []);
  assert.equal(saved[0].photoCacheKey, 'order:item-1');
  assert.deepEqual(photoCache.get('order:item-1'), [photo]);

  order = loadOrderState();
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.deepEqual(order.getItems()[0].photos, [photo]);
});
