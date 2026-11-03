const test = require('node:test');
const assert = require('node:assert/strict');

const stored = new Map();
const objectStoreNames = {
  contains: function (name) { return name === 'photos'; }
};
const database = {
  objectStoreNames: objectStoreNames,
  createObjectStore: function () {},
  transaction: function () {
    const transaction = {};
    transaction.objectStore = function () {
        return {
          put: function (entry) {
            const request = {};
            setImmediate(function () {
              stored.set(entry.key, entry.photos);
              if (request.onsuccess) request.onsuccess();
              if (transaction.oncomplete) transaction.oncomplete();
            });
            return request;
          },
          get: function (key) {
            const request = {};
            setImmediate(function () {
              request.result = stored.has(key) ? { photos: stored.get(key) } : undefined;
              if (request.onsuccess) request.onsuccess();
            });
            return request;
          }
        };
      };
    return transaction;
  }
};

global.window = global;
global.window.indexedDB = {
  open: function () {
    const request = { result: database };
    setImmediate(function () {
      if (request.onupgradeneeded) request.onupgradeneeded();
      if (request.onsuccess) request.onsuccess();
    });
    return request;
  }
};
require('../core/photo-storage.js');

test('stores and restores photo data through IndexedDB', async () => {
  const photos = ['data:image/jpeg;base64,photo-data'];
  await window.PhotoStorage.save('history:quote:item', photos);
  assert.deepEqual(await window.PhotoStorage.load('history:quote:item'), photos);
  assert.equal(await window.PhotoStorage.load('missing'), null);
});
