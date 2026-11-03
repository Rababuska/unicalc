(function () {
  const storageKey = 'unified-calc-history';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function recordTimestamp(record) {
    const timestamps = ['updatedAt', 'timestamp', 'createdAt'].reduce(function (values, key) {
      const value = record && record[key];
      if (value === undefined || value === null || value === '') return values;
      const numeric = typeof value === 'number' || /^\d{10,}$/.test(String(value)) ? Number(value) : NaN;
      const timestamp = Number.isFinite(numeric) ? numeric : Date.parse(value);
      if (Number.isFinite(timestamp)) values.push(timestamp);
      return values;
    }, []);
    const id = String(record && record.id || '');
    const numericId = Number(id);
    if (/^\d{10,}$/.test(id) && Number.isSafeInteger(numericId)) timestamps.push(numericId);
    return timestamps.length ? Math.max.apply(Math, timestamps) : null;
  }

  // Порядок списка зависит от времени создания КП, а не от последнего изменения.
  function creationTimestamp(record) {
    const id = String(record && record.id || '');
    if (/^\d{10,}$/.test(id) && Number.isSafeInteger(Number(id))) return Number(id);
    const created = Date.parse(record && record.createdAt);
    return Number.isFinite(created) ? created : recordTimestamp(record);
  }

  function sameClientAndTotal(left, right) {
    const leftClient = String(left.company || '').trim().toLocaleLowerCase('ru-RU');
    const rightClient = String(right.company || '').trim().toLocaleLowerCase('ru-RU');
    const leftTotal = Number(left.total);
    const rightTotal = Number(right.total);
    return leftClient === rightClient && Number.isFinite(leftTotal) && Number.isFinite(rightTotal) && leftTotal === rightTotal;
  }

  function preserveLocalPhotos(existingItems, incomingItems) {
    return incomingItems.map(function (incoming, index) {
      const existing = existingItems[index];
      if (!existing || String(existing.title || '') !== String(incoming.title || '')
        || String(existing.details || existing.desc || '') !== String(incoming.details || incoming.desc || '')) return incoming;
      const incomingPhotos = Array.isArray(incoming.photos) ? incoming.photos : (incoming.photo ? [incoming.photo] : []);
      if (incomingPhotos.length) return incoming;
      const photos = Array.isArray(existing.photos) ? existing.photos : (existing.photo ? [existing.photo] : []);
      return photos.length ? Object.assign({}, incoming, { photos: photos, photo: photos[0] }) : incoming;
    });
  }

  const listeners = new Set();

  function reportPhotoStorageError(error) {
    console.error('Не удалось сохранить фото истории:', error);
    window.dispatchEvent(new CustomEvent('storage:photo-cache-failed', { detail: { key: storageKey, message: error && error.message } }));
  }

  function historyPhotoKey(record, item, index) {
    return item.photoCacheKey || 'history:' + record.id + ':' + (item.id === undefined ? index : item.id);
  }

  function restoreStoredPhotos() {
    const pending = [];
    records.forEach(function (record, recordIndex) {
      if (!Array.isArray(record.items)) return;
      record.items.forEach(function (item, itemIndex) {
        if (!item.photoCacheKey || item.photo || (Array.isArray(item.photos) && item.photos.length)) return;
        pending.push(window.PhotoStorage.load(item.photoCacheKey).then(function (photos) {
          if (!Array.isArray(photos) || !photos.length) return false;
          const current = records[recordIndex] && records[recordIndex].items && records[recordIndex].items[itemIndex];
          if (!current || current.photo || (Array.isArray(current.photos) && current.photos.length)) return false;
          current.photos = photos;
          current.photo = photos[0];
          return true;
        }).catch(function (error) {
          reportPhotoStorageError(error);
          return false;
        }));
      });
    });
    Promise.all(pending).then(function (restored) {
      if (restored.some(Boolean)) listeners.forEach(function (listener) { listener(); });
    });
  }

  function readRecords() {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(records) ? records : [];
    } catch (error) {
      return [];
    }
  }

  let records = readRecords();
  restoreStoredPhotos();

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(records));
    } catch (error) {
      const fallbackRecords = records.map(function (record) {
        const items = Array.isArray(record.items) ? record.items.map(function (item, index) {
          const photos = Array.isArray(item.photos) ? item.photos : (item.photo ? [item.photo] : []);
          if (!photos.length) return item;
          const photoCacheKey = historyPhotoKey(record, item, index);
          if (!window.PhotoStorage) reportPhotoStorageError(new Error('Модуль хранения фото не загружен'));
          else window.PhotoStorage.save(photoCacheKey, photos).catch(reportPhotoStorageError);
          return Object.assign({}, item, { photos: [], photo: null, photoCacheKey: photoCacheKey });
        }) : record.items;
        return Object.assign({}, record, { items: items });
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify(fallbackRecords));
      } catch (fallbackError) {
        // The in-memory history remains available when browser storage is unavailable.
        window.dispatchEvent(new CustomEvent('storage:quota-exceeded', { detail: { key: storageKey } }));
      }
    }
  }

  window.OrderHistory = {
    getRecords: function () { return clone(records); },
    subscribe: function (listener) {
      listeners.add(listener);
      return function () { listeners.delete(listener); };
    },
    save: function (record) {
      const saved = Object.assign({}, clone(record), {
        id: record.id || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString()
      });
      records.unshift(saved);
      persist();
      return clone(saved);
    },
    upsert: function (record) {
      const saved = Object.assign({}, clone(record), {
        id: record.id || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString()
      });
      const index = records.findIndex(function (item) { return String(item.id) === String(saved.id); });
      if (index < 0) records.unshift(saved);
      else records[index] = saved;
      persist();
      return clone(saved);
    },
    replaceManager: function (managerId, managerRecords) {
      const incomingRecords = Array.isArray(managerRecords) ? managerRecords : [];
      incomingRecords.forEach(function (record) {
        if (!record || record.id === undefined || record.id === null || !Array.isArray(record.items) || record.total === undefined || record.total === null) return;
        if (record.managerId && String(record.managerId) !== String(managerId)) return;
        const createdAt = record.createdAt || (function () {
          const match = String(record.date || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
          if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).toISOString();
          const id = String(record.id);
          const timestamp = Number(id);
          return /^\d{10,}$/.test(id) && Number.isSafeInteger(timestamp) ? new Date(timestamp).toISOString() : undefined;
        })();
        const incoming = Object.assign({}, clone(record), { managerId: managerId }, createdAt ? { createdAt: createdAt } : {});
        const index = records.findIndex(function (item) {
          return String(item.id) === String(incoming.id) && (!item.managerId || String(item.managerId) === String(managerId));
        });
        if (index < 0) {
          const incomingTimestamp = recordTimestamp(incoming);
          const duplicate = records.some(function (item) {
            if (item.managerId && String(item.managerId) !== String(managerId) || !sameClientAndTotal(item, incoming)) return false;
            const existingTimestamp = recordTimestamp(item);
            return incomingTimestamp !== null && existingTimestamp !== null && Math.abs(incomingTimestamp - existingTimestamp) < 5000;
          });
          if (duplicate) return;
          records.push(incoming);
          return;
        }
        incoming.items = preserveLocalPhotos(records[index].items || [], incoming.items);
        const incomingTimestamp = recordTimestamp(incoming);
        const currentTimestamp = recordTimestamp(records[index]);
        if (incomingTimestamp !== null && (currentTimestamp === null || incomingTimestamp >= currentTimestamp)) {
          records[index] = Object.assign({}, records[index], incoming);
        }
      });
      records.sort(function (a, b) {
        return (creationTimestamp(b) || 0) - (creationTimestamp(a) || 0);
      });
      persist();
    },
    mergeManager: function (managerId, managerRecords) {
      window.OrderHistory.replaceManager(managerId, managerRecords);
    },
    remove: function (id) {
      records = records.filter(function (record) { return String(record.id) !== String(id); });
      persist();
    },
    removeManager: function (managerId) {
      records = records.filter(function (record) { return String(record.managerId) !== String(managerId); });
      persist();
    },
    clear: function () {
      records = [];
      persist();
    }
  };
})();
