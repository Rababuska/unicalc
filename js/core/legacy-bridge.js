(function () {
  const frames = {};
  const pendingLoads = {};
  const observers = {};
  const listeners = new Set();

  function notify() {
    listeners.forEach(function (listener) { listener(); });
  }

  function isVisible(element, doc) {
    if (!element) return false;
    let current = element;
    while (current && current !== doc.body) {
      if (current.hidden || current.style.display === 'none') return false;
      current = current.parentElement;
    }
    return true;
  }

  function visibleField(doc, selector) {
    return Array.from(doc.querySelectorAll(selector)).find(function (element) {
      return isVisible(element, doc);
    }) || null;
  }

  function numericValue(element) {
    if (!element) return 0;
    const value = String(element.value || '').replace(/[\s\u00a0]/g, '').replace(',', '.');
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function frameWindow(moduleName) {
    const frame = frames[moduleName];
    return frame && frame.contentWindow ? frame.contentWindow : null;
  }

  function hideLegacyQuote(moduleName, frame) {
    const doc = frame.contentDocument;
    let style = doc.getElementById('unified-hide-legacy-quote');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'unified-hide-legacy-quote';
      style.textContent = '#historySection,#propaket-kp-block,#btn-add-kp{display:none!important}a[href="#historySection"]{display:none!important}';
      doc.head.appendChild(style);
    }

    if (moduleName === 'poly') {
      const app = frame.contentWindow.app;
      const hidePolyTable = function () {
        if (app && app.$refs.tableSection && app.$refs.tableSection.style.display !== 'none') {
          app.$refs.tableSection.style.display = 'none';
        }
        Array.from(doc.querySelectorAll('button')).forEach(function (button) {
          if ((button.textContent.includes('Добавить в таблицу КП') || button.textContent.includes('Сохранить изменения')) && button.style.display !== 'none') {
            button.style.display = 'none';
          }
        });
      };
      hidePolyTable();
      if (app && app.$watch) {
        app.$watch('isAuthenticated', function () { app.$nextTick(hidePolyTable); });
      }
      const root = doc.getElementById('app');
      if (root && frame.contentWindow.MutationObserver && !observers.poly) {
        observers.poly = new frame.contentWindow.MutationObserver(hidePolyTable);
        observers.poly.observe(root, { childList: true, subtree: true });
      }
    } else {
      const addButton = doc.getElementById('btn-add-kp');
      if (addButton) addButton.style.display = 'none';
    }
  }

  function bindModuleEvents(moduleName, frame) {
    const frameWindow = frame.contentWindow;
    frameWindow.addEventListener('input', notify, true);
    frameWindow.addEventListener('change', notify, true);
    frameWindow.addEventListener('click', function () { window.setTimeout(notify, 0); }, true);

    if (moduleName === 'poly') {
      const app = frame.contentWindow.app;
      if (app && app.$watch) {
        app.$watch('selected', notify, { deep: true });
        app.$watch('isAuthenticated', notify);
        app.$watch('editingIndex', notify);
        app.$watch('userHistory', notify, { deep: true });
      }
    }
  }

  function load(moduleName) {
    if (pendingLoads[moduleName]) return pendingLoads[moduleName];
    if (frames[moduleName]) return Promise.resolve(frames[moduleName]);

    pendingLoads[moduleName] = new Promise(function (resolve, reject) {
      const slot = document.getElementById('legacy-' + moduleName + '-slot');
      const frame = document.createElement('iframe');
      frame.className = 'legacy-frame';
      frame.title = moduleName === 'poly' ? 'Полиграфический калькулятор' : 'Сувенирный калькулятор';
      frame.src = moduleName === 'poly' ? '_legacy/poly/index.html' : '_legacy/souvenir/index.html';
      frames[moduleName] = frame;
      frame.addEventListener('load', function () {
        try {
          hideLegacyQuote(moduleName, frame);
          bindModuleEvents(moduleName, frame);
          resolve(frame);
          notify();
        } catch (error) {
          reject(error);
        }
      });
      frame.addEventListener('error', reject, { once: true });
      slot.appendChild(frame);
    });
    return pendingLoads[moduleName];
  }

  function polyCanAdd() {
    const frame = frameWindow('poly');
    const app = frame && frame.app;
    if (!app || !app.isAuthenticated) return false;
    const result = app.result_price;
    return Boolean(result && !result.doesNotFit && Number(result.total) > 0);
  }

  function souvenirContext() {
    const frame = frames.souvenir;
    const win = frameWindow('souvenir');
    if (!frame || !win) return null;
    const doc = frame.contentDocument;
    const mode = win.currentMode || 'order';
    const qtyField = visibleField(doc, 'input[name="C5"]');
    const unitField = visibleField(doc, 'input[name="C8"]');
    const totalField = visibleField(doc, 'input[name="C9"]');
    const quantity = numericValue(qtyField);
    const unitPrice = numericValue(unitField);
    const total = numericValue(totalField);
    const sourceUnitPrice = numericValue(visibleField(doc, 'input[name="C3"]'));
    const exchangeRate = numericValue(visibleField(doc, 'input[name="PB2"]'));
    const originField = Array.from(doc.querySelectorAll('input[name="origin"]')).find(function (field) {
      return field.checked && isVisible(field, doc);
    });
    const product = win.selectedProduct;
    const serviceNames = [win.activeService && win.activeService.name, win.activeService2 && win.activeService2.name].filter(Boolean);
    const productSelect = visibleField(doc, 'select[name="product"]');
    const canAddProduct = mode === 'propaket' && product && total > 0;
    const canAddService = mode !== 'propaket' && total > 0 && (serviceNames.length > 0 || mode === 'order' || (mode === 'sklad' && productSelect && productSelect.value));
    return {
      win: win,
      doc: doc,
      mode: mode,
      quantity: quantity,
      unitPrice: unitPrice,
      total: total,
      sourceUnitPrice: sourceUnitPrice,
      exchangeRate: exchangeRate,
      currencyOrigin: originField ? originField.value : 'kazakhstan',
      souvenirMode: mode,
      stockProductValue: mode === 'sklad' && productSelect ? productSelect.value : '',
      product: product,
      serviceNames: serviceNames,
      productSelect: productSelect,
      canAdd: Boolean(canAddProduct || canAddService)
    };
  }

  function canAdd(moduleName) {
    return moduleName === 'poly' ? polyCanAdd() : Boolean(souvenirContext() && souvenirContext().canAdd);
  }

  function getDecorationDetails(context) {
    const services = [context.win.activeService, context.win.activeService2].filter(Boolean);
    return services.map(function (service, index) {
      const name = String(service.name || '').toLowerCase();
      let method = String(service.name || '').split(':')[0].trim();
      if (service.isDtfArea || /дтф|dtf/.test(name)) method = 'ДТФ';
      else if (/уф|\buv\b/.test(name)) method = 'УФ';
      else if (/гравиров/.test(name)) method = 'гравировки';
      else if (/тиснен/.test(name)) method = 'тиснения';
      else if (/шелкограф/.test(name)) method = 'шелкографии';
      else if (/тампопеч/.test(name)) method = 'тампопечати';
      else if (/вышив/.test(name)) method = 'вышивки';

      let details = 'Нанесение логотипа методом ' + method;
      if (service.isDtfArea) {
        const points = Array.from(context.doc.querySelectorAll(index === 1 ? '.dtf-point2' : '.dtf-point'))
          .map(function (point) {
            const width = Number(point.querySelector(index === 1 ? '.dtf-w2' : '.dtf-w')?.value) || 0;
            const height = Number(point.querySelector(index === 1 ? '.dtf-h2' : '.dtf-h')?.value) || 0;
            return width > 0 && height > 0 ? width + ' x ' + height + ' мм' : '';
          }).filter(Boolean);
        if (points.length) details += ' (размеры: ' + points.join(', ') + ')';
      } else if (service.isCliche) {
        const suffix = index === 1 ? '2' : '';
        const width = Number(context.doc.getElementById('clicheW' + suffix)?.value) || 0;
        const height = Number(context.doc.getElementById('clicheH' + suffix)?.value) || 0;
        if (width > 0 && height > 0) details += ' (клише ' + width + ' x ' + height + ' мм)';
      }
      return details;
    }).join('\n');
  }

  function describePlotterCut(value) {
    if (value === 'plotter') return 'Плоттерная резка';
    if (value === 'plotter_perf') return 'Плоттерная резка с перфорацией';
    return '';
  }

  function describeNotebookEmbossing(item) {
    if (!item) return '';
    const isNotebookEmboss = item.embossing === 'notebook' || item.embossType === 'notebook' || item.notebookEmboss === true || /тисн.*блок|блок.*тисн/i.test(String(item.title || '') + ' ' + String(item.desc || ''));
    if (!isNotebookEmboss) return '';
    const clicheExists = Boolean(item.clicheExists || item.cliche_exists);
    const width = Number(item.clicheW || item.cliche_w || item.clicheWidth || 0) || 0;
    const height = Number(item.clicheH || item.cliche_h || item.clicheHeight || 0) || 0;
    const clicheNote = clicheExists ? 'клише заказчика' : (width > 0 && height > 0 ? 'клише ' + width + 'x' + height + ' мм' : 'клише по размеру');
    return 'Тиснение обложки блокнота: приладка + удар/тираж + ' + clicheNote;
  }

  function decorateItemDetails(item) {
    const extras = [];
    const plotter = describePlotterCut(item.plotter_cut || item.plotterCut || item.cover_plotter_cut || item.coverPlotterCut || item.back_cover_plotter_cut || item.backCoverPlotterCut);
    if (plotter) extras.push(plotter);
    const emboss = describeNotebookEmbossing(item);
    if (emboss) extras.push(emboss);
    const details = [item.desc, item.details, item.annotationText].filter(Boolean).join('\n');
    return [details, extras.filter(Boolean).join('\n')].filter(Boolean).join('\n');
  }

  function addPolyItem() {
    const frame = frames.poly;
    const app = frame.contentWindow.app;
    const previousCount = app.savedItems.length;
    app.addItemToTable();
    if (app.savedItems.length <= previousCount) return null;
    const item = app.savedItems[app.savedItems.length - 1];
    return Object.assign({}, item, {
      id: 'poly-' + item.id,
      category: 'poly',
      details: decorateItemDetails(item),
      quantity: item.circulation,
      unitPrice: item.one_total,
      plotterCut: item.plotter_cut || item.plotterCut || item.cover_plotter_cut || item.coverPlotterCut || item.back_cover_plotter_cut || item.backCoverPlotterCut,
      notebookEmboss: item.embossing || item.embossType || item.notebookEmboss || item.notebook_emboss,
      clicheExists: Boolean(item.clicheExists || item.cliche_exists),
      clicheW: item.clicheW || item.cliche_w || item.clicheWidth || 0,
      clicheH: item.clicheH || item.cliche_h || item.clicheHeight || 0
    });
  }

  function addSouvenirItem() {
    const context = souvenirContext();
    if (!context || !context.canAdd) return null;
    const win = context.win;

    if (context.mode === 'propaket') {
      const beforeCount = Array.isArray(win.kpItems) ? win.kpItems.length : 0;
      context.doc.getElementById('btn-add-kp').click();
      if (!Array.isArray(win.kpItems) || win.kpItems.length <= beforeCount) return null;
      const item = win.kpItems[win.kpItems.length - 1];
      const costField = visibleField(context.doc, 'input[name="F9"]');
      return Object.assign({}, item, {
        category: 'souvenir',
        details: item.desc,
        quantity: item.qty,
        unitPrice: item.unit,
        productionCost: numericValue(costField),
        productionCostIncludesFinish: true
      });
    }

    if (typeof win.calc === 'function') win.calc();
    const contextAfterCalc = souvenirContext();
    const selectedProduct = contextAfterCalc.productSelect;
    const productName = selectedProduct && selectedProduct.selectedOptions.length
      ? selectedProduct.selectedOptions[0].textContent.trim()
      : '';
    const stockProductName = contextAfterCalc.mode === 'sklad' && productName
      ? productName.charAt(0).toLocaleUpperCase('ru-RU') + productName.slice(1)
      : productName;
    const hasSelectedServices = Boolean(win.activeService || win.activeService2);
    const decorationDetails = hasSelectedServices ? getDecorationDetails(contextAfterCalc) : '';
    const title = contextAfterCalc.mode === 'sklad' && productName
      ? stockProductName
      : (hasSelectedServices ? 'Нанесение логотипа' : productName);
    const details = contextAfterCalc.mode === 'sklad'
      ? [stockProductName, decorationDetails].filter(Boolean).join('\n')
      : decorationDetails;
    const delivery = typeof win.getDeliveryDays === 'function' ? win.getDeliveryDays(contextAfterCalc.quantity) : '';
    const costField = visibleField(contextAfterCalc.doc, 'input[name="F9"]');
    const isNotebookEmboss = Boolean(win.activeService && win.activeService.isCliche && /блокн|ежеднев/i.test(String(productName || '') + ' ' + String(decorationDetails || '')))
      || /блокн|ежеднев/i.test(String(productName || '') + ' ' + String(decorationDetails || ''));
    const notebookEmbossText = isNotebookEmboss ? 'Тиснение обложки блокнота: приладка + удар/тираж + клише по размеру' : '';

    return {
      category: 'souvenir',
      title: title,
      details: [details, notebookEmbossText].filter(Boolean).join('\n'),
      annotationText: decorationDetails,
      services: contextAfterCalc.serviceNames.slice(),
      quantity: contextAfterCalc.quantity,
      unitPrice: contextAfterCalc.unitPrice,
      total: contextAfterCalc.total,
      sourceUnitPrice: contextAfterCalc.sourceUnitPrice,
      exchangeRate: contextAfterCalc.exchangeRate,
      currencyOrigin: contextAfterCalc.currencyOrigin,
      souvenirMode: contextAfterCalc.mode,
      stockProductValue: contextAfterCalc.mode === 'sklad' && contextAfterCalc.productSelect
        ? contextAfterCalc.productSelect.value
        : '',
      productionCost: numericValue(costField),
      productionCostIncludesFinish: hasSelectedServices,
      delivery: delivery,
      embossing: isNotebookEmboss ? 'notebook' : undefined,
      clicheExists: Boolean(win.activeService && win.activeService.isCliche && contextAfterCalc.doc.getElementById('clicheExists') && contextAfterCalc.doc.getElementById('clicheExists').checked),
      clicheW: Number(contextAfterCalc.doc.getElementById('clicheW')?.value) || 0,
      clicheH: Number(contextAfterCalc.doc.getElementById('clicheH')?.value) || 0
    };
  }

  function setSouvenirQuantity(quantity) {
    const context = souvenirContext();
    if (!context) return false;
    const quantityField = visibleField(context.doc, 'input[name="C5"]');
    if (!quantityField) return false;
    quantityField.value = String(Math.max(1, Number(quantity) || 1));
    if (typeof context.win.calc === 'function') context.win.calc();
    notify();
    return true;
  }

  function setSouvenirCalculation(annotation, item) {
    if (!annotation) return false;
    const frame = frames.souvenir;
    const win = frameWindow('souvenir');
    const doc = frame && frame.contentDocument;
    if (!win || !doc) return false;
    const souvenirMode = annotation.souvenirMode || (item && item.souvenirMode) || (annotation.stockProductValue ? 'sklad' : 'order');
    const targetMode = souvenirMode === 'sklad' ? 'sklad' : 'order';
    if (win.currentMode !== targetMode) {
      const modeButton = doc.getElementById(targetMode === 'sklad' ? 'btn-sklad' : 'btn-order');
      if (modeButton) modeButton.click();
    }
    let context = souvenirContext();
    if (!context) return false;
    let stockProductRestored = targetMode !== 'sklad';
    if (targetMode === 'sklad' && annotation.stockProductValue && context.productSelect) {
      const matchingOption = Array.from(context.productSelect.options).some(function (option) {
        return option.value === annotation.stockProductValue;
      });
      if (matchingOption) {
        context.productSelect.value = annotation.stockProductValue;
        context.productSelect.dispatchEvent(new win.Event('change', { bubbles: true }));
        stockProductRestored = true;
      }
    }
    context = souvenirContext();
    if (!context) return false;
    const quantityField = visibleField(context.doc, 'input[name="C5"]');
    if (quantityField && Number(annotation.quantity) > 0) quantityField.value = String(annotation.quantity);

    const hasSourceValues = targetMode !== 'sklad'
      && annotation.sourceUnitPrice !== undefined
      && annotation.exchangeRate !== undefined
      && (annotation.currencyOrigin === 'russia' || annotation.currencyOrigin === 'kazakhstan');
    if (hasSourceValues) {
      const priceField = visibleField(context.doc, 'input[name="C3"]');
      const rateField = visibleField(context.doc, 'input[name="PB2"]');
      const originField = context.doc.getElementById(annotation.currencyOrigin);
      if (!priceField || !rateField || !originField) return false;
      priceField.value = String(annotation.sourceUnitPrice);
      rateField.value = String(annotation.exchangeRate);
      originField.checked = true;
    } else if (!Array.isArray(annotation.services) || annotation.services.length === 0) {
      const originField = context.doc.getElementById('russia');
      if (originField) originField.checked = true;
    }

    if (typeof context.win.calc === 'function') context.win.calc();
    notify();
    return targetMode === 'sklad' ? stockProductRestored : hasSourceValues;
  }

  function setSouvenirServices(serviceNames) {
    const context = souvenirContext();
    if (!context) return false;
    const names = Array.isArray(serviceNames) ? serviceNames.filter(Boolean) : [];
    const win = context.win;
    const doc = context.doc;

    if (win.activeService) doc.getElementById('clearService')?.click();
    if (win.activeService2) doc.getElementById('clearService2')?.click();

    function selectService(index, name) {
      const suffix = index === 1 ? '2' : '';
      const search = doc.getElementById('serviceSearch' + suffix);
      search.value = name;
      search.dispatchEvent(new win.Event('input', { bubbles: true }));
      const result = Array.from(doc.querySelectorAll('#searchResults' + suffix + ' .search-item')).find(function (item) {
        return item.firstChild && item.firstChild.textContent.trim() === name;
      });
      if (!result) return false;
      result.click();
      return true;
    }

    if (!names.length) {
      notify();
      return true;
    }

    let restored = selectService(0, names[0]);
    if (names[1]) {
      const secondPanel = doc.getElementById('second-supplier-panel');
      if (!isVisible(secondPanel, doc)) doc.getElementById('btn-show-second-service').click();
      restored = selectService(1, names[1]) && restored;
    }
    notify();
    return restored;
  }

  function getPolyApp() {
    const frame = frameWindow('poly');
    return frame && frame.app ? frame.app : null;
  }

  function normalizeLegacyHistoryId(id) {
    if (typeof id === 'number') return id;
    const value = String(id == null ? '' : id);
    const numeric = Number(value);
    return /^\d+$/.test(value) && Number.isSafeInteger(numeric) ? numeric : id;
  }

  function normalizePolyHistoryIds(app) {
    if (!app || !Array.isArray(app.userHistory)) return;
    app.userHistory.forEach(function (record) {
      if (record && record.id !== undefined && record.id !== null) {
        record.id = normalizeLegacyHistoryId(record.id);
      }
    });
  }

  function postPolyHistoryToGoogle(app, payload) {
    const frame = frames.poly;
    const frameWin = frame && frame.contentWindow;
    if (frameWin && frameWin.__unifiedCalcSaveMessageReady && typeof frameWin.fetch === 'function') {
      frameWin.postMessage({ type: 'SAVE_TO_GOOGLE', payload: payload }, '*');
      return true;
    }
    if (!app.googleScriptUrl || typeof window.fetch !== 'function') return false;
    window.fetch(app.googleScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'save', record: payload })
    }).catch(function (error) {
      console.error('Ошибка отправки КП в Google:', error);
    });
    return true;
  }

  function syncPolyQuote(items, companyName, includeVat) {
    const app = getPolyApp();
    if (!app) return false;
    const displayItems = OrderFinance.itemsForVat(items, includeVat);
    app.savedItems = items.map(function (item, index) {
      const displayItem = displayItems[index];
      return Object.assign({}, item, {
        id: index + 1,
        desc: item.details || item.desc || '',
        circulation: item.quantity,
        one_total: displayItem.unitPrice,
        total: displayItem.total,
        base_one_total: item.base_one_total === undefined ? item.unitPrice : item.base_one_total,
        base_total: item.base_total === undefined ? item.total : item.base_total,
        isManual: !item.specData,
        specData: item.specData || null
      });
    });
    app.companyName = companyName || '';
    app.includeVat = includeVat !== false;
    app.editingIndex = null;
    return true;
  }

  window.LegacyBridge = {
    load: load,
    canAdd: canAdd,
    add: function (moduleName) {
      if (!canAdd(moduleName)) return null;
      return moduleName === 'poly' ? addPolyItem() : addSouvenirItem();
    },
    setSouvenirQuantity: setSouvenirQuantity,
    setSouvenirCalculation: setSouvenirCalculation,
    setSouvenirServices: setSouvenirServices,
    setDecorationViewOnly: function (enabled) {
      const frame = frames.souvenir;
      if (!frame || !frame.contentDocument) return false;
      const doc = frame.contentDocument;
      const styleId = 'unified-decoration-view-only';
      let style = doc.getElementById(styleId);
      if (enabled) {
        if (!style) {
          style = doc.createElement('style');
          style.id = styleId;
          style.textContent = 'body{margin:8px}body>:not(#main-supplier-panel):not(#second-supplier-panel){position:fixed!important;left:-10000px!important;top:0!important;visibility:hidden!important}#main-supplier-panel{margin-top:0}';
          doc.head.appendChild(style);
        }
        const fitFrame = function () {
          const panels = [doc.getElementById('main-supplier-panel'), doc.getElementById('second-supplier-panel')];
          const contentHeight = Math.max(doc.body.scrollHeight, panels.reduce(function (height, panel) {
            return Math.max(height, panel ? panel.getBoundingClientRect().bottom + 8 : 0);
          }, 0));
          const maxHeight = Math.max(140, Math.floor(window.innerHeight * 0.82));
          frame.style.height = Math.min(Math.max(130, Math.ceil(contentHeight)), maxHeight) + 'px';
        };
        if (!observers.souvenirCompactResize && frame.contentWindow.MutationObserver) {
          observers.souvenirCompactResize = new frame.contentWindow.MutationObserver(function () {
            frame.contentWindow.requestAnimationFrame(fitFrame);
          });
          observers.souvenirCompactResize.observe(doc.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['style', 'class'] });
        }
        fitFrame();
      } else if (style) {
        style.remove();
        if (observers.souvenirCompactResize) {
          observers.souvenirCompactResize.disconnect();
          observers.souvenirCompactResize = null;
        }
        frame.style.height = '';
      }
      return true;
    },
    subscribe: function (listener) {
      listeners.add(listener);
      return function () { listeners.delete(listener); };
    },
    getWindow: frameWindow,
    isPolyAuthenticated: function () {
      const app = getPolyApp();
      return Boolean(app && app.isAuthenticated && app.currentManager && app.currentManager.id);
    },
    getPolyManagerId: function () {
      const app = getPolyApp();
      return app && app.currentManager ? app.currentManager.id || null : null;
    },
    getPolyManagers: function () {
      const app = getPolyApp();
      return app && Array.isArray(app.managers) ? app.managers.map(function (manager) {
        return { id: manager.id, name: manager.name };
      }) : [];
    },
    getPolySelectedManagerId: function () {
      const app = getPolyApp();
      return app ? app.selectedManagerId || null : null;
    },
    authenticatePoly: function (managerId, pin, remember) {
      const app = getPolyApp();
      if (!app || typeof app.checkPassword !== 'function') return false;
      app.selectedManagerId = managerId;
      app.enteredPassword = String(pin || '');
      app.rememberMe = Boolean(remember);
      app.authError = false;
      app.checkPassword();
      notify();
      return Boolean(!app.authError && app.isAuthenticated && app.currentManager && String(app.currentManager.id) === String(managerId));
    },
    logoutPoly: function () {
      const app = getPolyApp();
      if (!app || typeof app.logout !== 'function') return false;
      app.logout();
      notify();
      return true;
    },
    getPolyPdfDependencies: function () {
      const frame = frames.poly;
      const app = getPolyApp();
      return {
        pdfMake: frame && frame.contentWindow ? frame.contentWindow.pdfMake : null,
        manager: app && app.currentManager ? app.currentManager : {}
      };
    },
    getPolyHistory: function () {
      const app = getPolyApp();
      return app && Array.isArray(app.userHistory) ? app.userHistory.slice() : [];
    },
    syncPolyQuote: syncPolyQuote,
    isPolyEditing: function () {
      const app = getPolyApp();
      return Boolean(app && app.editingIndex !== null);
    },
    updatePolyItem: function (items) {
      const app = getPolyApp();
      if (!app || app.editingIndex === null || typeof app.updateItemInTable !== 'function') return null;
      const orderItems = Array.isArray(items) ? items : [];
      const source = orderItems[Number(app.editingIndex)];
      if (!source) return null;

      const groupKey = OrderFinance.runGroupKey(source);
      const selectedSpec = app.normalizeSpecLaminations(JSON.parse(JSON.stringify(app.selected)));
      const groupItems = orderItems.filter(function (item) { return OrderFinance.runGroupKey(item) === groupKey; });
      const engine = frameWindow('poly').CalcEngine;
      const calculations = [];

      for (let index = 0; index < groupItems.length; index++) {
        const run = groupItems[index];
        const quantity = String(run.id) === String(source.id) ? Number(selectedSpec.circulation) : Number(run.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) return null;
        const spec = JSON.parse(JSON.stringify(selectedSpec));
        spec.circulation = quantity;
        const result = app.calcPriceForSpec(spec);
        if (!result || result.doesNotFit || !(Number(result.total) > 0)) return null;
        calculations.push({ run: run, spec: spec, result: result, quantity: quantity });
      }

      const editingIndex = Number(app.editingIndex);
      app.updateItemInTable();
      if (app.editingIndex !== null) return null;
      const savedItem = app.savedItems[editingIndex];
      if (!savedItem) return null;
      const baseDetails = decorateItemDetails(Object.assign({}, savedItem, { details: '' }));

      return calculations.map(function (calculation) {
        const run = calculation.run;
        const annotations = Array.isArray(run.annotations) ? run.annotations : [];
        const annotationTotal = annotations.reduce(function (sum, annotation) { return sum + (Number(annotation.total) || 0); }, 0);
        const annotationUnitPrice = annotations.reduce(function (sum, annotation) { return sum + (Number(annotation.unitPrice) || 0); }, 0);
        const annotationCost = annotations.reduce(function (sum, annotation) { return sum + (Number(annotation.productionCost) || 0); }, 0);
        const productionCostByCategory = Object.assign({}, run.productionCostByCategory || {});
        const baseCategory = ['poly', 'souvenir', 'other'].includes(run.category) ? run.category : 'other';
        productionCostByCategory[baseCategory] = Number(calculation.result.productionCost) || 0;
        if (annotationCost > 0) productionCostByCategory.souvenir = annotationCost;
        else delete productionCostByCategory.souvenir;
        const productionCost = Object.keys(productionCostByCategory).reduce(function (sum, category) {
          return sum + (Number(productionCostByCategory[category]) || 0);
        }, 0);
        const details = [baseDetails].concat(annotations.map(function (annotation) {
          return plainText(annotation.annotationText || annotation.details);
        })).filter(Boolean).join('\n');
        const plotterCut = calculation.spec.plotter_cut || calculation.spec.cover_plotter_cut || calculation.spec.back_cover_plotter_cut || 'none';

        return {
          id: run.id,
          title: savedItem.title,
          details: details,
          baseDetails: baseDetails,
          annotations: annotations,
          quantity: calculation.quantity,
          baseUnitPrice: Number(calculation.result.one_total) || 0,
          baseTotal: Number(calculation.result.total) || 0,
          baseProductionCost: Number(calculation.result.productionCost) || 0,
          unitPrice: (Number(calculation.result.one_total) || 0) + annotationUnitPrice,
          total: (Number(calculation.result.total) || 0) + annotationTotal,
          productionCostByCategory: productionCostByCategory,
          productionCost: productionCost,
          productionCostWithTax: calculation.result.productionCostWithTax,
          delivery: engine && typeof engine.calcDeliveryTimeForSpec === 'function'
            ? engine.calcDeliveryTimeForSpec(calculation.spec) || run.delivery
            : run.delivery,
          specData: calculation.spec,
          plotterCut: plotterCut,
          coverPlotterCut: calculation.spec.cover_plotter_cut || 'none',
          backCoverPlotterCut: calculation.spec.back_cover_plotter_cut || 'none'
        };
      });
    },
    calculatePolyRun: function (item, quantity, includeVat) {
      const app = getPolyApp();
      if (!app || !item || !item.specData || typeof app.calcPriceForSpec !== 'function') return null;
      const runQuantity = Number(quantity);
      if (!Number.isFinite(runQuantity) || runQuantity <= 0) return null;
      const spec = app.normalizeSpecLaminations(JSON.parse(JSON.stringify(item.specData)));
      spec.circulation = runQuantity;
      const result = app.calcPriceForSpec(spec);
      if (!result || result.doesNotFit || !(Number(result.total) > 0)) return null;
      const rate = Number(app.config.vat_rate) || 1.16;
      const total = includeVat === false ? Math.round(result.total / rate) : result.total;
      const unitPrice = includeVat === false ? Math.round(total / runQuantity) : result.one_total;
      const engine = frameWindow('poly').CalcEngine;
      return {
        quantity: runQuantity,
        unitPrice: unitPrice,
        total: total,
        base_one_total: result.one_total,
        base_total: result.total,
        productionCost: result.productionCost,
        productionCostWithTax: result.productionCostWithTax,
        delivery: engine && typeof engine.calcDeliveryTimeForSpec === 'function'
          ? engine.calcDeliveryTimeForSpec(spec) || item.delivery
          : item.delivery,
        specData: spec
      };
    },
    editPolyItem: function (itemIndex, items, companyName, includeVat) {
      const app = getPolyApp();
      if (!app) return false;
      const safeIndex = Number(itemIndex);
      const orderItems = Array.isArray(items) ? items : [];
      if (!orderItems.length) return false;
      syncPolyQuote(orderItems, companyName, includeVat);
      const index = Number.isFinite(safeIndex) && safeIndex >= 0 && safeIndex < app.savedItems.length ? safeIndex : 0;
      if (typeof app.editItem === 'function') {
        app.editItem(index);
        setTimeout(function () {
          if (app.$el && app.$el.scrollIntoView) app.$el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 0);
        return true;
      }
      return false;
    },
    savePolyHistory: function (items, companyName, recordId, includeVat, recordManagerId, total) {
      const app = getPolyApp();
      if (!app || !app.isAuthenticated || !app.currentManager || !app.currentManager.id) return null;
      const legacyId = normalizeLegacyHistoryId(recordId);
      if (legacyId === null || legacyId === undefined) return null;
      normalizePolyHistoryIds(app);
      syncPolyQuote(items, companyName, includeVat);
      let existingRecord = app.userHistory.find(function (record) { return String(record.id) === String(legacyId); });
      if (!existingRecord) {
        const savedRecord = window.OrderHistory.getRecords().find(function (record) {
          return String(record.id) === String(legacyId) && String(record.managerId) === String(app.currentManager.id);
        });
        if (savedRecord) {
          savedRecord.id = normalizeLegacyHistoryId(savedRecord.id);
          existingRecord = savedRecord;
          app.userHistory.unshift(savedRecord);
        }
      }
      if (!existingRecord && (!recordManagerId || String(recordManagerId) === String(app.currentManager.id))) {
        existingRecord = {
          id: legacyId,
          managerId: app.currentManager.id,
          managerName: app.currentManager.name,
          date: app.currentDateFormatted,
          company: companyName || '',
          includeVat: includeVat !== false,
          items: JSON.parse(JSON.stringify(app.savedItems)),
          total: Number.isFinite(Number(total)) ? Number(total) : app.grandTotal,
          summary: app.savedItems.map(function (item) { return item.title + ' (' + item.circulation + ' шт)'; }).join(', ')
        };
        app.userHistory.unshift(existingRecord);
      }
      const savedRecord = Object.assign({}, existingRecord || {}, {
        id: legacyId,
        managerId: app.currentManager.id,
        managerName: app.currentManager.name,
        date: app.currentDateFormatted,
        company: companyName || '',
        includeVat: includeVat !== false,
        items: JSON.parse(JSON.stringify(app.savedItems)),
        total: Number.isFinite(Number(total)) ? Number(total) : app.grandTotal,
        summary: app.savedItems.map(function (item) { return item.title + ' (' + item.circulation + ' шт)'; }).join(', '),
        updatedAt: new Date().toISOString()
      });
      const savedIndex = app.userHistory.findIndex(function (record) { return String(record.id) === String(legacyId); });
      if (savedIndex < 0) app.userHistory.unshift(savedRecord);
      else if (app.$set) app.$set(app.userHistory, savedIndex, savedRecord);
      else app.userHistory[savedIndex] = savedRecord;
      app.currentLoadedHistoryId = legacyId;
      if (typeof app.saveCurrentToHistory === 'function') {
        const prevToast = app.showNotification;
        app.showNotification = function () {};
        try {
          app.saveCurrentToHistory();
        } finally {
          app.showNotification = prevToast;
        }
        const idx = app.userHistory.findIndex(function (record) { return String(record.id) === String(legacyId); });
        if (idx >= 0) {
          if (app.$set) app.$set(app.userHistory, idx, savedRecord);
          else app.userHistory[idx] = savedRecord;
        }
        app.saveUserHistory();
      } else {
        app.saveUserHistory();
        postPolyHistoryToGoogle(app, savedRecord);
      }
      return savedRecord;
    },
    addManualPolyItem: function () {
      const app = getPolyApp();
      if (!app || typeof app.addManualItem !== 'function') return null;
      const previousCount = app.savedItems.length;
      app.addManualItem();
      if (app.savedItems.length <= previousCount) return null;
      const item = app.savedItems[app.savedItems.length - 1];
      return Object.assign({}, item, {
        id: 'poly-' + item.id,
        category: 'other',
        title: 'Новая позиция',
        desc: '',
        details: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
        productionCost: 0,
        productionCostWithTax: 0,
        photo: null
      });
    },
    loadPolyHistory: function (record) {
      const app = getPolyApp();
      if (!app || !record) return false;
      normalizePolyHistoryIds(app);
      app.companyName = record.company || '';
      app.savedItems = JSON.parse(JSON.stringify(record.items || []));
      app.currentLoadedHistoryId = normalizeLegacyHistoryId(record.id);
      app.includeVat = record.includeVat !== false;
      return true;
    },
    deletePolyHistory: function (id) {
      const app = getPolyApp();
      if (!app || typeof app.deleteHistoryRecord !== 'function') return false;
      normalizePolyHistoryIds(app);
      const legacyId = normalizeLegacyHistoryId(id);
      const existed = app.userHistory.some(function (record) { return String(record.id) === String(legacyId); });
      if (!existed) return false;
      app.deleteHistoryRecord(legacyId);
      return !app.userHistory.some(function (record) { return String(record.id) === String(legacyId); });
    },
    clearPolyHistory: function () {
      const app = getPolyApp();
      if (!app || typeof app.clearHistory !== 'function') return false;
      const hadRecords = app.userHistory.length > 0;
      app.clearHistory();
      return hadRecords && app.userHistory.length === 0;
    },
    syncPolyHistory: function () {
      const app = getPolyApp();
      if (!app || typeof app.syncWithGoogleSheets !== 'function') return false;
      app.syncWithGoogleSheets();
      return true;
    },
    exportPolyHistory: function () {
      const app = getPolyApp();
      if (!app || typeof app.exportHistoryJson !== 'function') return false;
      app.exportHistoryJson();
      return true;
    },
    importPolyHistory: function (file) {
      const app = getPolyApp();
      if (!app || typeof app.importHistoryJson !== 'function') return false;
      app.importHistoryJson({ target: { files: [file], value: '' } });
      return true;
    },
    copyPolyQuote: function (items, companyName) {
      const app = getPolyApp();
      if (!app || !items.length || typeof app.copyTable !== 'function') return false;
      syncPolyQuote(items, companyName);
      app.copyTable();
      return true;
    },
    exportPolyPdf: function (items, companyName) {
      const app = getPolyApp();
      if (!app || !items.length || typeof app.exportToPDF !== 'function') return false;
      syncPolyQuote(items, companyName);
      const saveHistory = app.saveCurrentToHistory;
      const showNotification = app.showNotification;
      app.saveCurrentToHistory = function () {};
      app.showNotification = function () {};
      try {
        app.exportToPDF();
        return true;
      } catch (error) {
        console.error('Ошибка экспорта PDF:', error);
        return false;
      } finally {
        app.saveCurrentToHistory = saveHistory;
        app.showNotification = showNotification;
      }
    }
  };
})();
