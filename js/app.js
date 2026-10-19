(function () {
  let activeModule = 'poly';
  const currentHistoryStorageKey = 'unified-calc-current-history-id';
  const currentHistoryManagerStorageKey = 'unified-calc-current-history-manager-id';
  const currentHistoryCompanyStorageKey = 'unified-calc-current-history-company';
  function normalizeHistoryId(id) {
    if (id === null || id === undefined || id === '') return null;
    const value = String(id);
    const numeric = Number(value);
    return /^\d+$/.test(value) && Number.isSafeInteger(numeric) ? numeric : id;
  }
  let currentHistoryId = normalizeHistoryId(localStorage.getItem(currentHistoryStorageKey));
  let currentHistoryManagerId = localStorage.getItem(currentHistoryManagerStorageKey) || null;
  let pendingDecorationItemId = null;
  let pendingDecorationEditIndex = null;
  let pendingStockDecorationEdit = false;
  let pendingDecorationRestoreUnavailable = false;
  let overtimeTargetGroupId = '';
  let cashbackTargetGroupId = '';
  let overtimeEditingAdjustmentId = '';
  let overtimeEditingLineId = '';
  let cashbackEditingAdjustmentId = '';
  let souvenirImportRequestId = 0;
  const calcContainer = document.querySelector('.calc-container');
  const souvenirModule = document.getElementById('module-souvenir');
  const calcActions = document.querySelector('.calc-actions');
  const decorationDialog = document.getElementById('decoration-dialog');
  const decorationCalculatorSlot = document.getElementById('decoration-calculator-slot');
  const decorationActionsSlot = document.getElementById('decoration-actions-slot');
  const productCalculatorDialog = document.getElementById('product-calculator-dialog');
  const productCalculatorSlot = document.getElementById('product-calculator-slot');
  const productCalculatorTitle = document.getElementById('product-calculator-title');
  const positionTypeDialog = document.getElementById('position-type-dialog');
  const souvenirLinkDialog = document.getElementById('souvenir-link-dialog');
  const souvenirProductUrl = document.getElementById('souvenir-product-url');
  const souvenirLinkStatus = document.getElementById('souvenir-link-status');
  const importSouvenirLinkButton = document.getElementById('btn-import-souvenir-link');
  const newQuoteDialog = document.getElementById('new-quote-dialog');
  const overtimeDialog = document.getElementById('overtime-dialog');
  const overtimeDisplayModeSelect = document.getElementById('overtime-display-mode');
  const overtimeTargetLabel = document.getElementById('overtime-target-label');
  const overtimePreview = document.getElementById('overtime-preview');
  const addOvertimeButton = document.getElementById('btn-add-overtime');
  const cashbackDialog = document.getElementById('cashback-dialog');
  const cashbackTargetLabel = document.getElementById('cashback-target-label');
  const cashbackPreview = document.getElementById('cashback-preview');
  const addCashbackButton = document.getElementById('btn-add-cashback');
  const cashbackModeSelect = document.getElementById('cashback-mode');
  const cashbackAmountInput = document.getElementById('cashback-amount');
  const kpBody = document.getElementById('kp-items');
  const addToKpButton = document.getElementById('btn-add-to-kp');
  const companyInput = document.getElementById('company-name');
  const vatToggle = document.getElementById('vat-toggle');
  const discountValueInput = document.getElementById('discount-value');
  const discountTypeSelect = document.getElementById('discount-type');
  const discountScopeSelect = document.getElementById('discount-scope');
  const discountItemSelect = document.getElementById('discount-item');
  const manualTotalToggle = document.getElementById('manual-total-enabled');
  const manualTotalInput = document.getElementById('manual-total-value');
  const hideTotalToggle = document.getElementById('hide-total-toggle');
  const vatStorageKey = 'unified-calc-include-vat';
  const quoteSettingsStorageKey = 'unified-calc-quote-settings';
  productCalculatorSlot.appendChild(calcContainer);
  let includeVat = localStorage.getItem(vatStorageKey) !== 'false';
  vatToggle.checked = includeVat;

  function readQuoteSettings() {
    try {
      return JSON.parse(localStorage.getItem(quoteSettingsStorageKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function hasActiveDiscount() {
    return (Number(readQuoteSettings().discountValue) || 0) > 0;
  }

  function hasCashback(items) {
    return items.some(function (item) {
      return (item.quoteInternalAdjustments || []).some(function (adjustment) { return adjustment.type === 'cashback'; });
    });
  }

  function resolveDiscountItemId(items, selectedId) {
    const rawId = String(selectedId || '');
    if (!rawId) return '';
    const group = OrderFinance.groupRuns(items).find(function (runItems) {
      const item = runItems[0];
      const legacyId = item.runGroupId !== undefined && item.runGroupId !== null ? String(item.runGroupId) : String(item.id);
      return OrderFinance.runGroupKey(item) === rawId || legacyId === rawId;
    });
    return group ? OrderFinance.runGroupKey(group[0]) : rawId;
  }

  function getQuoteSettings() {
    const settings = readQuoteSettings();
    const manualTotal = settings.manualTotal !== undefined && settings.manualTotal !== null && settings.manualTotal !== ''
      ? Number(settings.manualTotal)
      : null;
    return {
      discountType: settings.discountType === 'amount' ? 'amount' : 'percent',
      discountValue: Number(settings.discountValue) || 0,
      discountScope: settings.discountScope === 'position' || (settings.discountScope === 'item' && settings.discountItemId) ? 'position' : 'order',
      discountItemId: resolveDiscountItemId(productItems(), settings.discountItemId),
      manualTotal: Number.isFinite(manualTotal) ? manualTotal : null,
      hideTotal: Boolean(settings.hideTotal),
      discountEnabled: (Number(settings.discountValue) || 0) > 0 && !hasCashback(productItems())
    };
  }

  function persistQuoteSettings(settings) {
    localStorage.setItem(quoteSettingsStorageKey, JSON.stringify({
      discountType: settings.discountType || 'percent',
      discountValue: Number(settings.discountValue) || 0,
      discountScope: settings.discountScope === 'position' ? 'position' : 'order',
      discountItemId: settings.discountScope === 'position' ? String(settings.discountItemId || '') : '',
      manualTotal: settings.manualTotal !== null && settings.manualTotal !== undefined && settings.manualTotal !== '' ? Number(settings.manualTotal) : null,
      hideTotal: Boolean(settings.hideTotal)
    }));
  }

  function persistCurrentHistoryId() {
    if (currentHistoryId) {
      localStorage.setItem(currentHistoryStorageKey, String(currentHistoryId));
      if (currentHistoryManagerId) localStorage.setItem(currentHistoryManagerStorageKey, String(currentHistoryManagerId));
      else localStorage.removeItem(currentHistoryManagerStorageKey);
      localStorage.setItem(currentHistoryCompanyStorageKey, companyInput.value);
    } else {
      localStorage.removeItem(currentHistoryStorageKey);
      localStorage.removeItem(currentHistoryManagerStorageKey);
      localStorage.removeItem(currentHistoryCompanyStorageKey);
    }
  }

  function updateDiscountItemOptions(items, preferredItemId) {
    const discountableItems = items.filter(function (item) { return !item.quoteAdjustment; });
    const selectedId = resolveDiscountItemId(discountableItems, preferredItemId == null ? discountItemSelect.value : preferredItemId);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Выберите позицию';
    discountItemSelect.replaceChildren(placeholder);
    let selectedExists = false;
    OrderFinance.groupRuns(discountableItems).forEach(function (runItems, index) {
      const item = runItems[0];
      const option = document.createElement('option');
      option.value = OrderFinance.runGroupKey(item);
      option.textContent = '№' + (index + 1) + ' · ' + String(item.title || 'Позиция') + (runItems.length > 1 ? ' (' + runItems.length + ' тиража)' : '');
      discountItemSelect.appendChild(option);
      if (option.value === selectedId) selectedExists = true;
    });
    discountItemSelect.value = selectedExists ? selectedId : '';
    discountItemSelect.classList.toggle('hidden', discountScopeSelect.value !== 'position');
    discountItemSelect.disabled = discountScopeSelect.value !== 'position' || !selectedExists && discountItemSelect.options.length <= 1;
  }

  function productItems() {
    return OrderState.getItems().filter(function (item) { return !item.quoteAdjustment; });
  }

  function moneyAllocations(amount, items) {
    if (!items.length) return [];
    const weights = items.map(function (item) { return Math.max(0, Number(item.total) || 0); });
    const totalWeight = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
    let assigned = 0;
    return items.map(function (item, index) {
      const allocated = index === items.length - 1
        ? Math.round((amount - assigned) * 100) / 100
        : Math.round((totalWeight > 0 ? amount * weights[index] / totalWeight : amount / items.length) * 100) / 100;
      assigned += allocated;
      return allocated;
    });
  }

  function targetItems(groupId) {
    const items = productItems();
    if (!groupId) return items;
    return items.filter(function (item) { return OrderFinance.runGroupKey(item) === groupId; });
  }

  function targetItemsWithoutAdjustment(groupId, adjustmentId) {
    const excludedIds = new Set(Array.isArray(adjustmentId) ? adjustmentId.map(String) : String(adjustmentId || '').split('|'));
    return targetItems(groupId).map(function (item) {
      const adjustments = Array.isArray(item.quoteInternalAdjustments) ? item.quoteInternalAdjustments : [];
      const removed = adjustments.filter(function (adjustment) { return excludedIds.has(String(adjustment.id)); });
      const charge = removed.reduce(function (sum, adjustment) { return sum + (Number(adjustment.chargeAmount) || 0); }, 0);
      const quantity = Number(item.quantity) || 1;
      return Object.assign({}, item, {
        total: (Number(item.total) || 0) - charge,
        unitPrice: (Number(item.unitPrice) || 0) - charge / quantity,
        quoteInternalAdjustments: adjustments.filter(function (adjustment) { return !excludedIds.has(String(adjustment.id)); })
      });
    });
  }

  function collectInternalAdjustments(type, groupId) {
    const scope = groupId ? 'position' : 'order';
    const grouped = new Map();
    targetItems(groupId).forEach(function (item) {
      (item.quoteInternalAdjustments || []).forEach(function (adjustment) {
        if (adjustment.type !== type || adjustment.scope !== scope || !adjustment.id) return;
        const id = String(adjustment.id);
        let summary = grouped.get(id);
        if (!summary) {
          summary = {
            id: id,
            chargeAmount: 0,
            expenseAmount: 0,
            mode: adjustment.mode || 'invoice',
            requestedAmount: Number(adjustment.requestedAmount) || Number(adjustment.chargeAmount) || 0,
            printerHours: Number(adjustment.printerHours) || 0,
            bindingHours: Number(adjustment.bindingHours) || 0,
            displayMode: adjustment.displayMode || 'spread'
          };
          grouped.set(id, summary);
        }
        summary.chargeAmount += Number(adjustment.chargeAmount) || 0;
        summary.expenseAmount += Number(adjustment.expenseAmount) || 0;
      });
    });
    return Array.from(grouped.values());
  }

  function buildOvertimeDraft() {
    const printerHours = Math.max(0, Number(document.getElementById('overtime-printer-hours').value) || 0);
    const bindingHours = Math.max(0, Number(document.getElementById('overtime-binding-hours').value) || 0);
    const expense = printerHours * 4000 + bindingHours * 1800;
    if (!expense) return null;
    return {
      printerHours: printerHours,
      bindingHours: bindingHours,
      expense: expense,
      charge: Math.round(expense * 1.35),
      items: overtimeEditingAdjustmentId
        ? targetItemsWithoutAdjustment(overtimeTargetGroupId, overtimeEditingAdjustmentId)
        : targetItems(overtimeTargetGroupId)
    };
  }

  function buildCashbackDraft() {
    const requested = Number(cashbackAmountInput.value);
    if (!Number.isFinite(requested) || requested <= 0) return null;
    const charge = cashbackModeSelect.value === 'net' ? Math.round(requested * 1.7052) : requested;
    return {
      requested: requested,
      charge: charge,
      expense: charge,
      items: cashbackEditingAdjustmentId
        ? targetItemsWithoutAdjustment(cashbackTargetGroupId, cashbackEditingAdjustmentId)
        : targetItems(cashbackTargetGroupId)
    };
  }

  function updateOvertimePreview() {
    const draft = buildOvertimeDraft();
    addOvertimeButton.disabled = !draft || !draft.items.length;
    overtimePreview.textContent = draft
      ? 'Расходы: ' + OrderFinance.formatAmount(draft.expense) + ' теңге · к счёту: ' + OrderFinance.formatAmount(draft.charge) + ' теңге'
      : 'Укажите количество сверхурочных часов.';
  }

  function updateCashbackPreview() {
    const draft = buildCashbackDraft();
    const blockedByDiscount = hasActiveDiscount() && !cashbackEditingAdjustmentId;
    addCashbackButton.disabled = !draft || !draft.items.length || blockedByDiscount;
    cashbackPreview.textContent = draft
      ? (blockedByDiscount
        ? 'Сначала уберите скидку, чтобы добавить кэшбек.'
        : (cashbackModeSelect.value === 'net'
          ? 'На руки: ' + OrderFinance.formatAmount(draft.requested) + ' теңге · к счёту: ' + OrderFinance.formatAmount(draft.charge) + ' теңге'
          : 'Добавить к счёту: ' + OrderFinance.formatAmount(draft.charge) + ' теңге'))
      : 'Укажите сумму кэшбека.';
  }

  function openOvertimeDialog(groupId, adjustmentId) {
    overtimeTargetGroupId = groupId || '';
    const saved = adjustmentId ? collectInternalAdjustments('overtime', overtimeTargetGroupId) : [];
    overtimeEditingAdjustmentId = saved.map(function (entry) { return entry.id; }).join('|');
    overtimeEditingLineId = '';
    const savedPrinterHours = saved.reduce(function (sum, entry) { return sum + entry.printerHours; }, 0);
    const savedBindingHours = saved.reduce(function (sum, entry) { return sum + entry.bindingHours; }, 0);
    const target = overtimeTargetGroupId ? targetItems(overtimeTargetGroupId)[0] : null;
    overtimeTargetLabel.textContent = target ? 'Позиция: ' + target.title : 'Всё КП';
    document.getElementById('overtime-printer-hours').value = String(saved.length ? savedPrinterHours : 0);
    document.getElementById('overtime-binding-hours').value = String(saved.length ? savedBindingHours : 0);
    overtimeDisplayModeSelect.value = saved[0] && saved[0].displayMode === 'line' ? 'line' : 'spread';
    addOvertimeButton.textContent = saved.length ? 'Сохранить изменения' : 'Добавить';
    document.getElementById('btn-remove-overtime').classList.toggle('hidden', !saved.length);
    updateOvertimePreview();
    overtimeDialog.showModal();
  }

  function openOvertimeLineDialog(itemId) {
    const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(itemId); });
    if (!item) return;
    overtimeTargetGroupId = item.quoteTargetGroupId || '';
    overtimeEditingAdjustmentId = '';
    overtimeEditingLineId = item.id;
    const target = overtimeTargetGroupId ? targetItems(overtimeTargetGroupId)[0] : null;
    overtimeTargetLabel.textContent = target ? 'Позиция: ' + target.title : 'Всё КП';
    document.getElementById('overtime-printer-hours').value = String(item.printerHours || 0);
    document.getElementById('overtime-binding-hours').value = String(item.bindingHours || 0);
    overtimeDisplayModeSelect.value = 'line';
    addOvertimeButton.textContent = 'Сохранить изменения';
    document.getElementById('btn-remove-overtime').classList.remove('hidden');
    updateOvertimePreview();
    overtimeDialog.showModal();
  }

  function openCashbackDialog(groupId, adjustmentId) {
    cashbackTargetGroupId = groupId || '';
    const saved = adjustmentId ? collectInternalAdjustments('cashback', cashbackTargetGroupId) : [];
    cashbackEditingAdjustmentId = saved.map(function (entry) { return entry.id; }).join('|');
    const target = cashbackTargetGroupId ? targetItems(cashbackTargetGroupId)[0] : null;
    cashbackTargetLabel.textContent = target ? 'Позиция: ' + target.title : 'Всё КП · распределение пропорционально суммам позиций';
    cashbackModeSelect.value = saved[0] && saved[0].mode === 'net' ? 'net' : 'invoice';
    cashbackAmountInput.value = saved.length ? String(saved.reduce(function (sum, entry) { return sum + entry.requestedAmount; }, 0)) : '';
    addCashbackButton.textContent = saved.length ? 'Сохранить изменения' : 'Добавить';
    document.getElementById('btn-remove-cashback').classList.toggle('hidden', !saved.length);
    updateCashbackPreview();
    cashbackDialog.showModal();
  }

  function overtimeDescription(draft) {
    return [
      draft.printerHours ? 'Печатники: ' + draft.printerHours + ' ч' : '',
      draft.bindingHours ? 'Переплёт: ' + draft.bindingHours + ' ч' : ''
    ].filter(Boolean).join('; ');
  }

  function addOvertimeFromDialog() {
    const draft = buildOvertimeDraft();
    if (!draft) return;
    const scope = overtimeTargetGroupId ? 'position' : 'order';
    if (overtimeEditingAdjustmentId) removeInternalAdjustment(overtimeEditingAdjustmentId);
    const oldLine = overtimeEditingLineId
      ? OrderState.getItems().find(function (item) { return String(item.id) === String(overtimeEditingLineId); })
      : null;
    if (oldLine) {
      adjustManualTotal(-(Number(oldLine.total) || 0));
      OrderState.remove(oldLine.id);
    }
    if (overtimeDisplayModeSelect.value === 'line') {
      const details = overtimeDescription(draft);
      const target = overtimeTargetGroupId ? draft.items[0] : null;
      const charge = target ? moneyAllocations(draft.charge, [target])[0] : draft.charge;
      const expense = target ? moneyAllocations(draft.expense, [target])[0] : draft.expense;
      OrderState.add({
        category: 'other',
        title: target ? 'Сверхурочные · ' + target.title : 'Сверхурочные',
        details: details,
        quantity: 1,
        unitPrice: charge,
        total: charge,
        productionCost: 0,
        productionCostByCategory: { other: 0 },
        quoteAdjustment: true,
        quoteAdjustmentType: 'overtime-line',
        overtimeExpense: expense,
        printerHours: draft.printerHours,
        bindingHours: draft.bindingHours,
        quoteTargetGroupId: overtimeTargetGroupId,
        delivery: ''
      });
      adjustManualTotal(charge);
    } else {
      applyInternalAdjustment('overtime', draft.charge, draft.expense, draft.items, scope, {
        printerHours: draft.printerHours,
        bindingHours: draft.bindingHours,
        displayMode: 'spread'
      });
    }
    overtimeDialog.close();
    overtimeEditingAdjustmentId = '';
    overtimeEditingLineId = '';
    document.getElementById('quote-export-status').textContent = 'Сверхурочные добавлены.';
  }

  function addCashbackFromDialog() {
    const draft = buildCashbackDraft();
    if (!draft) return;
    if (hasActiveDiscount() && !cashbackEditingAdjustmentId) return;
    if (hasActiveDiscount() && !cashbackEditingAdjustmentId) return;
    if (cashbackEditingAdjustmentId) removeInternalAdjustment(cashbackEditingAdjustmentId);
    applyInternalAdjustment('cashback', draft.charge, draft.expense, draft.items, cashbackTargetGroupId ? 'position' : 'order', {
      mode: cashbackModeSelect.value,
      requestedAmount: draft.requested
    });
    cashbackDialog.close();
    cashbackEditingAdjustmentId = '';
    document.getElementById('quote-export-status').textContent = 'Кэшбек добавлен в расчёт.';
  }

  function removeOvertimeFromDialog() {
    if (overtimeEditingAdjustmentId) removeInternalAdjustment(overtimeEditingAdjustmentId);
    if (overtimeEditingLineId) {
      const line = OrderState.getItems().find(function (item) { return String(item.id) === String(overtimeEditingLineId); });
      if (line) {
        adjustManualTotal(-(Number(line.total) || 0));
        OrderState.remove(line.id);
      }
    }
    overtimeDialog.close();
    overtimeEditingAdjustmentId = '';
    overtimeEditingLineId = '';
    document.getElementById('quote-export-status').textContent = 'Сверхурочные удалены.';
  }

  function removeCashbackFromDialog() {
    if (cashbackEditingAdjustmentId) removeInternalAdjustment(cashbackEditingAdjustmentId);
    cashbackDialog.close();
    cashbackEditingAdjustmentId = '';
    document.getElementById('quote-export-status').textContent = 'Кэшбек удалён.';
  }

  function applyInternalAdjustment(type, chargeAmount, expenseAmount, items, scope, metadata) {
    if (!items.length) return false;
    const charges = moneyAllocations(chargeAmount, items);
    const expenses = moneyAllocations(expenseAmount, items);
    const id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
    items.forEach(function (item, index) {
      const quantity = Number(item.quantity) || 1;
      const adjustments = Array.isArray(item.quoteInternalAdjustments) ? item.quoteInternalAdjustments.slice() : [];
      adjustments.push({
        id: id,
        type: type,
        scope: scope,
        chargeAmount: charges[index],
        expenseAmount: expenses[index],
        metadata: metadata || {},
        mode: metadata && metadata.mode,
        requestedAmount: metadata && metadata.requestedAmount,
        printerHours: metadata && metadata.printerHours,
        bindingHours: metadata && metadata.bindingHours,
        displayMode: metadata && metadata.displayMode
      });
      OrderState.update(item.id, {
        total: (Number(item.total) || 0) + charges[index],
        unitPrice: (Number(item.unitPrice) || 0) + charges[index] / quantity,
        quoteInternalAdjustments: adjustments
      });
    });
    adjustManualTotal(chargeAmount);
    return id;
  }

  function adjustManualTotal(delta) {
    const settings = getQuoteSettings();
    if (settings.manualTotal === null) return;
    settings.manualTotal = Math.max(0, settings.manualTotal + delta);
    persistQuoteSettings(settings);
    applyQuoteSettingsToControls(settings);
  }

  function removeInternalAdjustment(adjustmentId) {
    const ids = new Set(Array.isArray(adjustmentId) ? adjustmentId.map(String) : String(adjustmentId || '').split('|'));
    let removedTotal = 0;
    OrderState.getItems().forEach(function (item) {
      const adjustments = Array.isArray(item.quoteInternalAdjustments) ? item.quoteInternalAdjustments : [];
      const removed = adjustments.filter(function (adjustment) { return ids.has(String(adjustment.id)); });
      if (!removed.length) return;
      const amount = removed.reduce(function (sum, adjustment) { return sum + (Number(adjustment.chargeAmount) || 0); }, 0);
      removedTotal += amount;
      const quantity = Number(item.quantity) || 1;
      OrderState.update(item.id, {
        total: (Number(item.total) || 0) - amount,
        unitPrice: (Number(item.unitPrice) || 0) - amount / quantity,
        quoteInternalAdjustments: adjustments.filter(function (adjustment) { return !ids.has(String(adjustment.id)); })
      });
    });
    if (removedTotal) adjustManualTotal(-removedTotal);
  }

  function applyQuoteSettingsToControls(settings) {
    const normalized = OrderFinance.normalizeQuoteSettings(settings || getQuoteSettings());
    discountTypeSelect.value = normalized.discountType;
    discountValueInput.value = normalized.discountValue || 0;
    discountScopeSelect.value = normalized.discountScope;
    updateDiscountItemOptions(OrderState.getItems(), normalized.discountItemId);
    manualTotalToggle.checked = normalized.manualTotal !== null;
    manualTotalInput.disabled = !manualTotalToggle.checked;
    manualTotalInput.value = normalized.manualTotal !== null ? String(normalized.manualTotal) : '';
    hideTotalToggle.checked = normalized.hideTotal;
  }

  function saveQuoteSettingsFromControls() {
    const settings = {
      discountType: discountTypeSelect.value,
      discountValue: Number(discountValueInput.value) || 0,
      discountScope: discountScopeSelect.value,
      discountItemId: discountItemSelect.value,
      manualTotal: manualTotalToggle.checked && manualTotalInput.value !== '' ? Number(manualTotalInput.value) : null,
      hideTotal: hideTotalToggle.checked
    };
    persistQuoteSettings(settings);
    return settings;
  }

  function setActiveModule(moduleName) {
    activeModule = moduleName;
    document.getElementById('module-poly').classList.toggle('hidden', moduleName !== 'poly');
    document.getElementById('module-souvenir').classList.toggle('hidden', moduleName !== 'souvenir');
    updateCalculationStatus();
    return LegacyBridge.load(moduleName).then(function () {
      if (moduleName === 'souvenir' && pendingDecorationItemId) {
        const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(pendingDecorationItemId); });
        if (item) {
          const fullCalculator = item.category === 'souvenir';
          LegacyBridge.setDecorationViewOnly(!fullCalculator);
          LegacyBridge.setSouvenirQuantity(item.quantity);
        }
      }
      updateCalculationStatus();
    }).catch(function () {
      document.getElementById('calc-status').textContent = 'Не удалось загрузить калькулятор';
    });
  }

  function openDecorationDialog(fullCalculator) {
    decorationDialog.classList.toggle('decoration-dialog-full', Boolean(fullCalculator));
    document.getElementById('decoration-dialog-title').textContent = pendingDecorationEditIndex === null ? 'Добавление нанесения' : 'Изменение нанесения';
    decorationCalculatorSlot.appendChild(souvenirModule);
    decorationActionsSlot.appendChild(calcActions);
    if (!decorationDialog.open) decorationDialog.showModal();
  }

  function openProductCalculator(moduleName) {
    productCalculatorTitle.textContent = moduleName === 'poly' ? 'Полиграфия' : 'Сувенирная продукция';
    calcContainer.classList.remove('hidden');
    productCalculatorDialog.showModal();
    return setActiveModule(moduleName);
  }

  function normalizeSouvenirProductUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      const allowedHosts = ['happygifts.ru', 'artegifts.by', 'oasiscatalog.com', 'gifts.ru', 'portobello.ru', 'ucontay.kz'];
      const isAllowedHost = allowedHosts.some(function (host) {
        return url.hostname === host || url.hostname.endsWith('.' + host);
      });
      return url.protocol === 'https:' && isAllowedHost ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function getSouvenirProductDelivery(value) {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      const hostsWithDefaultDelivery = ['gifts.ru', 'happygifts.ru', 'artegifts.by', 'portobello.ru', 'oasiscatalog.com'];
      return hostsWithDefaultDelivery.some(function (host) {
        return hostname === host || hostname.endsWith('.' + host);
      }) ? '14-17' : '';
    } catch (error) {
      return '';
    }
  }

  function findProductSchema(value) {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        const product = findProductSchema(value[index]);
        if (product) return product;
      }
      return null;
    }
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.some(function (type) { return /product/i.test(String(type || '')); })) return value;
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index++) {
      const product = findProductSchema(value[keys[index]]);
      if (product) return product;
    }
    return null;
  }

  function productImageValue(value) {
    if (Array.isArray(value)) return value.length ? productImageValue(value[0]) : '';
    if (value && typeof value === 'object') return productImageValue(value.contentUrl || value.url || value.image);
    return typeof value === 'string' ? value : '';
  }

  function getSouvenirProductImageUrl(doc, pageUrl, productName, productSchema) {
    const structuredImage = productImageValue(productSchema && productSchema.image);
    const metaImage = doc.querySelector('meta[property="og:image"]')?.content
      || doc.querySelector('meta[name="twitter:image"]')?.content
      || '';
    const normalizedName = String(productName || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const matchingImages = Array.from(doc.images).filter(function (image) {
      const alt = String(image.alt || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return alt && (alt === normalizedName || normalizedName.includes(alt) || alt.includes(normalizedName));
    }).map(function (image) {
      return image.getAttribute('data-src') || image.getAttribute('data-original') || image.getAttribute('srcset')?.split(',')[0].trim().split(/\s+/)[0] || image.getAttribute('src') || '';
    });
    const articleCode = pageUrl.match(/articul[_-](\d+)/i)?.[1];
    const articleImages = articleCode ? Array.from(doc.images).map(function (image) {
      return image.getAttribute('data-src') || image.getAttribute('data-original') || image.getAttribute('srcset')?.split(',')[0].trim().split(/\s+/)[0] || image.getAttribute('src') || '';
    }).filter(function (source) { return source && source.includes(articleCode); }) : [];
    const candidates = [structuredImage, metaImage].concat(matchingImages, articleImages);
    for (let index = 0; index < candidates.length; index++) {
      const candidate = String(candidates[index] || '').trim();
      if (!candidate || candidate.startsWith('data:image/gif')) continue;
      try {
        const imageUrl = new URL(candidate, pageUrl);
        if (imageUrl.protocol === 'https:' && !/\.svg(?:$|\?)/i.test(imageUrl.pathname)) return imageUrl.href;
      } catch (error) {
        continue;
      }
    }
    return '';
  }

  async function fetchSouvenirResource(url, errorMessage) {
    let directFailure = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, { credentials: 'omit' });
        if (response.ok) return response;
        directFailure = new Error('HTTP ' + response.status);
      } catch (error) {
        directFailure = error;
      }
      if (attempt === 0) await new Promise(function (resolve) { window.setTimeout(resolve, 300); });
    }

    try {
      const proxyUrl = 'http://127.0.0.1:8767/proxy?url=' + encodeURIComponent(url);
      const response = await fetch(proxyUrl, { credentials: 'omit' });
      if (response.ok) return response;
      let proxyMessage = '';
      try {
        const body = await response.json();
        proxyMessage = body.error || '';
      } catch (error) {
        proxyMessage = '';
      }
      throw new Error(proxyMessage || 'Локальный мост вернул HTTP ' + response.status);
    } catch (proxyError) {
      if (proxyError && proxyError.message && proxyError.message.includes('Локальный мост')) {
        throw new Error(errorMessage + ' ' + proxyError.message + '. Запустите souvenir-import-proxy.ps1.');
      }
      throw new Error(errorMessage + ' Локальный мост импорта не запущен; выполните souvenir-import-proxy.ps1.');
    }
  }

  async function importSouvenirProductFromUrl(rawUrl) {
    const pageUrl = normalizeSouvenirProductUrl(rawUrl);
    if (!pageUrl) throw new Error('Вставьте HTTPS-ссылку из поддерживаемого каталога');
    const pageResponse = await fetchSouvenirResource(pageUrl, 'Не удалось получить страницу товара из браузера (ограничение CORS или сети). Проверьте полный адрес или выберите ручной ввод.');
    if (!pageResponse.ok) throw new Error('Каталог не ответил: ' + pageResponse.status);
    const responseUrl = new URL(pageResponse.url || pageUrl);
    const isLocalProxyResponse = responseUrl.hostname === '127.0.0.1' && responseUrl.port === '8767';
    const finalUrl = normalizeSouvenirProductUrl(isLocalProxyResponse ? pageUrl : responseUrl.href);
    if (!finalUrl) throw new Error('Ссылка перенаправила на неподдерживаемый сайт');
    const html = await pageResponse.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let productSchema = null;
    Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).some(function (script) {
      try {
        productSchema = findProductSchema(JSON.parse(script.textContent));
      } catch (error) {
        productSchema = null;
      }
      return Boolean(productSchema);
    });
    const heading = String(doc.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim();
    const socialTitle = String(doc.querySelector('meta[property="og:title"]')?.content || doc.title || '').replace(/\s+/g, ' ').trim();
    const title = String(productSchema && productSchema.name || heading || socialTitle).replace(/\s+/g, ' ').trim();
    const fullTitle = String(heading || productSchema && productSchema.name || socialTitle || title).replace(/\s+/g, ' ').trim();
    if (!title) throw new Error('Не удалось найти название товара на странице');
    const imageUrl = getSouvenirProductImageUrl(doc, finalUrl, title, productSchema);
    if (!imageUrl) throw new Error('На странице не нашлась главная фотография товара');
    const imageResponse = await fetchSouvenirResource(imageUrl, 'Карточка товара открылась, но сайт не разрешил загрузить фото. Попробуйте другую ссылку или ручной ввод.');
    if (!imageResponse.ok) throw new Error('Не удалось загрузить фотографию товара');
    const imageBlob = await imageResponse.blob();
    if (!imageBlob.type.startsWith('image/')) throw new Error('Ссылка товара вернула не изображение');
    const bitmap = await createImageBitmap(imageBlob);
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const photo = canvas.toDataURL('image/jpeg', 0.84);
    return { title: title, fullTitle: fullTitle, photo: photo, sourceUrl: finalUrl };
  }

  function closeProductCalculatorDialog() {
    if (productCalculatorDialog.open) productCalculatorDialog.close();
    calcContainer.classList.add('hidden');
  }

  function closeDecorationDialog() {
    if (decorationDialog.open) decorationDialog.close();
    LegacyBridge.setDecorationViewOnly(false);
    calcContainer.appendChild(calcActions);
    calcContainer.insertBefore(souvenirModule, calcActions);
    pendingDecorationItemId = null;
    pendingDecorationEditIndex = null;
    pendingStockDecorationEdit = false;
    pendingDecorationRestoreUnavailable = false;
    document.getElementById('decoration-dialog-title').textContent = 'Добавление нанесения';
    return setActiveModule('poly');
  }

  function updateCalculationStatus() {
    const pendingItem = OrderState.getItems().find(function (item) { return String(item.id) === String(pendingDecorationItemId); });
    if (!pendingItem) {
      pendingDecorationItemId = null;
      pendingDecorationEditIndex = null;
    }
    const decorationMode = Boolean(pendingDecorationItemId);
    const editingStockDecoration = decorationMode && pendingStockDecorationEdit;
    const annotations = pendingItem && Array.isArray(pendingItem.annotations) ? pendingItem.annotations : [];
    const editingAnnotation = pendingDecorationEditIndex !== null ? annotations[pendingDecorationEditIndex] : null;
    const previousDecoration = editingAnnotation
      ? ((editingAnnotation.services || []).join(' + ') || plainText(editingAnnotation.details || editingAnnotation.annotationText) || 'без описания')
      : '';
    const editingPoly = !decorationMode && activeModule === 'poly' && LegacyBridge.isPolyEditing();
    const ready = decorationMode
      ? activeModule === 'souvenir' && LegacyBridge.canAdd('souvenir')
      : LegacyBridge.canAdd(activeModule);
    const canKeepExistingDecoration = Boolean(editingAnnotation && pendingDecorationRestoreUnavailable && !ready);
    addToKpButton.disabled = (!ready && !canKeepExistingDecoration) || (editingStockDecoration && pendingDecorationRestoreUnavailable);
    addToKpButton.textContent = decorationMode
      ? (activeModule === 'souvenir'
        ? (canKeepExistingDecoration ? 'Оставить без изменений' : (editingAnnotation || editingStockDecoration ? 'Сохранить изменения' : (pendingItem.category === 'souvenir' ? 'Добавить в КП' : 'Добавить нанесение в позицию')))
        : 'Продолжить расчет нанесения')
      : (editingPoly ? 'Сохранить изменения' : '+ Добавить в КП');
    document.getElementById('btn-cancel-decoration').classList.toggle('hidden', !decorationMode);
    document.getElementById('calc-status').textContent = decorationMode
      ? (editingStockDecoration
        ? (pendingDecorationRestoreUnavailable
          ? 'Восстанавливаю параметры складской позиции…'
          : (ready ? 'Нанесение рассчитано. Сохраните изменения.' : 'Выберите услугу и выполните расчет нанесения'))
        : (editingAnnotation
        ? (ready ? (pendingDecorationRestoreUnavailable
          ? 'Сумма пересчитана. Исходные цена и курс не сохранены; проверьте цену и курс перед сохранением. Было: ' + previousDecoration
          : 'Новое нанесение рассчитано. Было: ' + previousDecoration) : (canKeepExistingDecoration
          ? 'Исходные цена и курс не сохранены. Тираж восстановлен, валюта ₽ выбрана; введите цену и проверьте курс или оставьте нанесение без изменений: ' + previousDecoration
          : 'Измените нанесение: ' + previousDecoration))
        : (ready ? 'Расчет готов для: ' + pendingItem.title : 'Выберите услугу и выполните расчет нанесения')))
      : (editingPoly
        ? (ready ? 'Новая спецификация рассчитана. Сохраните изменения позиции' : 'Проверьте спецификацию позиции')
        : (ready ? 'Расчет готов к добавлению в КП' : 'Выполните расчет и проверьте его параметры'));
  }

  function plainText(value) {
    return String(value == null ? '' : value).replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').trim();
  }

  function addCell(row, value, className) {
    const cell = document.createElement('td');
    cell.textContent = value;
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
  }

  function addEditableCell(row, item, field, value, className) {
    const cell = addCell(row, value, className);
    cell.contentEditable = 'true';
    cell.classList.add('quote-editable');
    cell.dataset.editId = item.id;
    cell.dataset.editField = field;
    return cell;
  }

  function addDetailsCell(row, item) {
    const cell = document.createElement('td');
    cell.className = 'quote-description';
    const annotations = Array.isArray(item.annotations) ? item.annotations : [];
    let baseDetails = item.baseDetails !== undefined ? plainText(item.baseDetails) : plainText(item.details);
    if (item.baseDetails === undefined) {
      annotations.forEach(function (annotation) {
        const marker = plainText(annotation.annotationText || annotation.details);
        if (marker) baseDetails = baseDetails.split(marker).join('').replace(/\n\s*\n/g, '\n').trim();
      });
    }

    const editableDetails = document.createElement('span');
    editableDetails.className = 'quote-editable';
    editableDetails.contentEditable = 'true';
    editableDetails.dataset.editId = item.id;
    editableDetails.dataset.editField = 'details';
    editableDetails.textContent = baseDetails;
    cell.appendChild(editableDetails);

    annotations.forEach(function (annotation, annotationIndex) {
      const annotationLine = document.createElement('div');
      annotationLine.className = 'quote-annotation-line';
      const annotationText = document.createElement('span');
      annotationText.className = 'quote-annotation-text';
      const visibleAnnotationText = plainText(annotation.annotationText || annotation.details);
      annotationText.textContent = visibleAnnotationText;
      if (visibleAnnotationText) annotationLine.appendChild(annotationText);

      const editLabel = annotations.length > 1 ? 'Изменить нанесение ' + (annotationIndex + 1) : 'Изменить нанесение';
      const editButton = createQuoteActionButton(editLabel, '<path d="m16 4 4 4L8 20H4v-4L16 4z"/><path d="m14 6 4 4"/>');
      editButton.dataset.editDecorationId = item.id;
      editButton.dataset.annotationIndex = String(annotationIndex);
      editButton.title = visibleAnnotationText ? editLabel + ': ' + visibleAnnotationText : editLabel;
      editButton.setAttribute('aria-label', editButton.title);
      annotationLine.appendChild(editButton);

      const removeButton = createQuoteActionButton('Убрать нанесение ' + (annotationIndex + 1), '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 5v5m4-5v5"/>', 'remove-action');
      removeButton.dataset.removeAnnotationId = item.id;
      removeButton.dataset.annotationIndex = String(annotationIndex);
      annotationLine.appendChild(removeButton);
      cell.appendChild(annotationLine);
    });

    const directStockServices = !annotations.length && item.souvenirMode === 'sklad' && Array.isArray(item.services) ? item.services : [];
    if (directStockServices.length) {
      const annotationLine = document.createElement('div');
      annotationLine.className = 'quote-annotation-line';
      const editButton = createQuoteActionButton('Изменить нанесение', '<path d="m16 4 4 4L8 20H4v-4L16 4z"/><path d="m14 6 4 4"/>');
      editButton.dataset.editStockDecorationId = item.id;
      annotationLine.appendChild(editButton);
      const removeButton = createQuoteActionButton('Убрать нанесение', '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 5v5m4-5v5"/>', 'remove-action');
      removeButton.dataset.removeStockDecorationId = item.id;
      annotationLine.appendChild(removeButton);
      cell.appendChild(annotationLine);
    }

    row.appendChild(cell);
  }

  function addRunValues(row, runItems, field, getValue, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    runItems.forEach(function (item) {
      const value = document.createElement('div');
      value.className = 'quote-run-value quote-editable';
      value.contentEditable = 'true';
      value.dataset.editId = item.id;
      value.dataset.editField = field;
      value.textContent = getValue(item);
      cell.appendChild(value);
    });
    row.appendChild(cell);
    return cell;
  }

  function addQuantityCell(row, runItems, item) {
    const cell = document.createElement('td');
    cell.className = 'quote-quantity-cell';
    const addControls = createDuplicateRunControls(item);
    addControls.classList.add('quote-quantity-tools');
    cell.appendChild(addControls);
    runItems.forEach(function (run, runIndex) {
      const quantityRow = document.createElement('div');
      quantityRow.className = 'quote-quantity-run';
      const value = document.createElement('div');
      value.className = 'quote-run-value quote-editable';
      value.contentEditable = 'true';
      value.dataset.editId = run.id;
      value.dataset.editField = 'quantity';
      value.setAttribute('aria-label', 'Количество тиража ' + (runIndex + 1));
      value.textContent = String(run.quantity);
      quantityRow.appendChild(value);
      if (runIndex > 0) {
        const removeButton = createQuoteActionButton('Удалить тираж ' + (runIndex + 1), '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 5v5m4-5v5"/>', 'remove-action');
        removeButton.dataset.removeId = run.id;
        quantityRow.appendChild(removeButton);
      }
      cell.appendChild(quantityRow);
    });
    row.appendChild(cell);
    return cell;
  }

  function addTitleCell(row, item) {
    const cell = document.createElement('td');
    cell.className = 'quote-title';
    cell.tabIndex = 0;
    cell.setAttribute('aria-label', 'Название позиции и область вставки фото');
    const title = document.createElement('span');
    title.className = 'quote-title-text quote-editable';
    title.contentEditable = 'true';
    title.dataset.editId = item.id;
    title.dataset.editField = 'title';
    title.textContent = item.title;
    cell.addEventListener('click', function (event) {
      if (event.target === cell) title.focus();
    });
    cell.appendChild(title);
    const photos = Array.isArray(item.photos) ? item.photos : (item.photo ? [item.photo] : []);
    photos.forEach(function (photo, index) {
      if (typeof photo !== 'string' || !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(photo)) return;
      const image = document.createElement('img');
      image.className = 'quote-photo';
      image.src = photo;
      image.alt = 'Фото позиции';
      image.contentEditable = 'false';
      cell.appendChild(image);
      const removePhoto = document.createElement('button');
      removePhoto.type = 'button';
      removePhoto.className = 'remove-photo';
      removePhoto.dataset.removePhotoId = item.id;
      removePhoto.dataset.removePhotoIndex = String(index);
      removePhoto.textContent = 'Удалить фото';
      cell.appendChild(removePhoto);
    });
    row.appendChild(cell);
  }

  function createAddPositionButton() {
    const button = document.createElement('button');
    button.className = 'quote-add-position';
    button.type = 'button';
    button.dataset.addQuotePosition = 'true';
    button.textContent = '+';
    button.title = 'Добавить позицию';
    button.setAttribute('aria-label', 'Добавить позицию');
    return button;
  }

  function createQuoteActionButton(label, iconMarkup, className) {
    const button = document.createElement('button');
    button.className = 'quote-action-icon' + (className ? ' ' + className : '');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + iconMarkup + '</svg>';
    return button;
  }

  function createDuplicateRunControls(item) {
    const controls = document.createElement('div');
    controls.className = 'quote-inline-run-controls';
    const button = createQuoteActionButton('Добавить тираж', '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/><path d="M18 14v6M15 17h6"/>');
    button.dataset.openDuplicateFormId = item.id;
    controls.appendChild(button);

    const form = document.createElement('div');
    form.className = 'quote-run-form hidden';
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.step = '1';
    quantityInput.value = String(item.quantity || 1);
    quantityInput.setAttribute('aria-label', 'Количество нового тиража');
    const confirmButton = document.createElement('button');
    confirmButton.className = 'quote-action-icon';
    confirmButton.type = 'button';
    confirmButton.dataset.confirmDuplicateItemId = item.id;
    confirmButton.title = 'Создать тираж';
    confirmButton.setAttribute('aria-label', 'Создать тираж');
    confirmButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
    form.append(quantityInput, confirmButton);
    controls.appendChild(form);
    return controls;
  }

  function firstGlobalAdjustment(type) {
    return collectInternalAdjustments(type, '');
  }

  function updateGlobalAdjustmentButtons(items) {
    const globalOvertime = collectInternalAdjustments('overtime', '');
    const globalCashback = collectInternalAdjustments('cashback', '');
    const overtimeLines = items.filter(function (item) { return item.quoteAdjustmentType === 'overtime-line' && !item.quoteTargetGroupId; });
    const overtimeLine = overtimeLines[0];
    const overtimeButton = document.getElementById('btn-global-overtime');
    delete overtimeButton.dataset.addOvertimeTarget;
    delete overtimeButton.dataset.editInternalAdjustmentId;
    delete overtimeButton.dataset.editOvertimeLineId;
    if (globalOvertime.length) {
      overtimeButton.dataset.editInternalAdjustmentId = globalOvertime.map(function (entry) { return entry.id; }).join('|');
      overtimeButton.dataset.editInternalAdjustmentType = 'overtime';
      overtimeButton.title = 'Изменить сверхурочные по всему КП';
      overtimeButton.setAttribute('aria-label', overtimeButton.title);
    } else if (overtimeLine) {
      overtimeButton.dataset.editOvertimeLineId = overtimeLine.id;
      overtimeButton.title = 'Изменить сверхурочные по всему КП';
      overtimeButton.setAttribute('aria-label', overtimeButton.title);
    } else {
      overtimeButton.dataset.addOvertimeTarget = '';
      overtimeButton.title = 'Добавить сверхурочные ко всему КП';
      overtimeButton.setAttribute('aria-label', overtimeButton.title);
    }
    overtimeButton.disabled = !productItems().length;

    const cashbackButton = document.getElementById('btn-global-cashback');
    delete cashbackButton.dataset.editInternalAdjustmentId;
    delete cashbackButton.dataset.addCashbackTarget;
    if (globalCashback.length) {
      cashbackButton.dataset.editInternalAdjustmentId = globalCashback.map(function (entry) { return entry.id; }).join('|');
      cashbackButton.dataset.editInternalAdjustmentType = 'cashback';
      cashbackButton.title = 'Изменить кэшбек по всему КП';
      cashbackButton.setAttribute('aria-label', cashbackButton.title);
      cashbackButton.disabled = false;
    } else {
      cashbackButton.dataset.addCashbackTarget = '';
      cashbackButton.title = 'Добавить кэшбек ко всему КП';
      cashbackButton.setAttribute('aria-label', cashbackButton.title);
      cashbackButton.disabled = !productItems().length || hasActiveDiscount();
    }
  }

  function renderQuote(items) {
    const quoteSettings = getQuoteSettings();
    const displayItems = OrderFinance.itemsForVat(items, includeVat, quoteSettings);
    const runGroups = OrderFinance.groupRuns(displayItems);
    updateDiscountItemOptions(items, quoteSettings.discountItemId);
    kpBody.replaceChildren();
    runGroups.forEach(function (runItems, index) {
      const item = runItems[0];
      const row = document.createElement('tr');
      addCell(row, String(index + 1));
      if (item.quoteAdjustmentType === 'overtime-line') {
        row.classList.add('quote-adjustment-row');
        addCell(row, item.title);
        addCell(row, item.details);
        addCell(row, String(item.quantity || 1));
        addCell(row, OrderFinance.formatAmount(item.unitPrice));
        addCell(row, OrderFinance.formatAmount(item.total));
        addCell(row, item.delivery || '-');
        addCell(row, '');
        kpBody.appendChild(row);
        return;
      }
      addTitleCell(row, item);
      addDetailsCell(row, item);
      addQuantityCell(row, runItems, item);
      addRunValues(row, runItems, 'unitPrice', function (run) { return OrderFinance.formatAmount(run.unitPrice); });
      addRunValues(row, runItems, 'total', function (run) { return OrderFinance.formatAmount(run.total); });
      addRunValues(row, runItems, 'delivery', function (run) { return run.delivery || '-'; });
      const actionCell = document.createElement('td');
      const rowActions = document.createElement('div');
      rowActions.className = 'quote-row-actions';
      const actionToolbar = document.createElement('div');
      actionToolbar.className = 'quote-action-toolbar';
      const decorationButton = createQuoteActionButton('Добавить нанесение', '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="m19 14 1.2 3.2L23 18l-2.8.8L19 22l-1.2-3.2L15 18l2.8-.8L19 14z"/>', 'add-decoration');
      decorationButton.dataset.calcDecorationId = item.id;
      actionToolbar.appendChild(decorationButton);
      const groupId = OrderFinance.runGroupKey(item);
      const overtimeAdjustments = collectInternalAdjustments('overtime', groupId);
      const cashbackAdjustments = collectInternalAdjustments('cashback', groupId);
      const overtimeLine = items.find(function (entry) {
        return entry.quoteAdjustmentType === 'overtime-line' && entry.quoteTargetGroupId === groupId;
      });
      const overtimeButton = createQuoteActionButton('Сверхурочные для позиции', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
      if (overtimeLine) {
        overtimeButton.dataset.editOvertimeLineId = overtimeLine.id;
        overtimeButton.title = 'Изменить сверхурочные';
        overtimeButton.setAttribute('aria-label', overtimeButton.title);
      } else if (overtimeAdjustments.length) {
        overtimeButton.dataset.editInternalAdjustmentId = overtimeAdjustments.map(function (entry) { return entry.id; }).join('|');
        overtimeButton.dataset.editInternalAdjustmentType = 'overtime';
        overtimeButton.dataset.editInternalAdjustmentTarget = groupId;
        overtimeButton.title = 'Изменить сверхурочные';
        overtimeButton.setAttribute('aria-label', overtimeButton.title);
      } else {
        overtimeButton.dataset.addOvertimeTarget = groupId;
      }
      actionToolbar.appendChild(overtimeButton);
      const cashbackButton = createQuoteActionButton('Кэшбек для позиции', '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>');
      if (cashbackAdjustments.length) {
        cashbackButton.dataset.editInternalAdjustmentId = cashbackAdjustments.map(function (entry) { return entry.id; }).join('|');
        cashbackButton.dataset.editInternalAdjustmentType = 'cashback';
        cashbackButton.dataset.editInternalAdjustmentTarget = groupId;
        cashbackButton.title = 'Изменить кэшбек';
        cashbackButton.setAttribute('aria-label', cashbackButton.title);
      } else {
        cashbackButton.dataset.addCashbackTarget = groupId;
        cashbackButton.disabled = hasActiveDiscount();
      }
      actionToolbar.appendChild(cashbackButton);
      if (item.category === 'poly') {
        const editButton = createQuoteActionButton('Изменить полиграфическую спецификацию', '<path d="m16 3 5 5-12 12H4v-5L16 3z"/><path d="m14 5 5 5"/>');
        editButton.dataset.editItemId = item.id;
        actionToolbar.appendChild(editButton);
      }
      const removePositionButton = createQuoteActionButton('Удалить позицию', '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 5v5m4-5v5"/>', 'remove-action');
      removePositionButton.dataset.removePositionId = item.id;
      actionToolbar.appendChild(removePositionButton);
      rowActions.appendChild(actionToolbar);
      actionCell.appendChild(rowActions);
      row.appendChild(actionCell);
      kpBody.appendChild(row);
    });
    if (items.length === 0) {
      const row = document.createElement('tr');
      const addCell = document.createElement('td');
      addCell.appendChild(createAddPositionButton());
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 7;
      emptyCell.className = 'empty-row';
      emptyCell.textContent = 'Таблица КП пока пуста';
      row.append(addCell, emptyCell);
      kpBody.appendChild(row);
    } else {
      const row = document.createElement('tr');
      row.className = 'quote-add-row';
      const addCell = document.createElement('td');
      addCell.appendChild(createAddPositionButton());
      const spacer = document.createElement('td');
      spacer.colSpan = 7;
      row.append(addCell, spacer);
      kpBody.appendChild(row);
    }
    const totals = OrderFinance.calculate(items, includeVat, quoteSettings);
    updateGlobalAdjustmentButtons(items);
    const cashbackApplied = hasCashback(items);
    discountValueInput.disabled = cashbackApplied;
    discountTypeSelect.disabled = cashbackApplied;
    discountScopeSelect.disabled = cashbackApplied;
    if (cashbackApplied) discountItemSelect.disabled = true;
    document.getElementById('btn-global-overtime').disabled = productItems().length === 0;
    document.getElementById('btn-global-cashback').disabled = productItems().length === 0 || hasActiveDiscount();
    const total = totals.total;
    document.getElementById('kp-total').textContent = totals.hideTotal ? '—' : OrderFinance.formatAmount(total) + ' теңге';
    document.getElementById('kp-total-label').textContent = totals.hideTotal
      ? 'Итог скрыт'
      : (totals.manualTotal !== null ? 'Итого по КП (ручной):' : (includeVat ? 'Итого по КП (с НДС 16%):' : 'Итого по КП (без НДС):'));
    const discountSummary = document.getElementById('discount-summary');
    if (totals.discountAmount > 0) {
      const selectedDiscountItem = items.find(function (item) {
        return OrderFinance.runGroupKey(item) === quoteSettings.discountItemId;
      });
      const scopeText = quoteSettings.discountScope === 'position'
        ? 'на позицию «' + (selectedDiscountItem ? selectedDiscountItem.title : 'выбрана') + '»'
        : 'на всё КП';
      const totalText = totals.hideTotal
        ? 'Итог скрыт'
        : (totals.manualTotal !== null ? 'ручной итог: ' + OrderFinance.formatKzt(totals.total) : 'итог КП: ' + OrderFinance.formatKzt(totals.total));
      discountSummary.textContent = 'Скидка ' + scopeText + ': ' + OrderFinance.formatKzt(totals.discountAmount) + ' · ' + totalText;
    } else if (quoteSettings.discountEnabled && quoteSettings.discountScope === 'position' && !quoteSettings.discountItemId) {
      discountSummary.textContent = 'Выберите позицию, к которой применить скидку';
    } else if (cashbackApplied && (Number(readQuoteSettings().discountValue) || 0) > 0) {
      discountSummary.textContent = 'Сначала уберите кэшбек, чтобы применить скидку';
    } else {
      discountSummary.textContent = 'Скидка не применяется';
    }
    const company = companyInput.value.trim().toUpperCase() || 'БЕЗ НАЗВАНИЯ';
    const date = new Intl.DateTimeFormat('ru-RU').format(new Date());
    document.getElementById('kp-document-heading').textContent = 'КП ' + date + ' ' + company;
    document.getElementById('cost-poly').textContent = OrderFinance.formatAmount(totals.expenses.poly).replace(/\s/g, '') + ' теңге';
    document.getElementById('cost-souvenir').textContent = OrderFinance.formatAmount(totals.expenses.souvenir).replace(/\s/g, '') + ' теңге';
    document.getElementById('cost-other').textContent = OrderFinance.formatAmount(totals.expenses.other).replace(/\s/g, '') + ' теңге';
    document.getElementById('cost-overtime').textContent = OrderFinance.formatAmount(totals.expenses.overtime).replace(/\s/g, '') + ' теңге';
    document.getElementById('cost-cashback').textContent = OrderFinance.formatAmount(totals.expenses.cashback).replace(/\s/g, '') + ' теңге';
    document.getElementById('cost-total').textContent = OrderFinance.formatAmount(totals.productionCost).replace(/\s/g, '') + ' теңге';
    document.getElementById('quote-count').textContent = String(runGroups.length);
    document.getElementById('btn-save-history').disabled = items.length === 0;
    document.getElementById('btn-copy-word').disabled = items.length === 0;
    document.getElementById('btn-download-pdf').disabled = items.length === 0;
    document.getElementById('btn-clear-kp').disabled = items.length === 0;
  }

  function syncManagerHistory() {
    const managerId = LegacyBridge.getPolyManagerId();
    const syncButton = document.getElementById('btn-sync-history');
    syncButton.disabled = !managerId;
    if (managerId) {
      localStorage.setItem(currentHistoryManagerStorageKey, String(managerId));
      OrderHistory.replaceManager(managerId, LegacyBridge.getPolyHistory());
    }
  }

  function renderManagerAuthStatus() {
    const status = document.getElementById('manager-auth-status');
    const loginButton = document.getElementById('btn-manager-login');
    const manager = LegacyBridge.isPolyAuthenticated()
      ? LegacyBridge.getPolyPdfDependencies().manager
      : null;
    if (manager) {
      status.textContent = 'Менеджер: ' + (manager.name || manager.id);
      loginButton.textContent = 'Сменить пользователя';
      loginButton.setAttribute('aria-label', 'Сменить пользователя или выйти');
    } else {
      status.textContent = 'Вход не выполнен';
      loginButton.textContent = 'Войти';
      loginButton.setAttribute('aria-label', 'Войти в полиграфический калькулятор');
    }
  }

  function openManagerLoginDialog() {
    LegacyBridge.load('poly').then(function () {
      const select = document.getElementById('manager-login-select');
      const pin = document.getElementById('manager-login-pin');
      const error = document.getElementById('manager-login-error');
      const logoutButton = document.getElementById('btn-manager-logout');
      const authenticated = LegacyBridge.isPolyAuthenticated();
      const managers = LegacyBridge.getPolyManagers();
      select.replaceChildren();
      managers.forEach(function (manager) {
        const option = document.createElement('option');
        option.value = manager.id;
        option.textContent = manager.name;
        select.appendChild(option);
      });
      const selectedManagerId = LegacyBridge.getPolyManagerId() || LegacyBridge.getPolySelectedManagerId();
      if (selectedManagerId) select.value = selectedManagerId;
      document.getElementById('manager-login-title').textContent = authenticated ? 'Смена пользователя' : 'Вход менеджера';
      document.getElementById('manager-login-remember').checked = false;
      document.getElementById('btn-submit-manager-login').textContent = authenticated ? 'Войти под другим пользователем' : 'Войти';
      logoutButton.classList.toggle('hidden', !authenticated);
      pin.value = '';
      error.textContent = '';
      const dialog = document.getElementById('manager-login-dialog');
      if (!dialog.open) dialog.showModal();
      pin.focus();
    }).catch(function () {
      document.getElementById('manager-login-error').textContent = 'Не удалось загрузить форму входа';
    });
  }

  function renderHistory() {
    syncManagerHistory();
    renderManagerAuthStatus();
    const list = document.getElementById('history-list');
    const query = document.getElementById('history-search').value.trim().toLowerCase();
    list.replaceChildren();
    const managerId = LegacyBridge.getPolyManagerId() || localStorage.getItem(currentHistoryManagerStorageKey);
    const allRecords = OrderHistory.getRecords().filter(function (record) {
      return managerId ? (!record.managerId || String(record.managerId) === String(managerId)) : true;
    });
    const records = allRecords.filter(function (record) {
      const searchable = [record.company, record.createdAt, record.summary].join(' ').toLowerCase();
      return !query || searchable.includes(query);
    });
    if (records.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'calc-status';
      empty.textContent = query ? 'Ничего не найдено' : 'Сохраненных КП пока нет';
      list.appendChild(empty);
      return;
    }
    records.forEach(function (record) {
      const entry = document.createElement('article');
      entry.className = 'history-entry';
      const meta = document.createElement('div');
      meta.className = 'history-meta';
      const title = document.createElement('strong');
      title.textContent = record.company || 'Без названия компании';
      const date = document.createElement('small');
      date.textContent = new Intl.DateTimeFormat('ru-RU').format(new Date(record.createdAt));
      const summary = document.createElement('small');
      summary.textContent = (record.items || []).length + ' позиций · ' + OrderFinance.formatKzt(record.total || 0);
      meta.append(title, date, summary);
      const actions = document.createElement('div');
      actions.className = 'history-actions';
      const loadButton = document.createElement('button');
      loadButton.className = 'secondary-btn';
      loadButton.type = 'button';
      loadButton.dataset.loadHistoryId = record.id;
      loadButton.textContent = 'Загрузить';
      const deleteButton = document.createElement('button');
      deleteButton.className = 'danger-btn';
      deleteButton.type = 'button';
      deleteButton.dataset.deleteHistoryId = record.id;
      deleteButton.textContent = 'Удалить';
      actions.append(loadButton, deleteButton);
      entry.append(meta, actions);
      list.appendChild(entry);
    });
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function numberFromText(value) {
    const number = Number(String(value).replace(/[^0-9,.-]/g, '').replace(',', '.'));
    return Number.isFinite(number) ? number : 0;
  }

  function saveCurrentHistory() {
    const items = OrderState.getItems();
    if (!items.length) return null;
    const company = companyInput.value.trim();
    const summary = items.map(function (item) { return item.title + ' (' + item.quantity + ')'; }).join(', ');
    const quoteSettings = getQuoteSettings();
    const managerId = LegacyBridge.getPolyManagerId();
    const total = OrderFinance.calculate(items, includeVat, quoteSettings).total;
    if (currentHistoryId && managerId && currentHistoryManagerId && String(currentHistoryManagerId) !== String(managerId)) {
      currentHistoryId = null;
      currentHistoryManagerId = null;
      persistCurrentHistoryId();
    }
    if (currentHistoryId === null) {
      currentHistoryId = Date.now();
      currentHistoryManagerId = managerId || null;
    }
    persistCurrentHistoryId();
    const existingRecord = OrderHistory.getRecords().find(function (record) {
      return currentHistoryId && String(record.id) === String(currentHistoryId);
    });
    const legacyRecord = LegacyBridge.savePolyHistory(items, company, currentHistoryId, includeVat, currentHistoryManagerId, total);
    const historyRecord = legacyRecord
      ? Object.assign({}, legacyRecord, {
        id: currentHistoryId,
        managerId: legacyRecord.managerId || managerId || undefined,
        quoteSettings: quoteSettings
      })
      : Object.assign({}, existingRecord || {}, {
        id: currentHistoryId,
        managerId: managerId || currentHistoryManagerId || undefined,
        company: company,
        items: items,
        total: total,
        includeVat: includeVat,
        quoteSettings: quoteSettings,
        summary: summary
      });
    const saved = OrderHistory.upsert(historyRecord);
    currentHistoryId = saved.id;
    currentHistoryManagerId = saved.managerId || managerId || null;
    persistCurrentHistoryId();
    renderHistory();
    return saved;
  }

  function restoreCurrentHistory() {
    if (!currentHistoryId) return;
    const record = OrderHistory.getRecords().find(function (item) {
      return String(item.id) === String(currentHistoryId);
    });
    if (!record) {
      if (!OrderState.getItems().length) {
        currentHistoryId = null;
        currentHistoryManagerId = null;
        persistCurrentHistoryId();
      } else companyInput.value = localStorage.getItem(currentHistoryCompanyStorageKey) || '';
      return;
    }
    currentHistoryId = normalizeHistoryId(record.id);
    currentHistoryManagerId = record.managerId || null;
    if (OrderState.getItems().length) companyInput.value = record.company || '';
    persistCurrentHistoryId();
  }

  function syncPendingHistoryAfterLogin() {
    if (!LegacyBridge.isPolyAuthenticated() || !currentHistoryId || currentHistoryManagerId || !OrderState.getItems().length) return;
    saveCurrentHistory();
  }

  function startNewQuote(saveCurrent) {
    const saved = saveCurrent ? saveCurrentHistory() : null;
    currentHistoryId = null;
    currentHistoryManagerId = null;
    persistCurrentHistoryId();
    OrderState.clear();
    companyInput.value = '';
    const defaultSettings = {
      discountType: 'percent',
      discountValue: 0,
      discountScope: 'order',
      discountItemId: '',
      manualTotal: null,
      hideTotal: false
    };
    persistQuoteSettings(defaultSettings);
    applyQuoteSettingsToControls(defaultSettings);
    renderQuote(OrderState.getItems());
    newQuoteDialog.close();
    document.getElementById('quote-export-status').textContent = saved
      ? 'Текущее КП сохранено в истории. Создано новое КП.'
      : 'Создано новое КП без сохранения предыдущего.';
  }

  function editQuoteCell(cell) {
    const id = cell.dataset.editId;
    const field = cell.dataset.editField;
    const value = cell.innerText.trim();
    const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(id); });
    if (!item) return;
    if (field === 'title' || field === 'details' || field === 'delivery') {
      const nextValue = value === '-' && field === 'delivery' ? '' : value;
      if (field === 'title' || field === 'details') {
        const groupId = OrderFinance.runGroupKey(item);
        OrderState.getItems().filter(function (run) {
          return OrderFinance.runGroupKey(run) === groupId;
        }).forEach(function (run) { OrderState.update(run.id, { [field]: nextValue }); });
      } else {
        OrderState.update(id, { [field]: nextValue });
      }
      return;
    }
    const numericValue = OrderFinance.amountToInclusive(numberFromText(value), includeVat);
    if (field === 'quantity') {
      const quantity = numberFromText(value);
      OrderState.update(id, { quantity: quantity, total: Math.round(quantity * item.unitPrice) });
    } else if (field === 'unitPrice') {
      OrderState.update(id, { unitPrice: numericValue, total: Math.round(item.quantity * numericValue) });
    } else if (field === 'total') {
      const unitPrice = item.quantity ? Math.round(numericValue / item.quantity) : 0;
      OrderState.update(id, { total: numericValue, unitPrice: unitPrice });
    }
  }

  function addPhotos(itemId, files) {
    const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(itemId); });
    if (!item) return;
    const acceptedFiles = Array.from(files).filter(function (file) { return file && file.type.startsWith('image/'); });
    Promise.all(acceptedFiles.map(function (file) {
      return new Promise(function (resolve) {
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { resolve(null); };
        reader.readAsDataURL(file);
      });
    })).then(function (loadedPhotos) {
      const existingPhotos = Array.isArray(item.photos) ? item.photos : (item.photo ? [item.photo] : []);
      const photos = existingPhotos.concat(loadedPhotos.filter(Boolean));
      if (photos.length > existingPhotos.length) OrderState.update(itemId, { photos: photos });
    });
  }

  function addPhotoDataUrls(itemId, dataUrls) {
    const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(itemId); });
    if (!item) return;
    const photos = (item.photos || (item.photo ? [item.photo] : [])).concat(dataUrls);
    OrderState.update(itemId, { photos: photos });
  }

  function flushFocusedQuoteCell() {
    const active = document.activeElement;
    const cell = active && active.closest ? active.closest('[data-edit-field]') : null;
    if (cell && kpBody.contains(cell)) editQuoteCell(cell);
  }

  function handleQuoteAction(button) {
    if (!button || button.dataset.actionHandled === 'true') return;
    button.dataset.actionHandled = 'true';
    flushFocusedQuoteCell();
    if (button.dataset.editInternalAdjustmentId) {
      const adjustmentId = button.dataset.editInternalAdjustmentId;
      const targetGroupId = button.dataset.editInternalAdjustmentTarget || '';
      if (button.dataset.editInternalAdjustmentType === 'cashback') openCashbackDialog(targetGroupId, adjustmentId);
      else openOvertimeDialog(targetGroupId, adjustmentId);
    } else if (button.dataset.editOvertimeLineId) {
      openOvertimeLineDialog(button.dataset.editOvertimeLineId);
    } else if (button.dataset.addOvertimeTarget !== undefined) {
      openOvertimeDialog(button.dataset.addOvertimeTarget);
    } else if (button.dataset.addCashbackTarget !== undefined) {
      openCashbackDialog(button.dataset.addCashbackTarget);
    } else if (button.dataset.removeInternalAdjustmentId) {
      if (window.confirm('Убрать внутреннюю доплату из расчёта?')) removeInternalAdjustment(button.dataset.removeInternalAdjustmentId);
    } else if (button.dataset.editDecorationId) {
      startDecoration(button.dataset.editDecorationId, Number(button.dataset.annotationIndex));
    } else if (button.dataset.editStockDecorationId) {
      startStockDecorationEdit(button.dataset.editStockDecorationId);
    } else if (button.dataset.calcDecorationId) {
      startDecoration(button.dataset.calcDecorationId);
    } else if (button.dataset.removePhotoId) {
      const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(button.dataset.removePhotoId); });
      if (!item) return;
      const photos = (item.photos || (item.photo ? [item.photo] : [])).slice();
      photos.splice(Number(button.dataset.removePhotoIndex), 1);
      OrderState.update(button.dataset.removePhotoId, { photos: photos });
    } else if (button.dataset.removeAnnotationId) {
      const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(button.dataset.removeAnnotationId); });
      const annotationIndex = Number(button.dataset.annotationIndex);
      const annotation = item && item.annotations && item.annotations[annotationIndex];
      if (!item || !annotation) return;
      const annotationName = (annotation.services || []).join(' + ') || plainText(annotation.details || annotation.annotationText);
      if (!window.confirm('Убрать нанесение' + (annotationName ? ' «' + annotationName + '»' : '') + '?')) return;
      const groupKey = OrderFinance.runGroupKey(item);
      OrderState.getItems().filter(function (run) {
        return OrderFinance.runGroupKey(run) === groupKey && run.annotations && run.annotations[annotationIndex];
      }).forEach(function (run) { OrderState.removeDecoration(run.id, annotationIndex); });
    } else if (button.dataset.removeStockDecorationId) {
      removeStockDecoration(button.dataset.removeStockDecorationId);
    } else if (button.dataset.removeQuoteAdjustmentId) {
      const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(button.dataset.removeQuoteAdjustmentId); });
      if (item && window.confirm('Удалить доплату «' + item.title + '»?')) OrderState.remove(item.id);
    } else if (button.dataset.removePositionId) {
      const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(button.dataset.removePositionId); });
      if (!item) return;
      const groupKey = OrderFinance.runGroupKey(item);
      const runs = OrderState.getItems().filter(function (entry) { return OrderFinance.runGroupKey(entry) === groupKey; });
      const linkedAdjustments = OrderState.getItems().filter(function (entry) {
        return entry.quoteAdjustmentType === 'overtime-line' && entry.quoteTargetGroupId === groupKey;
      });
      if (!window.confirm('Удалить позицию «' + item.title + '» со всеми тиражами (' + runs.length + ')?')) return;
      runs.forEach(function (run) { OrderState.remove(run.id); });
      linkedAdjustments.forEach(function (adjustment) { OrderState.remove(adjustment.id); });
    } else if (button.dataset.removeDecorationGroupId) {
      const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(button.dataset.removeDecorationGroupId); });
      if (!item) return;
      const groupId = OrderFinance.runGroupKey(item);
      const runs = OrderState.getItems().filter(function (entry) { return OrderFinance.runGroupKey(entry) === groupId; });
      if (!runs.some(function (run) { return Array.isArray(run.annotations) && run.annotations.length; })) return;
      if (window.confirm('Убрать нанесение из этой позиции?')) {
        runs.forEach(function (run) {
          if (Array.isArray(run.annotations) && run.annotations.length) OrderState.removeDecoration(run.id);
        });
      }
    } else if (button.dataset.openDuplicateFormId) {
      const currentButton = Array.from(kpBody.querySelectorAll('[data-open-duplicate-form-id]')).find(function (entry) {
        return entry.dataset.openDuplicateFormId === button.dataset.openDuplicateFormId;
      });
      const row = currentButton && currentButton.closest('tr');
      const form = row && row.querySelector('.quote-run-form');
      if (!form) return;
      form.classList.remove('hidden');
      form.querySelector('input').focus();
      form.querySelector('input').select();
    } else if (button.dataset.confirmDuplicateItemId) {
      const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(button.dataset.confirmDuplicateItemId); });
      if (!item) return;
      const input = button.parentElement.querySelector('input');
      const nextQuantity = Number(input && input.value);
      if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) return;
      const runCalculation = item.category !== 'poly' || (Array.isArray(item.annotations) && item.annotations.length)
        ? null
        : LegacyBridge.calculatePolyRun(item, nextQuantity, includeVat);
      OrderState.duplicateItem(item.id, Object.assign({ quantity: nextQuantity }, runCalculation || {}));
    } else if (button.dataset.editItemId) {
      const itemId = button.dataset.editItemId;
      const items = OrderState.getItems();
      const itemIndex = items.findIndex(function (entry) { return String(entry.id) === String(itemId); });
      if (itemIndex < 0) return;
      openProductCalculator('poly').then(function () {
        const currentItems = OrderState.getItems();
        const currentIndex = currentItems.findIndex(function (entry) { return String(entry.id) === String(itemId); });
        if (currentIndex >= 0) LegacyBridge.editPolyItem(currentIndex, currentItems, companyInput.value.trim(), includeVat);
      });
    } else if (button.dataset.removeId) {
      OrderState.remove(button.dataset.removeId);
    }
  }

  function startDecoration(itemId, annotationIndex) {
    const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(itemId); });
    if (!item) return;
    if (item.souvenirMode === 'sklad' && (!Array.isArray(item.annotations) || item.annotations.length === 0)) {
      startStockDecorationEdit(item.id);
      return;
    }
    pendingDecorationItemId = item.id;
    pendingDecorationEditIndex = Number.isInteger(annotationIndex) ? annotationIndex : null;
    pendingStockDecorationEdit = false;
    pendingDecorationRestoreUnavailable = false;
    openDecorationDialog(item.category === 'souvenir');
    setActiveModule('souvenir').then(function () {
      if (pendingDecorationEditIndex === null) return;
      const currentItem = OrderState.getItems().find(function (entry) { return String(entry.id) === String(pendingDecorationItemId); });
      const annotation = currentItem && currentItem.annotations && currentItem.annotations[pendingDecorationEditIndex];
      if (!annotation) return;
      const services = Array.isArray(annotation.services) ? annotation.services : [];
      const servicesRestored = services.length > 0 && LegacyBridge.setSouvenirServices(services);
      if (!services.length) LegacyBridge.setSouvenirServices([]);
      const calculationRestored = LegacyBridge.setSouvenirCalculation(annotation, currentItem);
      pendingDecorationRestoreUnavailable = !servicesRestored && !calculationRestored;
      updateCalculationStatus();
      if (!calculationRestored) {
        const requestedEditIndex = pendingDecorationEditIndex;
        let attemptsRemaining = 15;
        const retryCalculationRestore = function () {
          if (String(pendingDecorationItemId) !== String(currentItem.id) || pendingDecorationEditIndex !== requestedEditIndex) return;
          const retryRestored = LegacyBridge.setSouvenirCalculation(annotation, currentItem);
          pendingDecorationRestoreUnavailable = !servicesRestored && !retryRestored;
          updateCalculationStatus();
          attemptsRemaining -= 1;
          if (!retryRestored && attemptsRemaining > 0) window.setTimeout(retryCalculationRestore, 100);
        };
        window.setTimeout(retryCalculationRestore, 100);
      }
    });
  }

  function updateStockServiceItem(item, calculation) {
    const photos = Array.isArray(item.photos) ? item.photos : (item.photo ? [item.photo] : []);
    OrderState.update(item.id, Object.assign({}, calculation, {
      id: item.id,
      category: 'souvenir',
      title: calculation.title || item.title,
      details: calculation.details || calculation.title || item.title,
      photos: photos,
      photo: photos[0] || null,
      sourceUrl: item.sourceUrl,
      delivery: item.delivery || calculation.delivery,
      productionCostByCategory: { souvenir: Number(calculation.productionCost) || 0 },
      annotations: undefined,
      baseDetails: undefined,
      baseTotal: undefined,
      baseUnitPrice: undefined,
      baseProductionCost: undefined
    }));
  }

  function startStockDecorationEdit(itemId) {
    const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(itemId); });
    if (!item) return;
    pendingDecorationItemId = item.id;
    pendingDecorationEditIndex = null;
    pendingStockDecorationEdit = true;
    pendingDecorationRestoreUnavailable = true;
    openDecorationDialog(true);
    setActiveModule('souvenir').then(function () {
      const currentItem = OrderState.getItems().find(function (entry) { return String(entry.id) === String(pendingDecorationItemId); });
      if (!currentItem) return;
      return restoreStockCalculation(currentItem, 15).then(function (calculationRestored) {
        const servicesRestored = calculationRestored && LegacyBridge.setSouvenirServices(currentItem.services || []);
        pendingDecorationRestoreUnavailable = !calculationRestored || !servicesRestored;
        updateCalculationStatus();
      });
    }).catch(function (error) {
      console.error('Ошибка восстановления складского нанесения:', error);
      pendingDecorationRestoreUnavailable = true;
      updateCalculationStatus();
    });
  }

  function restoreStockCalculation(item, attemptsRemaining) {
    return new Promise(function (resolve) {
      function attempt(remaining) {
        if (LegacyBridge.setSouvenirCalculation(item, item)) {
          resolve(true);
        } else if (remaining > 0) {
          window.setTimeout(function () { attempt(remaining - 1); }, 100);
        } else {
          resolve(false);
        }
      }
      attempt(attemptsRemaining);
    });
  }

  function removeStockDecoration(itemId) {
    const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(itemId); });
    if (!item) return;
    const serviceNames = Array.isArray(item.services) ? item.services.join(' + ') : '';
    if (!window.confirm('Убрать нанесение' + (serviceNames ? ' «' + serviceNames + '»' : '') + ' с позиции «' + item.title + '»?')) return;
    openDecorationDialog(true);
    setActiveModule('souvenir').then(function () {
      return restoreStockCalculation(item, 15);
    }).then(function (restored) {
      if (!restored) throw new Error('Не удалось восстановить складскую позицию');
      if (!LegacyBridge.setSouvenirServices([])) throw new Error('Не удалось сбросить нанесение');
      const calculation = LegacyBridge.add('souvenir');
      if (!calculation) throw new Error('Не удалось пересчитать товар без нанесения');
      updateStockServiceItem(item, calculation);
      document.getElementById('quote-export-status').textContent = 'Нанесение убрано. Товар сохранен в КП.';
      closeDecorationDialog();
    }).catch(function (error) {
      console.error('Ошибка удаления нанесения складской позиции:', error);
      document.getElementById('quote-export-status').textContent = 'Не удалось убрать нанесение. Проверьте складской расчет.';
      closeDecorationDialog();
    });
  }

  function addDecorationToItem(decoration) {
    const editIndex = pendingDecorationEditIndex;
    const target = OrderState.getItems().find(function (item) { return String(item.id) === String(pendingDecorationItemId); });
    if (!target) {
      closeDecorationDialog();
      return false;
    }

    const groupId = OrderFinance.runGroupKey(target);
    const groupItems = OrderState.getItems().filter(function (item) {
      return OrderFinance.runGroupKey(item) === groupId;
    });
    groupItems.forEach(function (run) {
      let runDecoration = decoration;
      if (String(run.id) !== String(target.id)) {
        LegacyBridge.setSouvenirQuantity(run.quantity);
        runDecoration = LegacyBridge.add('souvenir');
      }
      if (runDecoration) applyDecorationToRun(run, runDecoration, editIndex);
    });
    closeDecorationDialog();
    return true;
  }

  function applyDecorationToRun(target, decoration, editIndex) {
    const existingAnnotations = Array.isArray(target.annotations) ? target.annotations : [];
    const replacesAnnotation = Number.isInteger(editIndex) && editIndex >= 0 && editIndex < existingAnnotations.length;
    const serviceDetails = plainText(decoration.details);
    const line = plainText(decoration.annotationText);
    const annotation = {
      title: decoration.title,
      details: serviceDetails,
      annotationText: line,
      services: Array.isArray(decoration.services) ? decoration.services.slice() : [],
      souvenirMode: decoration.souvenirMode,
      stockProductValue: decoration.stockProductValue,
      quantity: decoration.quantity,
      unitPrice: decoration.unitPrice,
      total: decoration.total,
      sourceUnitPrice: decoration.sourceUnitPrice,
      exchangeRate: decoration.exchangeRate,
      currencyOrigin: decoration.currencyOrigin,
      productionCost: decoration.productionCost
    };
    const annotations = existingAnnotations.slice();
    if (replacesAnnotation) annotations[editIndex] = annotation;
    else annotations.push(annotation);
    const previousDecorationTotal = existingAnnotations.reduce(function (sum, entry) { return sum + (Number(entry.total) || 0); }, 0);
    const previousDecorationUnitPrice = existingAnnotations.reduce(function (sum, entry) { return sum + (Number(entry.unitPrice) || 0); }, 0);
    const previousDecorationCost = existingAnnotations.reduce(function (sum, entry) { return sum + (Number(entry.productionCost) || 0); }, 0);
    const quantity = Number(decoration.quantity) > 0 ? Number(decoration.quantity) : (Number(target.quantity) || 1);
    const baseUnitPrice = target.baseUnitPrice !== undefined ? Number(target.baseUnitPrice) : Math.max(0, (Number(target.unitPrice) || 0) - previousDecorationUnitPrice);
    const baseTotal = target.baseTotal !== undefined ? Number(target.baseTotal) : Math.max(0, (Number(target.total) || 0) - previousDecorationTotal);
    const baseProductionCost = target.baseProductionCost !== undefined ? Number(target.baseProductionCost) : Math.max(0, (Number(target.productionCost) || 0) - previousDecorationCost);
    const baseDetails = target.baseDetails !== undefined ? target.baseDetails : (target.details || '');
    const details = [baseDetails].concat(annotations.map(function (entry) {
      return plainText(entry.annotationText || entry.details);
    })).filter(Boolean).join('\n');
    const expenseByCategory = Object.assign({}, target.productionCostByCategory || {});
    if (target.productionCostByCategory) {
      const baseSouvenirCost = Math.max(0, (Number(expenseByCategory.souvenir) || 0) - previousDecorationCost);
      if (baseSouvenirCost) expenseByCategory.souvenir = baseSouvenirCost;
      else delete expenseByCategory.souvenir;
    } else {
      const originalCategory = ['poly', 'souvenir', 'other'].includes(target.category) ? target.category : 'other';
      expenseByCategory[originalCategory] = baseProductionCost;
    }
    const annotationCost = annotations.reduce(function (sum, entry) { return sum + (Number(entry.productionCost) || 0); }, 0);
    if (annotationCost) expenseByCategory.souvenir = (Number(expenseByCategory.souvenir) || 0) + annotationCost;
    const productionCost = Object.keys(expenseByCategory).reduce(function (sum, key) {
      return sum + (Number(expenseByCategory[key]) || 0);
    }, 0);
    const annotationTotal = annotations.reduce(function (sum, entry) { return sum + (Number(entry.total) || 0); }, 0);
    const annotationUnitPrice = annotations.reduce(function (sum, entry) { return sum + (Number(entry.unitPrice) || 0); }, 0);

    OrderState.update(target.id, {
      details: details,
      baseDetails: baseDetails,
      baseTotal: baseTotal,
      baseUnitPrice: baseUnitPrice,
      baseProductionCost: baseProductionCost,
      annotations: annotations,
      quantity: quantity,
      unitPrice: baseUnitPrice + annotationUnitPrice,
      total: baseTotal + annotationTotal,
      productionCostByCategory: expenseByCategory,
      productionCost: productionCost,
      delivery: target.delivery || decoration.delivery || ''
    });
    return true;
  }

  function importLocalHistory(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const imported = JSON.parse(reader.result);
        const records = Array.isArray(imported) ? imported : imported.data;
        if (!Array.isArray(records)) throw new Error('Invalid history file');
        records.forEach(function (record) { OrderHistory.upsert(record); });
        renderHistory();
      } catch (error) {
        window.alert('Не удалось импортировать историю КП: проверьте JSON-файл.');
      }
    };
    reader.readAsText(file);
  }

  addToKpButton.addEventListener('click', function () {
    if (pendingDecorationItemId) {
      if (activeModule !== 'souvenir') {
        setActiveModule('souvenir');
        return;
      }
      if (pendingDecorationEditIndex !== null && pendingDecorationRestoreUnavailable && !LegacyBridge.canAdd('souvenir')) {
        closeDecorationDialog();
        return;
      }
      const decoration = LegacyBridge.add('souvenir');
      if (decoration && pendingStockDecorationEdit) {
        const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(pendingDecorationItemId); });
        if (!item) return;
        updateStockServiceItem(item, decoration);
        document.getElementById('quote-export-status').textContent = 'Нанесение обновлено.';
        closeDecorationDialog();
      } else if (decoration) addDecorationToItem(decoration);
      else updateCalculationStatus();
      return;
    }
    if (activeModule === 'poly' && LegacyBridge.isPolyEditing()) {
      const updates = LegacyBridge.updatePolyItem(OrderState.getItems());
      if (updates) {
        updates.forEach(function (item) { OrderState.update(item.id, item); });
        closeProductCalculatorDialog();
      }
      updateCalculationStatus();
      return;
    }
    const item = LegacyBridge.add(activeModule);
    if (item) {
      OrderState.add(item);
      closeProductCalculatorDialog();
    }
    updateCalculationStatus();
  });
  kpBody.addEventListener('pointerdown', function (event) {
    const button = event.target.closest('[data-remove-position-id], [data-remove-quote-adjustment-id], [data-remove-internal-adjustment-id], [data-edit-internal-adjustment-id], [data-edit-overtime-line-id], [data-add-overtime-target], [data-add-cashback-target], [data-edit-decoration-id], [data-edit-stock-decoration-id], [data-remove-stock-decoration-id], [data-calc-decoration-id], [data-remove-annotation-id], [data-remove-photo-id], [data-remove-decoration-group-id], [data-open-duplicate-form-id], [data-confirm-duplicate-item-id], [data-edit-item-id], [data-remove-id]');
    if (!button) return;
    event.preventDefault();
    handleQuoteAction(button);
  });
  kpBody.addEventListener('click', function (event) {
    const button = event.target.closest('[data-remove-position-id], [data-remove-quote-adjustment-id], [data-remove-internal-adjustment-id], [data-edit-internal-adjustment-id], [data-edit-overtime-line-id], [data-add-overtime-target], [data-add-cashback-target], [data-edit-decoration-id], [data-edit-stock-decoration-id], [data-remove-stock-decoration-id], [data-calc-decoration-id], [data-remove-annotation-id], [data-remove-photo-id], [data-remove-decoration-group-id], [data-open-duplicate-form-id], [data-confirm-duplicate-item-id], [data-edit-item-id], [data-remove-id]');
    if (!button) return;
    if (button.dataset.actionHandled === 'true') {
      delete button.dataset.actionHandled;
      return;
    }
    handleQuoteAction(button);
  });
  kpBody.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const button = event.target.closest('[data-remove-position-id], [data-remove-quote-adjustment-id], [data-remove-internal-adjustment-id], [data-edit-internal-adjustment-id], [data-edit-overtime-line-id], [data-add-overtime-target], [data-add-cashback-target], [data-edit-decoration-id], [data-edit-stock-decoration-id], [data-remove-stock-decoration-id], [data-calc-decoration-id], [data-remove-annotation-id], [data-remove-photo-id], [data-remove-decoration-group-id], [data-open-duplicate-form-id], [data-confirm-duplicate-item-id], [data-edit-item-id], [data-remove-id]');
    if (!button) return;
    event.preventDefault();
    handleQuoteAction(button);
  });
  kpBody.addEventListener('paste', function (event) {
    const title = event.target.closest('[data-edit-field="title"]') || event.target.closest('tr')?.querySelector('[data-edit-field="title"]');
    if (!title || !event.clipboardData) return;
    const clipboardFiles = Array.from(event.clipboardData.files || []).filter(function (file) { return file.type.startsWith('image/'); });
    const imageFiles = clipboardFiles.length ? clipboardFiles : Array.from(event.clipboardData.items || [])
      .filter(function (item) { return item.type.startsWith('image/'); })
      .map(function (item) { return item.getAsFile(); })
      .filter(Boolean);
    if (imageFiles.length) {
      event.preventDefault();
      addPhotos(title.dataset.editId, imageFiles);
      return;
    }
    const html = event.clipboardData.getData('text/html');
    if (html) {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const dataImages = Array.from(parsed.images).map(function (image) { return image.getAttribute('src') || ''; })
        .filter(function (source) { return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(source); });
      if (dataImages.length) {
        event.preventDefault();
        addPhotoDataUrls(title.dataset.editId, dataImages);
        return;
      }
    }
    const text = event.clipboardData.getData('text/plain');
    if (text) {
      event.preventDefault();
      document.execCommand('insertText', false, text);
    }
  });
  kpBody.addEventListener('focusin', function (event) {
    const cell = event.target.closest('[data-edit-field]');
    if (!cell) return;
    const item = OrderState.getItems().find(function (entry) { return String(entry.id) === String(cell.dataset.editId); });
    if (item && ['unitPrice', 'total'].includes(cell.dataset.editField)) {
      cell.textContent = String(OrderFinance.amountForVat(item[cell.dataset.editField], includeVat));
    }
  });
  kpBody.addEventListener('focusout', function (event) {
    const cell = event.target.closest('[data-edit-field]');
    if (cell) editQuoteCell(cell);
  });
  function focusQuoteTitle(id) {
    window.requestAnimationFrame(function () {
      const title = Array.from(kpBody.querySelectorAll('[data-edit-field="title"]')).find(function (cell) { return cell.dataset.editId === id; });
      if (title) title.focus();
    });
  }

  function addManualPosition() {
    const quantity = Math.max(1, Number(document.getElementById('manual-position-quantity').value) || 1);
    const unitPrice = Math.max(0, Number(document.getElementById('manual-position-unit-price').value) || 0);
    const productionCost = Math.max(0, Number(document.getElementById('manual-position-cost').value) || 0);
    const id = OrderState.add({
      category: 'other',
      title: document.getElementById('manual-position-title-input').value.trim() || 'Новая позиция',
      details: document.getElementById('manual-position-details').value.trim(),
      quantity: quantity,
      unitPrice: unitPrice,
      total: Math.round(quantity * unitPrice),
      productionCost: productionCost,
      productionCostByCategory: { other: productionCost },
      delivery: document.getElementById('manual-position-delivery').value.trim()
    });
    document.getElementById('manual-position-dialog').close();
    focusQuoteTitle(id);
  }

  kpBody.addEventListener('click', function (event) {
    if (!event.target.closest('[data-add-quote-position]')) return;
    positionTypeDialog.showModal();
  });
  document.getElementById('btn-close-position-type').addEventListener('click', function () {
    positionTypeDialog.close();
  });
  positionTypeDialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    positionTypeDialog.close();
  });
  document.getElementById('btn-select-custom-position').addEventListener('click', function () {
    positionTypeDialog.close();
    document.getElementById('manual-position-title-input').value = 'Новая позиция';
    document.getElementById('manual-position-details').value = '';
    document.getElementById('manual-position-quantity').value = '1';
    document.getElementById('manual-position-unit-price').value = '0';
    document.getElementById('manual-position-cost').value = '0';
    document.getElementById('manual-position-delivery').value = '';
    document.getElementById('manual-position-dialog').showModal();
    document.getElementById('manual-position-title-input').focus();
  });
  document.getElementById('btn-create-manual-position').addEventListener('click', addManualPosition);
  document.getElementById('btn-cancel-manual-position').addEventListener('click', function () {
    document.getElementById('manual-position-dialog').close();
  });
  document.getElementById('btn-close-manual-position').addEventListener('click', function () {
    document.getElementById('manual-position-dialog').close();
  });
  document.getElementById('btn-create-poly-position').addEventListener('click', function () {
    positionTypeDialog.close();
    openProductCalculator('poly');
  });
  document.getElementById('btn-create-souvenir-position').addEventListener('click', function () {
    positionTypeDialog.close();
    souvenirImportRequestId += 1;
    souvenirProductUrl.value = '';
    souvenirLinkStatus.textContent = '';
    importSouvenirLinkButton.disabled = true;
    souvenirLinkDialog.showModal();
    souvenirProductUrl.focus();
  });
  souvenirProductUrl.addEventListener('input', function () {
    const supported = Boolean(normalizeSouvenirProductUrl(souvenirProductUrl.value));
    importSouvenirLinkButton.disabled = !supported;
    souvenirLinkStatus.textContent = souvenirProductUrl.value.trim() && !supported
      ? 'Пока поддерживаются Happy Gifts, Arte, Oasis, Проект 111, Portobello и Ucontay.'
      : '';
  });
  document.getElementById('btn-import-souvenir-link').addEventListener('click', async function () {
    const pageUrl = normalizeSouvenirProductUrl(souvenirProductUrl.value);
    if (!pageUrl) return;
    const requestId = ++souvenirImportRequestId;
    importSouvenirLinkButton.disabled = true;
    souvenirLinkStatus.textContent = 'Загружаю карточку товара…';
    try {
      const product = await importSouvenirProductFromUrl(pageUrl);
      if (requestId !== souvenirImportRequestId || !souvenirLinkDialog.open) return;
      const itemId = OrderState.add({
        category: 'souvenir',
        title: product.title,
        details: product.fullTitle,
        quantity: 1,
        unitPrice: 0,
        total: 0,
        productionCost: 0,
        productionCostByCategory: { souvenir: 0 },
        delivery: getSouvenirProductDelivery(product.sourceUrl),
        photos: [product.photo],
        sourceUrl: product.sourceUrl
      });
      souvenirLinkDialog.close();
      startDecoration(itemId);
    } catch (error) {
      if (requestId !== souvenirImportRequestId || !souvenirLinkDialog.open) return;
      souvenirLinkStatus.textContent = error && error.message ? error.message : 'Не удалось загрузить товар по ссылке';
      importSouvenirLinkButton.disabled = !normalizeSouvenirProductUrl(souvenirProductUrl.value);
    }
  });
  document.getElementById('btn-manual-souvenir').addEventListener('click', function () {
    souvenirImportRequestId += 1;
    souvenirLinkDialog.close();
    openProductCalculator('souvenir');
  });
  document.getElementById('btn-close-souvenir-link').addEventListener('click', function () {
    souvenirImportRequestId += 1;
    souvenirLinkDialog.close();
  });
  souvenirLinkDialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    souvenirImportRequestId += 1;
    souvenirLinkDialog.close();
  });
  document.getElementById('btn-close-product-calculator').addEventListener('click', closeProductCalculatorDialog);
  productCalculatorDialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    closeProductCalculatorDialog();
  });
  document.getElementById('btn-cancel-decoration').addEventListener('click', function () {
    closeDecorationDialog();
  });
  document.getElementById('btn-close-decoration-dialog').addEventListener('click', closeDecorationDialog);
  decorationDialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    closeDecorationDialog();
  });
  decorationDialog.addEventListener('click', function (event) {
    if (event.target === decorationDialog) closeDecorationDialog();
  });
  document.getElementById('btn-new-quote').addEventListener('click', function () {
    document.getElementById('btn-save-and-new-quote').disabled = OrderState.getItems().length === 0;
    newQuoteDialog.showModal();
  });
  document.getElementById('btn-save-and-new-quote').addEventListener('click', function () {
    startNewQuote(true);
  });
  document.getElementById('btn-discard-and-new-quote').addEventListener('click', function () {
    startNewQuote(false);
  });
  document.getElementById('btn-cancel-new-quote').addEventListener('click', function () {
    newQuoteDialog.close();
  });
  document.getElementById('btn-close-new-quote').addEventListener('click', function () {
    newQuoteDialog.close();
  });
  document.getElementById('btn-global-overtime').addEventListener('click', function (event) { handleQuoteAction(event.currentTarget); });
  document.getElementById('btn-global-cashback').addEventListener('click', function (event) { handleQuoteAction(event.currentTarget); });
  document.getElementById('btn-add-overtime').addEventListener('click', addOvertimeFromDialog);
  document.getElementById('btn-add-cashback').addEventListener('click', addCashbackFromDialog);
  document.getElementById('btn-remove-overtime').addEventListener('click', function () {
    if (window.confirm('Удалить эти сверхурочные из расчёта?')) removeOvertimeFromDialog();
  });
  document.getElementById('btn-remove-cashback').addEventListener('click', function () {
    if (window.confirm('Удалить этот кэшбек из расчёта?')) removeCashbackFromDialog();
  });
  document.getElementById('btn-close-overtime').addEventListener('click', function () { overtimeDialog.close(); });
  document.getElementById('btn-cancel-overtime').addEventListener('click', function () { overtimeDialog.close(); });
  overtimeDialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    overtimeDialog.close();
  });
  overtimeDialog.addEventListener('click', function (event) {
    if (event.target === overtimeDialog) overtimeDialog.close();
  });
  document.getElementById('btn-close-cashback').addEventListener('click', function () { cashbackDialog.close(); });
  document.getElementById('btn-cancel-cashback').addEventListener('click', function () { cashbackDialog.close(); });
  cashbackDialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    cashbackDialog.close();
  });
  cashbackDialog.addEventListener('click', function (event) {
    if (event.target === cashbackDialog) cashbackDialog.close();
  });
  [cashbackModeSelect, cashbackAmountInput, overtimeDisplayModeSelect,
    document.getElementById('overtime-printer-hours'), document.getElementById('overtime-binding-hours')]
    .forEach(function (input) {
      input.addEventListener('input', function () { updateOvertimePreview(); updateCashbackPreview(); });
      input.addEventListener('change', function () { updateOvertimePreview(); updateCashbackPreview(); });
    });
  document.getElementById('btn-save-history').addEventListener('click', function () {
    const saved = saveCurrentHistory();
    document.getElementById('quote-export-status').textContent = saved ? 'КП сохранено в истории.' : 'Нет позиций для сохранения.';
  });
  document.getElementById('btn-copy-word').addEventListener('click', function () {
    saveCurrentHistory();
    if (!OrderKP.copy(OrderState.getItems(), companyInput.value.trim(), includeVat, getQuoteSettings())) {
      document.getElementById('quote-export-status').textContent = 'Не удалось скопировать таблицу. Проверьте разрешение браузера на буфер обмена.';
      return;
    }
    document.getElementById('quote-export-status').textContent = 'Таблица скопирована. Вставьте её в Word.';
  });
  document.getElementById('btn-download-pdf').addEventListener('click', function () {
    const items = OrderState.getItems();
    const status = document.getElementById('quote-export-status');
    const dependencies = LegacyBridge.getPolyPdfDependencies();
    const quoteSettings = getQuoteSettings();
    if (!dependencies.pdfMake) {
      if (OrderKP.open(items, companyInput.value.trim(), includeVat, quoteSettings)) {
        saveCurrentHistory();
        status.textContent = 'Открылось окно печати. В нём можно сохранить КП как PDF.';
      } else {
        status.textContent = 'Генератор PDF не загружен.';
      }
      return;
    }
    status.textContent = 'Формирую PDF…';
    OrderKP.downloadPdf(items, companyInput.value.trim(), dependencies.pdfMake, dependencies.manager, includeVat, quoteSettings).then(function (saved) {
      if (saved) saveCurrentHistory();
      status.textContent = saved ? 'PDF скачан в папку «Загрузки».' : 'Не удалось сформировать PDF.';
    }).catch(function (error) {
      console.error('Ошибка формирования PDF:', error);
      status.textContent = 'Не удалось сформировать PDF.';
    });
  });
  document.getElementById('btn-clear-kp').addEventListener('click', function () {
    if (window.confirm('Очистить текущую таблицу КП?')) {
      currentHistoryId = null;
      currentHistoryManagerId = null;
      persistCurrentHistoryId();
      OrderState.clear();
    }
  });
  document.getElementById('discount-value').addEventListener('input', function () {
    saveQuoteSettingsFromControls();
    renderQuote(OrderState.getItems());
  });
  document.getElementById('discount-type').addEventListener('change', function () {
    saveQuoteSettingsFromControls();
    renderQuote(OrderState.getItems());
  });
  document.getElementById('discount-scope').addEventListener('change', function () {
    saveQuoteSettingsFromControls();
    renderQuote(OrderState.getItems());
  });
  document.getElementById('discount-item').addEventListener('change', function () {
    saveQuoteSettingsFromControls();
    renderQuote(OrderState.getItems());
  });
  document.getElementById('manual-total-enabled').addEventListener('change', function () {
    manualTotalInput.disabled = !manualTotalToggle.checked;
    if (!manualTotalToggle.checked) {
      manualTotalInput.value = '';
    }
    saveQuoteSettingsFromControls();
    renderQuote(OrderState.getItems());
  });
  document.getElementById('manual-total-value').addEventListener('input', function () {
    saveQuoteSettingsFromControls();
    renderQuote(OrderState.getItems());
  });
  document.getElementById('hide-total-toggle').addEventListener('change', function () {
    saveQuoteSettingsFromControls();
    renderQuote(OrderState.getItems());
  });
  document.getElementById('history-search').addEventListener('input', renderHistory);
  vatToggle.addEventListener('change', function () {
    includeVat = vatToggle.checked;
    localStorage.setItem(vatStorageKey, String(includeVat));
    renderQuote(OrderState.getItems());
  });
  companyInput.addEventListener('input', function () {
    if (currentHistoryId) persistCurrentHistoryId();
    renderQuote(OrderState.getItems());
  });
  document.getElementById('btn-open-history').addEventListener('click', function () {
    document.getElementById('history-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    LegacyBridge.load('poly').then(function () {
      renderHistory();
      const hasLocalHistory = OrderHistory.getRecords().some(function (record) { return !record.managerId; });
      if (!LegacyBridge.isPolyAuthenticated() && !hasLocalHistory) {
        openProductCalculator('poly');
        productCalculatorTitle.textContent = 'Вход для доступа к истории КП';
        document.getElementById('calc-status').textContent = 'Войдите в калькулятор, чтобы загрузить историю менеджера';
      }
    });
  });
  document.getElementById('btn-manager-login').addEventListener('click', function () {
    openManagerLoginDialog();
  });
  document.getElementById('btn-close-manager-login').addEventListener('click', function () {
    document.getElementById('manager-login-dialog').close();
  });
  document.getElementById('btn-cancel-manager-login').addEventListener('click', function () {
    document.getElementById('manager-login-dialog').close();
  });
  document.getElementById('btn-submit-manager-login').addEventListener('click', function () {
    const success = LegacyBridge.authenticatePoly(
      document.getElementById('manager-login-select').value,
      document.getElementById('manager-login-pin').value,
      document.getElementById('manager-login-remember').checked
    );
    if (success) {
      document.getElementById('manager-login-error').textContent = '';
      document.getElementById('manager-login-pin').value = '';
      document.getElementById('manager-login-dialog').close();
      renderHistory();
    } else {
      document.getElementById('manager-login-error').textContent = 'Неверный ПИН-код. Попробуйте снова.';
      document.getElementById('manager-login-pin').select();
    }
  });
  document.getElementById('btn-manager-logout').addEventListener('click', function () {
    LegacyBridge.logoutPoly();
    document.getElementById('manager-login-pin').value = '';
    document.getElementById('manager-login-dialog').close();
    renderHistory();
  });
  document.getElementById('btn-back-to-quote').addEventListener('click', function () {
    document.querySelector('.quote-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('history-list').addEventListener('click', function (event) {
    const loadButton = event.target.closest('[data-load-history-id]');
    const deleteButton = event.target.closest('[data-delete-history-id]');
    if (loadButton) {
      const record = OrderHistory.getRecords().find(function (item) { return String(item.id) === loadButton.dataset.loadHistoryId; });
      if (record && (!OrderState.getItems().length || window.confirm('Заменить текущую таблицу КП?'))) {
        const items = (record.items || []).map(function (item) {
          return Object.assign({}, item, {
            category: item.category || (item.isManual ? 'other' : 'poly'),
            details: item.details || item.desc || '',
            quantity: item.quantity === undefined ? item.circulation : item.quantity,
            unitPrice: item.unitPrice === undefined ? item.one_total : item.unitPrice
          });
        });
        OrderState.setItems(items);
        companyInput.value = record.company || '';
        includeVat = record.includeVat !== false;
        vatToggle.checked = includeVat;
        localStorage.setItem(vatStorageKey, String(includeVat));
        const savedSettings = record.quoteSettings || {};
        applyQuoteSettingsToControls(savedSettings);
        persistQuoteSettings(savedSettings);
        currentHistoryId = normalizeHistoryId(record.id);
        currentHistoryManagerId = record.managerId || null;
        persistCurrentHistoryId();
        LegacyBridge.loadPolyHistory(record);
      }
    }
    if (deleteButton) {
      const record = OrderHistory.getRecords().find(function (item) { return String(item.id) === deleteButton.dataset.deleteHistoryId; });
      if (record && record.managerId && record.managerId === LegacyBridge.getPolyManagerId()) {
        if (LegacyBridge.deletePolyHistory(record.id)) OrderHistory.remove(record.id);
        if (String(currentHistoryId) === String(record.id)) {
          if (!OrderHistory.getRecords().some(function (item) { return String(item.id) === String(record.id); })) {
            currentHistoryId = null;
            currentHistoryManagerId = null;
            persistCurrentHistoryId();
          }
        }
      } else if (record && window.confirm('Удалить КП из истории?')) {
        OrderHistory.remove(record.id);
        if (String(currentHistoryId) === String(record.id)) {
          currentHistoryId = null;
          currentHistoryManagerId = null;
          persistCurrentHistoryId();
        }
        renderHistory();
      }
    }
  });
  document.getElementById('btn-sync-history').addEventListener('click', function () {
    LegacyBridge.syncPolyHistory();
  });

  restoreCurrentHistory();
  OrderState.subscribe(renderQuote);
  LegacyBridge.subscribe(function () {
    updateCalculationStatus();
    renderHistory();
    syncPendingHistoryAfterLogin();
  });
  applyQuoteSettingsToControls(getQuoteSettings());
  renderHistory();
  LegacyBridge.load('poly').then(renderHistory).catch(function () {});
})();
