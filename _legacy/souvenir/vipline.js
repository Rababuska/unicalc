// ==========================================
// БАЗА ТАРИФОВ И ЛОГИКА VIPLINE (FINAL 2026)
// ==========================================

const viplinePrices = {
    uv: {
        // Ручки, брелоки, флешки (мелкие сувениры)
        small_items: [
            {max: 1, type: 'total', price: 3000},
            {max: 20, type: 'total', price: 8000},
            {max: 50, type: 'total', price: 10000},
            {max: 199, type: 'piece', price: 160},    // 51–199 шт (Колонка 100)
            {max: 299, type: 'piece', price: 140},    // 200–299 шт (Колонка 200)
            {max: 499, type: 'piece', price: 110},    // 300–499 шт (Колонка 300)
            {max: 999, type: 'piece', price: 80},     // 500–999 шт (Колонка 500)
            {max: 1999, type: 'piece', price: 50},    // 1000–1999 шт (Колонка 1000)
            {max: 2999, type: 'piece', price: 45},    // 2000–2999 шт (Колонка 2000)
            {max: Infinity, type: 'piece', price: 35} // 3000+ шт (Колонка 3000)
        ],
        // Бутылки для воды, термосы, кружки
        bottles: [
            {max: 1, type: 'total', price: 3000},
            {max: 20, type: 'piece', price: 750},
            {max: 99, type: 'piece', price: 550},
            {max: 199, type: 'piece', price: 500},
            {max: 299, type: 'piece', price: 400},
            {max: 999, type: 'piece', price: 360},
            {max: 1999, type: 'piece', price: 350},
            {max: Infinity, type: 'piece', price: 320}
        ],
        // Ежедневники, блокноты
        diaries: [
            {max: 1, type: 'total', price: 3000},
            {max: 20, type: 'piece', price: 750},
            {max: 99, type: 'piece', price: 650},
            {max: 199, type: 'piece', price: 500},
            {max: 299, type: 'piece', price: 450},
            {max: 999, type: 'piece', price: 380},
            {max: 1999, type: 'piece', price: 350},
            {max: Infinity, type: 'piece', price: 300}
        ],
        // Флешки-визитки, повербанки
        powerbanks: [
            {max: 1, type: 'total', price: 2500},
            {max: 20, type: 'piece', price: 550},
            {max: 99, type: 'piece', price: 450},
            {max: 199, type: 'piece', price: 400},
            {max: 299, type: 'piece', price: 350},
            {max: 999, type: 'piece', price: 300},
            {max: 1999, type: 'piece', price: 220},
            {max: Infinity, type: 'piece', price: 180}
        ]
    },
    silkscreen: {
        // Светлые материалы (футболки, бейсболки)
        light: {
            colors_1: [
                {max: 1, type: 'total', price: 20000},
                {max: 50, type: 'total', price: 24000},
                {max: 199, type: 'piece', price: 280},
                {max: 299, type: 'piece', price: 260},
                {max: 999, type: 'piece', price: 240},
                {max: 1999, type: 'piece', price: 200},
                {max: Infinity, type: 'piece', price: 180}
            ],
            colors_2: [
                {max: 1, type: 'total', price: 30000},
                {max: 50, type: 'total', price: 44000},
                {max: 199, type: 'piece', price: 540},
                {max: 299, type: 'piece', price: 510},
                {max: 999, type: 'piece', price: 460},
                {max: 1999, type: 'piece', price: 380},
                {max: Infinity, type: 'piece', price: 340}
            ]
        },
        // Темные материалы (футболки, бейсболки)
        dark: {
            colors_1: [
                {max: 1, type: 'total', price: 20000},
                {max: 50, type: 'total', price: 26000},
                {max: 199, type: 'piece', price: 320},
                {max: 299, type: 'piece', price: 280},
                {max: 999, type: 'piece', price: 260},
                {max: 1999, type: 'piece', price: 250},
                {max: Infinity, type: 'piece', price: 220}
            ],
            colors_2: [
                {max: 1, type: 'total', price: 30000},
                {max: 50, type: 'total', price: 50000},
                {max: 199, type: 'piece', price: 680},
                {max: 299, type: 'piece', price: 540},
                {max: 999, type: 'piece', price: 500},
                {max: 1999, type: 'piece', price: 480},
                {max: Infinity, type: 'piece', price: 400}
            ]
        },
        // Ланьярды, шнуры для бейджей
        lanyards: {
            colors_1: [
                {max: 1, type: 'total', price: 15000},
                {max: 50, type: 'total', price: 22000},
                {max: 199, type: 'piece', price: 260},
                {max: 299, type: 'piece', price: 240},
                {max: 999, type: 'piece', price: 200},
                {max: 1999, type: 'piece', price: 160},
                {max: 2999, type: 'piece', price: 130},
                {max: Infinity, type: 'piece', price: 100}
            ],
            colors_2: [
                {max: 1, type: 'total', price: 25000},
                {max: 50, type: 'total', price: 40000},
                {max: 199, type: 'piece', price: 500},
                {max: 299, type: 'piece', price: 460},
                {max: 999, type: 'piece', price: 380},
                {max: 1999, type: 'piece', price: 300},
                {max: 2999, type: 'piece', price: 220},
                {max: Infinity, type: 'piece', price: 180}
            ]
        },
        // Пакеты полиэтиленовые
        bags: {
            colors_1: [
                {max: 1, type: 'total', price: 20000},
                {max: 50, type: 'total', price: 22000},
                {max: 199, type: 'piece', price: 260},
                {max: 299, type: 'piece', price: 220},
                {max: 999, type: 'piece', price: 190},
                {max: 1999, type: 'piece', price: 150},
                {max: 2999, type: 'piece', price: 120},
                {max: Infinity, type: 'piece', price: 100}
            ],
            colors_2: [
                {max: 1, type: 'total', price: 30000},
                {max: 50, type: 'total', price: 40000},
                {max: 199, type: 'piece', price: 520},
                {max: 299, type: 'piece', price: 400},
                {max: 999, type: 'piece', price: 340},
                {max: 1999, type: 'piece', price: 280},
                {max: 2999, type: 'piece', price: 200},
                {max: Infinity, type: 'piece', price: 190}
            ]
        }
    },
    dtf: {
        caps: [
            {max: 99, type: 'piece', price: 650},
            {max: 199, type: 'piece', price: 550},
            {max: 299, type: 'piece', price: 450},
            {max: 499, type: 'piece', price: 400},
            {max: 999, type: 'piece', price: 350},
            {max: 1999, type: 'piece', price: 300},
            {max: Infinity, type: 'piece', price: 280}
        ],
        shirts_small: [
            {max: 99, type: 'piece', price: 750},
            {max: 199, type: 'piece', price: 650},
            {max: 299, type: 'piece', price: 550},
            {max: 499, type: 'piece', price: 500},
            {max: 999, type: 'piece', price: 400},
            {max: 1999, type: 'piece', price: 350},
            {max: Infinity, type: 'piece', price: 320}
        ]
    }
};

