// ==========================================
// БАЗА ТАРИФОВ И ЛОГИКА: РЕКЛАМНАЯ КУХНЯ (УФ-печать, с НДС)
// ==========================================

const kitchenPrices = {
    // 1. Ручки, карандаши, брелоки, флешки, зажигалки и мелкие сувениры
    small_items: [
        { max: 10, price: 660 },
        { max: 50, price: 320 },
        { max: 100, price: 200 },
        { max: Infinity, price: 165 }
    ],

    // 2. Медали, бейджи, номерки и т.д.
    badges_medals: [
        { max: 10, price: 920 },
        { max: 50, price: 390 },
        { max: 100, price: 240 },
        { max: Infinity, price: 200 }
    ],

    // 3. Ежедневники, блокноты, powerbank (размер А5 до 15х15 см)
    diaries_powerbanks: [
        { max: 10, price: 1050 },
        { max: 50, price: 610 },
        { max: 100, price: 540 },
        { max: Infinity, price: 515 }
    ],

    // 4. Термокружки, термосы, бокалы, елочные шары и т.д.
    bottles_mugs: [
        { max: 10, price: 1900 },
        { max: 50, price: 940 },
        { max: 100, price: 580 },
        { max: Infinity, price: 540 }
    ],

    // 5. Чехлы для смартфонов
    phone_cases: [
        { max: 10, price: 2800 },
        { max: 50, price: 1900 },
        { max: 100, price: 1300 },
        { max: Infinity, price: 990 }
    ]
};

function calculateKitchen(type, quantity) {
    let tiers = kitchenPrices[type];
    if (!tiers) return 0;

    let tier = tiers.find(t => quantity <= t.max);
    if (!tier) return 0;

    return tier.price * quantity;
}
