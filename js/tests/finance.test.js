const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global;
global.window.dispatchEvent = function () {};
global.window.crypto = { randomUUID: function () { return 'mock-uuid-' + Math.random().toString(16).slice(2); } };
global.localStorage = {
  store: {},
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; },
  setItem: function (key, value) { this.store[key] = String(value); },
  removeItem: function (key) { delete this.store[key]; }
};
require('../core/finance.js');
require('../core/state.js');

test('applies order-level percent discount without touching production cost', () => {
  const items = [
    { quantity: 10, unitPrice: 100, total: 1000, productionCost: 400 },
    { quantity: 5, unitPrice: 50, total: 250, productionCost: 100 }
  ];

  const result = window.OrderFinance.calculate(items, false, {
    discountType: 'percent',
    discountValue: 10,
    discountScope: 'order'
  });

  assert.equal(result.rawTotal, 1078);
  assert.ok(Math.abs(result.discountAmount - 107.8) < 1e-9);
  assert.ok(Math.abs(result.total - 970.2) < 1e-9);
  assert.equal(result.productionCost, 500);
  assert.ok(Math.abs(result.margin - 470.2) < 1e-9);
});

test('shows whole-quote discounts in every row and keeps row sum equal to quote total', () => {
  const items = [
    { id: 'first', quantity: 10, unitPrice: 100, total: 1000 },
    { id: 'second', quantity: 5, unitPrice: 50, total: 250 }
  ];
  const percentSettings = { discountType: 'percent', discountValue: 10, discountScope: 'order' };
  const fixedSettings = { discountType: 'amount', discountValue: 100, discountScope: 'order' };
  const percentRows = window.OrderFinance.itemsForVat(items, true, percentSettings);
  const fixedRows = window.OrderFinance.itemsForVat(items, true, fixedSettings);

  assert.deepEqual(percentRows.map(function (item) { return item.total; }), [900, 225]);
  assert.equal(percentRows.reduce(function (sum, item) { return sum + item.total; }, 0), window.OrderFinance.calculate(items, true, percentSettings).total);
  assert.deepEqual(fixedRows.map(function (item) { return item.total; }), [920, 230]);
  assert.equal(fixedRows.reduce(function (sum, item) { return sum + item.total; }, 0), window.OrderFinance.calculate(items, true, fixedSettings).total);
});

test('applies a position percent discount only to the selected position and its runs', () => {
  const items = [
    { id: 'run-a', runGroupId: 'position-a', quantity: 10, unitPrice: 100, total: 1000, productionCost: 600 },
    { id: 'run-b', runGroupId: 'position-a', quantity: 2, unitPrice: 250, total: 500, productionCost: 300 },
    { id: 'position-b', quantity: 10, unitPrice: 200, total: 2000, productionCost: 1000 }
  ];
  const settings = {
    discountType: 'percent',
    discountValue: 10,
    discountScope: 'position',
    discountItemId: window.OrderFinance.runGroupKey(items[0])
  };

  const result = window.OrderFinance.calculate(items, true, settings);
  const displayItems = window.OrderFinance.itemsForVat(items, true, settings);

  assert.equal(result.rawTotal, 3500);
  assert.equal(result.discountAmount, 150);
  assert.equal(result.total, 3350);
  assert.deepEqual(displayItems.map(function (item) { return item.total; }), [900, 450, 2000]);
  assert.equal(result.productionCost, 1900);
});

test('caps a fixed position discount at the selected position total', () => {
  const items = [
    { id: 'position-a', quantity: 2, unitPrice: 100, total: 200, productionCost: 100 },
    { id: 'position-b', quantity: 1, unitPrice: 500, total: 500, productionCost: 200 }
  ];

  const result = window.OrderFinance.calculate(items, true, {
    discountType: 'amount',
    discountValue: 300,
    discountScope: 'position',
    discountItemId: window.OrderFinance.runGroupKey(items[0])
  });

  assert.equal(result.discountAmount, 200);
  assert.equal(result.total, 500);
});