const viplineOptionsMap = {
    uv: [
        {val: 'small_items', text: 'Ручки, брелоки, флешки'},
        {val: 'bottles', text: 'Бутылки, термосы, кружки'},
        {val: 'diaries', text: 'Ежедневники, блокноты'},
        {val: 'powerbanks', text: 'Флешки-визитки, повербанки'}
    ],
    silkscreen: [
        {val: 'light', text: 'Светлые материалы (футболки, бейсболки)'},
        {val: 'dark', text: 'Темные материалы (футболки, бейсболки)'},
        {val: 'lanyards', text: 'Ланьярды, шнуры для бейджей'},
        {val: 'bags', text: 'Полиэтиленовые пакеты'}
    ],
    dtf: [
        {val: 'caps', text: 'Бейсболки'},
        {val: 'shirts_small', text: 'Футболки (лого до 10см)'}
    ],
    dtf_area: [
        {val: 'baseball', text: 'Бейсболка'},
        {val: 'tshirt', text: 'Футболка'}
    ]
};

function calculateVipline(quantity) {
    let pType = $('#printType').val();
    let iType = $('#itemType').val();
    let totalCost = 0;

    // --- ДТФ ПО ПЛОЩАДИ (С динамической минималкой по реальному тиражу) ---
    if (pType === 'dtf_area') {
        let singleProductCost = 0;
        
        // Находим минимальный порог по тиражу из базовой таблицы ДТФ
        let dtfCategory = (iType === "baseball") ? "caps" : "shirts_small";
        let tiers = viplinePrices.dtf[dtfCategory];
        let activeTier = tiers ? tiers.find(t => quantity <= t.max) : null;
        let minPricePerUnit = activeTier ? activeTier.price : 0;

        // Перебираем все добавленные точки нанесения
        $('.dtf-point').each(function() {
            let w = Number($(this).find('.dtf-w').val()) || 0;
            let h = Number($(this).find('.dtf-h').val()) || 0;
            
            if (w > 0 && h > 0) {
                let area = (w / 10) * (h / 10); // Площадь в см²
                let printPriceForOne = area * 4 + 100; // Тариф: 4 тг/см² + 100 тг перенос
                
                // Если расчетная цена меньше минималки для данного тиража — берем минималку
                if (printPriceForOne < minPricePerUnit) {
                    printPriceForOne = minPricePerUnit;
                }
                singleProductCost += printPriceForOne;
            }
        });

        return Math.round(singleProductCost * quantity);
    }

    // --- СТАНДАРТНАЯ ЛОГИКА (УФ, Шелкография, классический ДТФ) ---
    let colors = $('#colors').val();
    let tiers = (pType === 'uv' || pType === 'dtf') 
        ? viplinePrices[pType]?.[iType] 
        : viplinePrices[pType]?.[iType]?.[colors];

    if (tiers) {
        let tier = tiers.find(t => quantity <= t.max);
        if (tier) {
            totalCost = tier.type === 'total' ? tier.price : tier.price * quantity;
            
            // Защита от провала ниже минималки (пробника/фикса)
            if (tiers[0].type === 'total' && totalCost < tiers[0].price) {
                totalCost = tiers[0].price;
            }
        }
    }
    return totalCost;
}