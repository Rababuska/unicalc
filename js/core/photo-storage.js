(function () {
  const databaseName = 'unified-calc-photo-storage';
  const storeName = 'photos';
  let databasePromise;

  function openDatabase() {
    if (databasePromise) return databasePromise;
    if (!window.indexedDB) return Promise.reject(new Error('IndexedDB недоступна'));
    databasePromise = new Promise(function (resolve, reject) {
      const request = window.indexedDB.open(databaseName, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: 'key' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () {
        databasePromise = null;
        reject(request.error || new Error('Не удалось открыть хранилище фото'));
      };
      request.onblocked = function () {
        databasePromise = null;
        reject(new Error('Хранилище фото заблокировано другой вкладкой'));
      };
    });
    return databasePromise;
  }

  function request(key, operation) {
    return openDatabase().then(function (database) {
      return new Promise(function (resolve, reject) {
        const transaction = database.transaction(storeName, operation === 'get' ? 'readonly' : 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const result = operation === 'get' ? objectStore.get(key) : objectStore.put({ key: key, photos: operation });
        result.onsuccess = function () { if (operation === 'get') resolve(result.result ? result.result.photos : null); };
        result.onerror = function () { reject(result.error || new Error('Ошибка доступа к хранилищу фото')); };
        if (operation !== 'get') {
          transaction.oncomplete = function () { resolve(); };
          transaction.onerror = function () { reject(transaction.error || new Error('Не удалось сохранить фото')); };
          transaction.onabort = function () { reject(transaction.error || new Error('Сохранение фото отменено')); };
        }
      });
    });
  }

  window.PhotoStorage = {
    save: function (key, photos) { return request(key, photos); },
    load: function (key) { return request(key, 'get'); }
  };
})();
