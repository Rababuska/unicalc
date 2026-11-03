const APP_GOODS = {
    'business-card': { name: 'Визитка' },
    'leaflet': { name: 'Листовка' },
    'brochure': { name: 'Брошюра' },
    'presentation': { name: 'Презентация' },
    'pad': { name: 'Блокнот' },
    'envelope': { name: 'Конверт' },
    'sticker': { name: 'Стикерпак / Наклейка' },
    'bag': { name: 'Пакеты бумажные' },
    'calendar': { name: 'Календарь настольный перекидной А5' }
};

const APP_COLORS = {
    '4_0': { name: '4+0' },
    '4_1': { name: '4+1' }, 
    '4_4': { name: '4+4' },
    '1_0': { name: '1+0' },
    '1_1': { name: '1+1' },
    '0_0': { name: '0+0 (Без печати)' }
};

// Варианты нанесения ламинации
const APP_LAMINATION_SIDES = {
    '1_0': { name: '1+0' },
    '1_1': { name: '1+1' }
};

// Справочник материалов припресса и ламинации (цена берется за 1 сторону SRA3)
const APP_LAMINATIONS = {
    'none': { 
        name: 'Без припресса / ламинации', 
        type: 'none', 
        price: 0,
        priceKey: null 
    },
    'press_matt': { 
        name: 'Матовый припресс', 
        type: 'roll', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.press_matt_sra3 : 29),
        priceKey: 'press_matt_sra3' 
    },
    'press_gl': { 
        name: 'Глянцевый припресс', 
        type: 'roll', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.press_gl_sra3 : 27),
        priceKey: 'press_gl_sra3' 
    },
    'press_touch_silkfeel': { 
        name: 'Софт-тач 28 мкр Silkfeel (Корея)', 
        type: 'roll', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.press_touch_silkfeel_sra3 : 50),
        priceKey: 'press_touch_silkfeel_sra3' 
    },
    'press_touch_velvet': { 
        name: 'Софт-тач 32 мкр Velvet (Индия)', 
        type: 'roll', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.press_touch_velvet_sra3 : 37),
        priceKey: 'press_touch_velvet_sra3' 
    },
    'press_touch_tigerbond': { 
        name: 'Софт-тач 36 мкр Tigerbond (Корея, для плашек)', 
        type: 'roll', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.press_touch_tigerbond_sra3 : 66),
        priceKey: 'press_touch_tigerbond_sra3' 
    },
    'lam_matt100': { 
        name: 'Пакетная матовая 100 мкр', 
        type: 'pouch', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.lam_matt100 : 235),
        priceKey: 'lam_matt100' 
    },
    'lam_gl100': { 
        name: 'Пакетная глянцевая 100 мкр', 
        type: 'pouch', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.lam_gl100 : 125),
        priceKey: 'lam_gl100' 
    },
    'lam_matt150': { 
        name: 'Пакетная матовая 150 мкр', 
        type: 'pouch', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.lam_matt150 : 325),
        priceKey: 'lam_matt150' 
    },
    'lam_gl150': { 
        name: 'Пакетная глянцевая 150 мкр', 
        type: 'pouch', 
        price: (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.lam_gl150 : 190),
        priceKey: 'lam_gl150' 
    }
};

const APP_TONERS = {
    'none': { name: 'Без спецтонера' },
    'pink': { name: 'PX500 Pink Toner' },
    'clear': { name: 'PX500 Clear Toner' },
    'low_gloss': { name: 'PX500 Low Gloss Clear Toner' }
};

const APP_SIZES = {
    leaflet: {
        'a3': { name: 'A3 (297 x 420 мм)', w: 297, h: 420 },
        'a4': { name: 'A4 (210 x 297 мм)', w: 210, h: 297 },
        'a5': { name: 'A5 (148 x 210 мм)', w: 148, h: 210 },
        'a6': { name: 'A6 (105 x 148 мм)', w: 105, h: 148 },
        'a7': { name: 'A7 (74 x 105 мм)', w: 74, h: 105 },
        'euro': { name: 'Евро (99 x 210 мм)', w: 99, h: 210 },
        'custom': { name: 'Свой размер', w: 0, h: 0 }
    },
    sticker: {
        'a4': { name: 'A4 (210 x 297 мм)', w: 210, h: 297 },
        'a5': { name: 'A5 (148 x 210 мм)', w: 148, h: 210 },
        'a6': { name: 'A6 (105 x 148 мм)', w: 105, h: 148 },
        'custom': { name: 'Свой размер', w: 0, h: 0 }
    },
    brochure: {
        'a4': { name: 'A4 (210 x 297 мм)', w: 210, h: 297 },
        'a5': { name: 'A5 (148 x 210 мм)', w: 148, h: 210 },
        'a6': { name: 'A6 (105 x 148 мм)', w: 105, h: 148 },
        'a7': { name: 'A7 (74 x 105 мм)', w: 74, h: 105 }
    },
    bag: {
        'bag_350_225_80': { name: '350 (В) х 225 (Ш) х 80 (Г) мм', w: 225, h: 350, d: 80 },
        'bag_350_230_80': { name: '350 (В) х 230 (Ш) х 80 (Г) мм', w: 230, h: 350, d: 80 },
        'bag_250_200_80': { name: '250 (В) х 200 (Ш) х 80 (Г) мм', w: 200, h: 250, d: 80 }
    },
    calendar: {
        'a5_desk': { name: 'А5 настольный (210 х 150 мм)', w: 210, h: 150 }
    }
};