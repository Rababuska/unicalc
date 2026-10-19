(function () {
  const storageKey = 'unified-calc-order';
  const listeners = new Set();

  function readItems() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      return [];
    }
  }

  let items = readItems().map(normalize);

  function firstDefined(item, keys, fallback) {
    for (let index = 0; index < keys.length; index++) {
      if (item[keys[index]] !== undefined && item[keys[index]] !== null) return item[keys[index]];
    }
    return fallback;
  }

  function normalize(input) {
    const quantity = Number(firstDefined(input, ['quantity', 'qty', 'circulation'], 0)) || 0;
    const unitPrice = Number(firstDefined(input, ['base_one_total', 'unitPrice', 'unit', 'one_total'], 0)) || 0;
    const total = Number(firstDefined(input, ['base_total', 'total'], quantity * unitPrice)) || 0;
    const photos = Array.isArray(input.photos)
      ? input.photos.filter(function (photo) { return typeof photo === 'string' && photo.startsWith('data:image/'); })
      : (typeof input.photo === 'string' && input.photo.startsWith('data:image/') ? [input.photo] : []);
    const category = input.category || input.module || (input.supplier
      ? 'souvenir'
      : (input.isManual ? 'other' : (input.specData || input.productionCost !== undefined || input.productionCostWithTax !== undefined ? 'poly' : 'other')));
    return Object.assign({}, input, {
      id: input.id || (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      category: category,
      title: String(input.title || 'Позиция'),
      details: String(firstDefined(input, ['details', 'desc'], '')),
      photos: photos,
      photo: photos[0] || null,
      quantity: quantity,
      unitPrice: unitPrice,
      total: total,
      delivery: String(firstDefined(input, ['delivery', 'deliveryDays'], ''))
    });
  }

  function cloneValue(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function stripAnnotationText(details, annotations) {
    let nextDetails = String(details || '');
    if (!Array.isArray(annotations) || !annotations.length) return nextDetails.trim();
    annotations.forEach(function (annotation) {
      const marker = annotation && annotation.details ? String(annotation.details) : '';
      const fallback = annotation && annotation.title ? String(annotation.title) : '';
      const textToRemove = marker || fallback;
      if (!textToRemove) return;
      nextDetails = nextDetails.replace(new RegExp(textToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    });
    nextDetails = nextDetails.replace(/\n{3,}/g, '\n\n').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    return nextDetails;
  }

  function snapshot() {
    return items.map(function (item) {
      return Object.assign({}, item);
    });
  }

  function publish() {
    const currentItems = snapshot();
    try {
      localStorage.setItem(storageKey, JSON.stringify(currentItems));
    } catch (error) {
      // The in-memory order remains usable when browser storage is unavailable.
    }
    listeners.forEach(function (listener) {
      listener(currentItems);
    });
    window.dispatchEvent(new CustomEvent('order:change', { detail: currentItems }));
  }

  window.OrderState = {
    getItems: snapshot,
    subscribe: function (listener) {
      listeners.add(listener);
      listener(snapshot());
      return function () { listeners.delete(listener); };
    },
    add: function (input) {
      const item = normalize(input);
      items.push(item);
      publish();
      return item.id;
    },
    setItems: function (nextItems) {
      items = nextItems.map(normalize);
      publish();
    },
    update: function (id, changes) {
      const index = items.findIndex(function (item) { return String(item.id) === String(id); });
      if (index < 0) return false;
      const updated = Object.assign({}, items[index], changes);
      if (Array.isArray(changes.photos)) {
        updated.photos = changes.photos.slice();
        updated.photo = updated.photos[0] || null;
      } else if (Object.prototype.hasOwnProperty.call(changes, 'photo')) {
        updated.photos = changes.photo ? [changes.photo] : [];
      }
      if (changes.total === undefined && (changes.quantity !== undefined || changes.unitPrice !== undefined)) {
        updated.total = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
      }
      if (changes.unitPrice !== undefined) updated.base_one_total = updated.unitPrice;
      if (changes.total !== undefined || changes.quantity !== undefined || changes.unitPrice !== undefined) {
        updated.base_total = updated.total;
      }
      items[index] = updated;
      publish();
      return true;
    },
    duplicateItem: function (id, overrides) {
      const source = items.find(function (item) { return String(item.id) === String(id); });
      if (!source) return null;
      source.runGroupId = source.runGroupId || source.id;
      const quantity = Number(overrides && overrides.quantity !== undefined ? overrides.quantity : source.quantity) || 0;
      const unitPrice = Number(overrides && overrides.unitPrice !== undefined ? overrides.unitPrice : source.unitPrice) || 0;
      const total = Number(overrides && overrides.total !== undefined ? overrides.total : quantity * unitPrice) || 0;
      const copied = Object.assign({}, source, {
        id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + ':' + Math.random(),
        runGroupId: source.runGroupId,
        quantity: quantity,
        unitPrice: unitPrice,
        total: total,
        base_total: overrides && overrides.base_total !== undefined ? Number(overrides.base_total) : total,
        base_one_total: overrides && overrides.base_one_total !== undefined ? Number(overrides.base_one_total) : unitPrice,
        productionCostWithTax: overrides && overrides.productionCostWithTax !== undefined ? overrides.productionCostWithTax : source.productionCostWithTax,
        delivery: overrides && overrides.delivery !== undefined ? String(overrides.delivery) : source.delivery,
        specData: overrides && overrides.specData !== undefined ? cloneValue(overrides.specData) : source.specData,
        title: overrides && overrides.title !== undefined ? String(overrides.title) : source.title,
        details: overrides && overrides.details !== undefined ? String(overrides.details) : source.details,
        baseDetails: source.baseDetails || source.details,
        annotations: Array.isArray(source.annotations) ? cloneValue(source.annotations) : [],
        photos: Array.isArray(source.photos) ? source.photos.slice() : (source.photo ? [source.photo] : []),
        productionCostByCategory: source.productionCostByCategory ? Object.assign({}, source.productionCostByCategory) : undefined,
        productionCost: Number(overrides && overrides.productionCost !== undefined ? overrides.productionCost : (source.productionCost || 0)),
        baseProductionCost: source.baseProductionCost !== undefined ? source.baseProductionCost : (source.productionCost || 0)
      });
      items.push(copied);
      publish();
      return copied.id;
    },
    removeDecoration: function (id, annotationIndex) {
      const index = items.findIndex(function (item) { return String(item.id) === String(id); });
      if (index < 0) return false;
      const item = items[index];
      const annotations = Array.isArray(item.annotations) ? item.annotations : [];
      if (!annotations.length) return false;
      const hasSpecificIndex = annotationIndex !== undefined && annotationIndex !== null;
      const selectedIndex = Number(annotationIndex);
      if (hasSpecificIndex && (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= annotations.length)) return false;
      const removedAnnotations = hasSpecificIndex ? [annotations[selectedIndex]] : annotations;
      const remainingAnnotations = hasSpecificIndex
        ? annotations.filter(function (annotation, annotationPosition) { return annotationPosition !== selectedIndex; })
        : [];
      const reducedCategories = item.productionCostByCategory ? Object.assign({}, item.productionCostByCategory) : {};
      const allDecorationCost = annotations.reduce(function (sum, annotation) {
        return sum + (Number(annotation.productionCost) || 0);
      }, 0);
      const allDecorationTotal = annotations.reduce(function (sum, annotation) {
        return sum + (Number(annotation.total) || 0);
      }, 0);
      const baseTotal = item.baseTotal !== undefined ? Number(item.baseTotal) : Math.max(0, (Number(item.total) || 0) - allDecorationTotal);
      const baseUnitPrice = item.baseUnitPrice !== undefined ? Number(item.baseUnitPrice) : Math.max(0, (Number(item.unitPrice) || 0) - annotations.reduce(function (sum, annotation) {
        return sum + (Number(annotation.unitPrice) || 0);
      }, 0));
      const baseProductionCost = item.baseProductionCost !== undefined ? Number(item.baseProductionCost) : Math.max(0, (Number(item.productionCost) || 0) - allDecorationCost);
      const remainingTotal = remainingAnnotations.reduce(function (sum, annotation) { return sum + (Number(annotation.total) || 0); }, 0);
      const remainingUnitPrice = remainingAnnotations.reduce(function (sum, annotation) { return sum + (Number(annotation.unitPrice) || 0); }, 0);
      const remainingCost = remainingAnnotations.reduce(function (sum, annotation) { return sum + (Number(annotation.productionCost) || 0); }, 0);
      if (item.productionCostByCategory) {
        const baseSouvenir = Math.max(0, (Number(reducedCategories.souvenir) || 0) - allDecorationCost);
        const nextSouvenir = baseSouvenir + remainingCost;
        if (nextSouvenir > 0) reducedCategories.souvenir = nextSouvenir;
        else delete reducedCategories.souvenir;
      } else {
        const originalCategory = ['poly', 'souvenir', 'other'].includes(item.category) ? item.category : 'other';
        reducedCategories[originalCategory] = baseProductionCost;
        if (remainingCost) reducedCategories.souvenir = (Number(reducedCategories.souvenir) || 0) + remainingCost;
      }
      const nextProductionCost = Object.keys(reducedCategories).reduce(function (sum, key) {
        return sum + (Number(reducedCategories[key]) || 0);
      }, 0);
      const restoredTotal = baseTotal + remainingTotal;
      const restoredUnitPrice = baseUnitPrice + remainingUnitPrice;
      const baseDetails = item.baseDetails !== undefined ? item.baseDetails : stripAnnotationText(item.details, annotations);
      const restoredDetails = [baseDetails].concat(remainingAnnotations.map(function (annotation) {
        return String(annotation.annotationText || annotation.details || '').trim();
      })).filter(Boolean).join('\n');
      const updated = Object.assign({}, item, {
        annotations: remainingAnnotations,
        details: restoredDetails,
        total: restoredTotal,
        unitPrice: restoredUnitPrice,
        productionCost: nextProductionCost,
        productionCostByCategory: Object.keys(reducedCategories).length ? reducedCategories : undefined,
        base_total: restoredTotal,
        base_one_total: restoredUnitPrice,
        baseDetails: remainingAnnotations.length ? baseDetails : undefined,
        baseTotal: remainingAnnotations.length ? baseTotal : undefined,
        baseUnitPrice: remainingAnnotations.length ? baseUnitPrice : undefined,
        baseProductionCost: remainingAnnotations.length ? baseProductionCost : undefined
      });
      items[index] = updated;
      publish();
      return true;
    },
    remove: function (id) {
      const nextItems = items.filter(function (item) { return String(item.id) !== String(id); });
      if (nextItems.length === items.length) return false;
      items = nextItems;
      publish();
      return true;
    },
    clear: function () {
      items = [];
      publish();
    }
  };
})();