test('treats legacy all-lines discounts as a whole-quote discount', () => {
  const items = [
    { id: 'position-a', quantity: 1, unitPrice: 1000, total: 1000 },
    { id: 'position-b', quantity: 1, unitPrice: 2000, total: 2000 }
  ];

  const result = window.OrderFinance.calculate(items, true, {
    discountType: 'percent',
    discountValue: 10,
    discountScope: 'item'
  });

  assert.equal(result.discountAmount, 300);
  assert.equal(result.total, 2700);
  assert.equal(result.quoteSettings.discountScope, 'order');
});

test('keeps business cards and leaflets separate when legacy run groups collide', () => {
  const items = [
    { id: 'card-a', runGroupId: 'shared-run', category: 'poly', specData: { good: 'business-card' }, quantity: 10, unitPrice: 100, total: 1000 },
    { id: 'card-b', runGroupId: 'shared-run', category: 'poly', specData: { good: 'business-card' }, quantity: 20, unitPrice: 90, total: 1800 },
    { id: 'leaflet-a', runGroupId: 'shared-run', category: 'poly', specData: { good: 'leaflet' }, quantity: 100, unitPrice: 20, total: 2000 }
  ];
  const groups = window.OrderFinance.groupRuns(items);
  const businessCardKey = window.OrderFinance.runGroupKey(items[0]);
  const settings = {
    discountType: 'percent',
    discountValue: 10,
    discountScope: 'position',
    discountItemId: businessCardKey
  };

  assert.equal(groups.length, 2);
  assert.equal(groups[0].length, 2);
  assert.equal(groups[1].length, 1);
  assert.deepEqual(window.OrderFinance.itemsForVat(items, true, settings).map(function (item) { return item.total; }), [900, 1620, 2000]);
});

test('allows manual total override and hidden total flag', () => {
  const items = [
    { quantity: 2, unitPrice: 200, total: 400, productionCost: 300 }
  ];

  const result = window.OrderFinance.calculate(items, false, {
    manualTotal: 333,
    hideTotal: true
  });

  assert.equal(result.total, 333);
  assert.equal(result.manualTotal, 333);
  assert.equal(result.hideTotal, true);
  assert.equal(result.rawTotal, 345);
  assert.equal(result.margin, 33);
});

test('uses the confirmed notebook embossing setup, impression, and cliché rates', () => {
  const result = window.OrderFinance.calculate([{
    category: 'poly',
    title: 'Блокнот с тиснением',
    quantity: 100,
    unitPrice: 100,
    total: 10000,
    productionCost: 1000,
    embossing: 'notebook',
    clicheW: 50,
    clicheH: 50
  }], true);

  assert.equal(result.expenses.other, 31000);
  assert.equal(result.productionCost, 32000);
});

test('does not add embossing twice when souvenir F9 cost already includes finishes', () => {
  const result = window.OrderFinance.calculate([{
    category: 'souvenir',
    title: 'Ежедневник с тиснением',
    quantity: 100,
    unitPrice: 500,
    total: 50000,
    productionCost: 24000,
    productionCostIncludesFinish: true,
    embossing: 'notebook',
    clicheW: 50,
    clicheH: 50
  }], true);

  assert.equal(result.expenses.souvenir, 24000);
  assert.equal(result.expenses.other, 0);
  assert.equal(result.productionCost, 24000);
});

test('includes internal cashback and overtime allocations in named expenses', () => {
  const result = window.OrderFinance.calculate([
    {
      quantity: 1,
      unitPrice: 10000,
      total: 10000,
      productionCost: 500,
      productionCostByCategory: { souvenir: 500 },
      quoteInternalAdjustments: [
        { type: 'overtime', expenseAmount: 4000 },
        { type: 'cashback', expenseAmount: 170520 }
      ]
    },
    {
      category: 'other',
      quantity: 1,
      unitPrice: 2430,
      total: 2430,
      productionCost: 0,
      productionCostByCategory: { other: 0 },
      overtimeExpense: 1800
    }
  ], true);

  assert.equal(result.expenses.overtime, 5800);
  assert.equal(result.expenses.cashback, 170520);
  assert.equal(result.productionCost, 176820);
});

test('keeps internal charges intact when discounts are applied', () => {
  const items = [{
    id: 'design',
    quantity: 1,
    unitPrice: 171520,
    total: 171520,
    quoteInternalAdjustments: [{ type: 'cashback', chargeAmount: 170520, expenseAmount: 170520 }]
  }];
  const settings = { discountType: 'percent', discountValue: 10, discountScope: 'order' };

  const result = window.OrderFinance.calculate(items, true, settings);
  const displayItems = window.OrderFinance.itemsForVat(items, true, settings);

  assert.equal(result.discountAmount, 100);
  assert.equal(result.total, 171420);
  assert.equal(displayItems[0].total, result.total);
});

