const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createField(value, checked, name) {
  return {
    value: value,
    checked: Boolean(checked),
    name: name,
    style: {},
    parentElement: null,
    addEventListener: function () {},
    dispatchEvent: function () {},
    click: function () {}
  };
}

function createBridge() {
  const listeners = {};
  const serviceElements = [];
  const serviceCatalog = [{
    id: 'embossing',
    name: 'Тиснение: Блокноты / Ежедневники',
    isCliche: true
  }];
  let nextServiceUid = 1;
  const slot = {
    appendChild: function (frame) {
      setImmediate(function () { listeners.load(); });
    }
  };
  const fields = {
    C3: createField('100'),
    C5: createField('10'),
    C8: createField('250'),
    C9: createField('2500'),
    PB2: createField('6'),
    F9: createField('1800')
  };
  const origin = createField('kazakhstan', true, 'origin');
  const addButton = { style: {} };
  const frameWindow = {
    currentMode: 'order',
    servicesList: [],
    addEventListener: function () {},
    calc: function () {},
    getDeliveryDays: function () { return '5-7'; },
    Event: function () {}
  };
  frameWindow.createServiceSlot = function () {
    const state = {
      uid: nextServiceUid++,
      service: null,
      withDelivery: true,
      clicheExists: false,
      clicheW: 50,
      clicheH: 50,
      dtfPoints: [{ w: 100, h: 100 }]
    };
    const search = createField('');
    const delivery = createField('');
    const clicheExists = createField('');
    const clicheW = createField('50');
    const clicheH = createField('50');
    const result = {
      textContent: serviceCatalog[0].name,
      click: function () { state.service = serviceCatalog[0]; }
    };
    const points = { querySelectorAll: function () { return []; } };
    const element = {
      dataset: { uid: String(state.uid) },
      querySelector: function (selector) {
        if (selector === '.slot-search') return search;
        if (selector === '.slot-clear') return { click: function () { state.service = null; } };
        if (selector === '.slot-add-delivery') return delivery;
        if (selector === '.slot-cliche-exists') return clicheExists;
        if (selector === '.slot-cliche-w') return clicheW;
        if (selector === '.slot-cliche-h') return clicheH;
        if (selector === '.slot-dtf-points') return points;
        return null;
      },
      querySelectorAll: function (selector) {
        if (selector === '.slot-results .search-item' && search.value === serviceCatalog[0].name) return [result];
        return [];
      }
    };
    frameWindow.servicesList.push(state);
    serviceElements.push(element);
  };
  frameWindow.createServiceSlot();
  const frameDocument = {
    body: {},
    head: { appendChild: function () {} },
    getElementById: function (id) {
      if (id === 'btn-add-kp') return addButton;
      return null;
    },
    createElement: function () { return { style: {} }; },
    querySelectorAll: function (selector) {
      const fieldMatch = /^input\[name="(.+)"\]$/.exec(selector);
      if (fieldMatch && fields[fieldMatch[1]]) return [fields[fieldMatch[1]]];
      if (selector === 'input[name="origin"]') return [origin];
      if (selector === 'select[name="product"]') return [];
      if (selector === '.service-slot') return serviceElements;
      return [];
    }
  };
  const frame = {
    contentWindow: frameWindow,
    contentDocument: frameDocument,
    addEventListener: function (type, listener) { listeners[type] = listener; }
  };
  const document = {
    getElementById: function (id) { return id === 'legacy-souvenir-slot' ? slot : null; },
    createElement: function () { return frame; }
  };
  const window = {
    addEventListener: function () {},
    dispatchEvent: function () {},
    setTimeout: setTimeout
  };
  const context = { window: window, document: document, console: console, setTimeout: setTimeout };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '..', 'core', 'legacy-bridge.js'), 'utf8'),
    context
  );
  return {
    bridge: window.LegacyBridge,
    frameWindow: frameWindow
  };
}

test('restores selected souvenir services and their saved options', async () => {
  const setup = createBridge();
  await setup.bridge.load('souvenir');

  const name = 'Тиснение: Блокноты / Ежедневники';
  assert.equal(setup.bridge.setSouvenirServices([name], [{
    name: name,
    withDelivery: false,
    clicheExists: false,
    clicheW: 65,
    clicheH: 41,
    dtfPoints: []
  }]), true);
  const restored = setup.frameWindow.servicesList[0];
  assert.equal(restored.service.name, name);
  assert.equal(restored.withDelivery, false);
  assert.equal(restored.clicheW, 65);
  assert.equal(restored.clicheH, 41);
});

test('requires a selected order service and stores its details with the quote item', async () => {
  const setup = createBridge();
  await setup.bridge.load('souvenir');

  assert.equal(setup.bridge.canAdd('souvenir'), false);
  assert.equal(setup.bridge.add('souvenir'), null);

  setup.frameWindow.servicesList = [{
    uid: 1,
    service: { name: 'Тампопечать: ручки' },
    withDelivery: true,
    clicheExists: false,
    clicheW: 50,
    clicheH: 50,
    dtfPoints: []
  }];

  assert.equal(setup.bridge.canAdd('souvenir'), true);
  const item = setup.bridge.add('souvenir');
  assert.deepEqual(Array.from(item.services), ['Тампопечать: ручки']);
  assert.equal(item.annotationText, 'Нанесение логотипа методом тампопечати');
  assert.equal(item.title, 'Нанесение логотипа');
  assert.equal(item.serviceOptions[0].name, 'Тампопечать: ручки');
});
