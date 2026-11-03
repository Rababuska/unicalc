const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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

function createBridge(servicesReady) {
  const listeners = {};
  const frameListeners = {};
  const serviceElements = [];
  const serviceStates = [];
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
    C6: createField('0'),
    C8: createField('250'),
    C9: createField('2500'),
    F3: createField('0'),
    F4: createField('15000'),
    F4_simp: createField('0'),
    F5: createField('0'),
    F6: createField('0'),
    F7: createField('0'),
    markup: createField('1.35'),
    addDiscount: createField('0'),
    K1: createField('0'),
    K3: createField('0'),
    PB2: createField('6'),
    F9: createField('1800')
  };
  const origin = createField('kazakhstan', true, 'origin');
  const russia = createField('russia', false, 'origin');
  const vatWith = createField('withVAT', true, 'vat');
  const vatWithout = createField('withoutVAT', false, 'vat');
  const showUsd = createField('');
  const usdRate = createField('480');
  const usdRateWrap = { style: { display: 'none' }, parentElement: null };
  usdRate.parentElement = usdRateWrap;
  const addButton = { style: {} };
  const frameWindow = {
    currentMode: 'order',
    souvenirServicesReady: servicesReady !== false,
    addEventListener: function (type, listener) {
      frameListeners[type] = frameListeners[type] || [];
      frameListeners[type].push(listener);
    },
    removeEventListener: function (type, listener) {
      frameListeners[type] = (frameListeners[type] || []).filter(function (entry) { return entry !== listener; });
    },
    dispatchEvent: function (event) {
      (frameListeners[event.type] || []).slice().forEach(function (listener) { listener(event); });
    },
    calc: function () {},
    getDeliveryDays: function () { return '5-7'; },
    Event: function () {}
  };
  frameWindow.getServiceSlot = function (uid) {
    return serviceStates.find(function (state) { return state.uid === Number(uid); });
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
      textContent: serviceCatalog[0].name + 'расход: 22 562,5 теңге (с НДС)',
      firstChild: { textContent: serviceCatalog[0].name },
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
    serviceStates.push(state);
    serviceElements.push(element);
  };
  frameWindow.createServiceSlot();
  const frameDocument = {
    body: {},
    head: { appendChild: function () {} },
    getElementById: function (id) {
      if (id === 'btn-add-kp') return addButton;
      if (id === 'kazakhstan') return origin;
      if (id === 'russia') return russia;
      if (id === 'showUsd') return showUsd;
      if (id === 'usdRate') return usdRate;
      return null;
    },
    createElement: function () { return { style: {} }; },
    querySelectorAll: function (selector) {
      const fieldMatch = /^input\[name="(.+)"\]$/.exec(selector);
      if (fieldMatch && fields[fieldMatch[1]]) return [fields[fieldMatch[1]]];
      if (selector === 'input[name="origin"]') return [origin];
      if (selector === 'input[name="vat"]') return [vatWith, vatWithout];
      if (selector === 'input[name="usdRate"]') return [usdRate];
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
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  const context = { window: window, document: document, console: console, setTimeout: setTimeout };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '..', 'core', 'legacy-bridge.js'), 'utf8'),
    context
  );
  return {
    bridge: window.LegacyBridge,
    frame: frame,
    frameWindow: frameWindow,
    frameDocument: frameDocument,
    fields: fields,
    vatFields: [vatWith, vatWithout],
    showUsd: showUsd,
    usdRate: usdRate,
    frameWindow: frameWindow
  };
}

test('restores selected souvenir services and their saved options', async () => {
  const setup = createBridge();
  await setup.bridge.load('souvenir');
  assert.equal(setup.frameWindow.servicesList, undefined);

  const name = 'Тиснение: Блокноты / Ежедневники';
  const options = {
    name: name,
    withDelivery: false,
    clicheExists: false,
    clicheW: 65,
    clicheH: 41,
    dtfPoints: []
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.equal(setup.bridge.setSouvenirServices([name], [options]), true);
  }
  const restored = setup.frameWindow.getServiceSlot(1);
  assert.equal(restored.service.name, name);
  assert.equal(restored.withDelivery, false);
  assert.equal(restored.clicheW, 65);
  assert.equal(restored.clicheH, 41);
});

test('does not partially restore souvenir services before the iframe is initialized', async () => {
  const setup = createBridge();
  await setup.bridge.load('souvenir');
  setup.frameWindow.souvenirServicesReady = false;

  assert.equal(setup.bridge.setSouvenirServices(['Тиснение: Блокноты / Ежедневники'], [{
    name: 'Тиснение: Блокноты / Ежедневники',
    clicheW: 65,
    clicheH: 41
  }]), false);
  assert.equal(setup.frameDocument.querySelectorAll('.service-slot').length, 1);
  assert.equal(setup.frameWindow.getServiceSlot(1).service, null);
});