test('duplicateItem creates a second run with a custom quantity', () => {
  const baseId = window.OrderState.add({
    title: 'Блокнот',
    category: 'poly',
    quantity: 100,
    unitPrice: 200,
    total: 20000,
    details: 'Блокнот А5',
    productionCost: 15000
  });

  const duplicateId = window.OrderState.duplicateItem(baseId, { quantity: 250 });
  const items = window.OrderState.getItems();
  const duplicated = items.find(function (item) { return item.id === duplicateId; });

  assert.ok(duplicated);
  assert.equal(duplicated.quantity, 250);
  assert.equal(duplicated.unitPrice, 200);
  assert.equal(duplicated.total, 50000);
  assert.equal(items[0].runGroupId, baseId);
  assert.equal(duplicated.runGroupId, baseId);
  assert.equal(window.OrderFinance.groupRuns(items).length, 1);
  assert.equal(window.OrderFinance.groupRuns([{ quantity: 1 }, { quantity: 2 }]).length, 2);
  assert.equal(items.length, 2);
});

test('removeDecoration restores the base item values', () => {
  const itemId = window.OrderState.add({
    title: 'Блокнот',
    category: 'poly',
    quantity: 100,
    unitPrice: 200,
    total: 20000,
    details: 'Блокнот A5',
    productionCost: 15000,
    productionCostByCategory: { poly: 15000 }
  });

  window.OrderState.update(itemId, {
    baseTotal: 20000,
    baseUnitPrice: 200,
    baseProductionCost: 15000,
    baseDetails: 'Блокнот A5',
    annotations: [{ title: 'Нанесение', total: 5000, productionCost: 5000 }],
    details: 'Блокнот A5\nНанесение логотипа',
    unitPrice: 205,
    total: 25000,
    productionCostByCategory: { poly: 15000, souvenir: 5000 },
    productionCost: 20000
  });

  const removed = window.OrderState.removeDecoration(itemId);
  assert.equal(removed, true);
  const item = window.OrderState.getItems().find(function (entry) { return entry.id === itemId; });
  assert.deepEqual(item.annotations, []);
  assert.equal(item.total, 20000);
  assert.equal(item.unitPrice, 200);
  assert.equal(item.details, 'Блокнот A5');
  assert.equal(item.productionCost, 15000);
});

test('removeDecoration removes one selected annotation and preserves the rest', () => {
  const itemId = window.OrderState.add({
    title: 'Визитка',
    category: 'poly',
    quantity: 100,
    unitPrice: 208,
    total: 20800,
    details: 'Визитка\nНанесение A\nНанесение B',
    productionCost: 15700,
    productionCostByCategory: { poly: 15000, souvenir: 700 },
    baseTotal: 20000,
    baseUnitPrice: 200,
    baseProductionCost: 15000,
    baseDetails: 'Визитка',
    annotations: [
      { details: 'Нанесение A', annotationText: 'Нанесение A', quantity: 100, unitPrice: 3, total: 300, productionCost: 200 },
      { details: 'Нанесение B', annotationText: 'Нанесение B', quantity: 100, unitPrice: 5, total: 500, productionCost: 500 }
    ]
  });

  assert.equal(window.OrderState.removeDecoration(itemId, 0), true);
  let item = window.OrderState.getItems().find(function (entry) { return entry.id === itemId; });
  assert.equal(item.annotations.length, 1);
  assert.equal(item.details, 'Визитка\nНанесение B');
  assert.equal(item.total, 20500);
  assert.equal(item.unitPrice, 205);
  assert.equal(item.productionCost, 15500);
  assert.equal(item.productionCostByCategory.souvenir, 500);

  assert.equal(window.OrderState.removeDecoration(itemId), true);
  item = window.OrderState.getItems().find(function (entry) { return entry.id === itemId; });
  assert.equal(item.annotations.length, 0);
  assert.equal(item.total, 20000);
  assert.equal(item.productionCost, 15000);
});