test('waits for the souvenir iframe to finish initialization before resolving load', async () => {
  const setup = createBridge(false);
  let loaded = false;
  const pendingLoad = setup.bridge.load('souvenir').then(function (frame) {
    loaded = true;
    return frame;
  });

  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(loaded, false);

  setup.frameWindow.souvenirServicesReady = true;
  setup.frameWindow.dispatchEvent({ type: 'souvenir-services-ready' });
  assert.equal(await pendingLoad, setup.frame);
});

test('does not fall back to missing legacy service controls while the iframe is loading', async () => {
  const setup = createBridge();
  await setup.bridge.load('souvenir');
  setup.frameWindow.getServiceSlot = undefined;
  setup.frameWindow.createServiceSlot = undefined;

  assert.equal(setup.bridge.setSouvenirServices(['Тиснение: Блокноты / Ежедневники']), false);
});

test('requires a selected order service and stores its details with the quote item', async () => {
  const setup = createBridge();
  await setup.bridge.load('souvenir');

  assert.equal(setup.bridge.canAdd('souvenir'), true);
  assert.equal(setup.bridge.canAddDecoration(), false);

  Object.assign(setup.frameWindow.getServiceSlot(1), {
    service: { name: 'Тампопечать: ручки' },
    withDelivery: true,
    clicheExists: false,
    clicheW: 50,
    clicheH: 50,
    dtfPoints: []
  });

  assert.equal(setup.bridge.canAdd('souvenir'), true);
  assert.equal(setup.bridge.canAddDecoration(), true);
  const item = setup.bridge.add('souvenir');
  assert.deepEqual(Array.from(item.services), ['Тампопечать: ручки']);
  assert.equal(item.annotationText, 'Нанесение логотипа методом тампопечати');
  assert.equal(item.title, 'Нанесение логотипа');
  assert.equal(item.serviceOptions[0].name, 'Тампопечать: ручки');
  assert.equal(item.calculationOptions.inputs.F4, '15000');
  assert.equal(item.calculationOptions.vat, 'withVAT');
});

test('restores souvenir expenses and calculation settings when editing a saved annotation', async () => {
  const setup = createBridge();
  await setup.bridge.load('souvenir');
  Object.assign(setup.frameWindow.getServiceSlot(1), {
    service: { name: 'Тиснение: Блокноты / Ежедневники', isCliche: true },
    withDelivery: true,
    clicheExists: false,
    clicheW: 65,
    clicheH: 41,
    dtfPoints: []
  });
  const annotation = {
    souvenirMode: 'order',
    quantity: 40,
    sourceUnitPrice: 370,
    exchangeRate: 6,
    currencyOrigin: 'russia',
    services: ['Тиснение: Блокноты / Ежедневники'],
    serviceOptions: [{
      name: 'Тиснение: Блокноты / Ежедневники',
      withDelivery: true,
      clicheExists: false,
      clicheW: 65,
      clicheH: 41,
      dtfPoints: []
    }],
    calculationOptions: {
      inputs: { F4: '15000', markup: '1.5', addDiscount: '3', C6: '2' },
      vat: 'withoutVAT',
      showUsd: true,
      usdRate: '490'
    }
  };
  assert.equal(setup.bridge.setSouvenirServices(annotation.services, annotation.serviceOptions), true);

  assert.equal(setup.bridge.setSouvenirCalculation(annotation, {}), true);
  assert.equal(setup.fields.F4.value, '15000');
  assert.equal(setup.fields.markup.value, '1.5');
  assert.equal(setup.fields.addDiscount.value, '3');
  assert.equal(setup.fields.C6.value, '2');
  assert.equal(setup.vatFields[1].checked, true);
  assert.equal(setup.showUsd.checked, true);
  assert.equal(setup.usdRate.value, '490');
});

test('loads the legacy bridge with a cache key matching its current content', () => {
  const root = path.join(__dirname, '..', '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = html.match(/<script src="js\/core\/legacy-bridge\.js\?v=([a-f0-9]{12})"><\/script>/);
  assert.ok(script, 'index.html must use the content hash as the legacy bridge cache key');

  const source = fs.readFileSync(path.join(root, 'js', 'core', 'legacy-bridge.js'));
  const expectedHash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
  assert.equal(script[1], expectedHash);

  const bridge = fs.readFileSync(path.join(root, 'js', 'core', 'legacy-bridge.js'), 'utf8');
  assert.match(bridge, /_legacy\/souvenir\/index\.html\?v=2/);
});
