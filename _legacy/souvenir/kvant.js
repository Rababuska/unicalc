// ==========================================
// БАЗА ТАРИФОВ И ЛОГИКА КВАНТ (Гравировка + УФ-печать, с НДС)
// ==========================================

const kvantPrices = {
    // ------------------------------------------
    // ГРАВИРОВКА
    // ------------------------------------------
    circular_30: [
        { max: 1, price: 5000 },
        { max: 10, price: 1000 },
        { max: 25, price: 750 },
        { max: 50, price: 700 },
        { max: 100, price: 650 },
        { max: 199, price: 550 },
        { max: 299, price: 500 },
        { max: 499, price: 450 },
        { max: 999, price: 425 },
        { max: 1999, price: 400 },
        { max: Infinity, price: 350 }
    ],
    circular_100: [
        { max: 1, price: 5000 },
        { max: 10, price: 1500 },
        { max: 25, price: 1000 },
        { max: 50, price: 950 },
        { max: 100, price: 900 },
        { max: 199, price: 850 },
        { max: 299, price: 800 },
        { max: 499, price: 750 },
        { max: 999, price: 725 },
        { max: 1999, price: 700 },
        { max: Infinity, price: 600 }
    ],
    pens_metal: [
        { max: 1, price: 2000 },
        { max: 10, price: 500 },
        { max: 25, price: 400 },
        { max: 50, price: 300 },
        { max: 100, price: 250 },
        { max: 199, price: 200 },
        { max: 299, price: 150 },
        { max: 499, price: 140 },
        { max: 999, price: 110 },
        { max: 1999, price: 90 },
        { max: Infinity, price: 70 }
    ],
    pens_plastic: [
        { max: 1, price: 2500 },
        { max: 10, price: 600 },
        { max: 25, price: 500 },
        { max: 50, price: 400 },
        { max: 100, price: 350 },
        { max: 199, price: 300 },
        { max: 299, price: 250 },
        { max: 499, price: 200 },
        { max: 999, price: 150 },
        { max: 1999, price: 120 },
        { max: Infinity, price: 90 }
    ],
    pens_glossy: [
        { max: 1, price: 3000 },
        { max: 10, price: 700 },
        { max: 25, price: 600 },
        { max: 50, price: 500 },
        { max: 100, price: 450 },
        { max: 199, price: 400 },
        { max: 299, price: 350 },
        { max: 499, price: 300 },
        { max: 999, price: 250 },
        { max: 1999, price: 200 },
        { max: Infinity, price: 150 }
    ],
    powerbanks: [
        { max: 1, price: 3000 },
        { max: 10, price: 1000 },
        { max: 25, price: 850 },
        { max: 50, price: 800 },
        { max: 100, price: 750 },
        { max: 199, price: 600 },
        { max: 299, price: 550 },
        { max: 499, price: 500 },
        { max: 999, price: 450 },
        { max: 1999, price: 400 },
        { max: Infinity, price: 350 }
    ],
    flash_drives: [
        { max: 1, price: 2500 },
        { max: 10, price: 700 },
        { max: 25, price: 500 },
        { max: 50, price: 400 },
        { max: 100, price: 350 },
        { max: 199, price: 300 },
        { max: 299, price: 250 },
        { max: 499, price: 200 },
        { max: 999, price: 150 },
        { max: 1999, price: 130 },
        { max: Infinity, price: 100 }
    ],
    keychains: [
        { max: 1, price: 2000 },
        { max: 10, price: 600 },
        { max: 25, price: 450 },
        { max: 50, price: 350 },
        { max: 100, price: 300 },
        { max: 199, price: 250 },
        { max: 299, price: 200 },
        { max: 499, price: 180 },
        { max: 999, price: 150 },
        { max: 1999, price: 120 },
        { max: Infinity, price: 100 }
    ],
    backpacks_plate: [
        { max: 1, price: 3000 },
        { max: 10, price: 1000 },
        { max: 25, price: 850 },
        { max: 50, price: 700 },
        { max: 100, price: 600 },
        { max: 199, price: 500 },
        { max: 299, price: 450 },
        { max: 499, price: 400 },
        { max: 999, price: 350 },
        { max: 1999, price: 300 },
        { max: Infinity, price: 250 }
    ],
    backpacks_body: [
        { max: 1, price: 4000 },
        { max: 10, price: 1500 },
        { max: 25, price: 1200 },
        { max: 50, price: 1000 },
        { max: 100, price: 850 },
        { max: 199, price: 750 },
        { max: 299, price: 700 },
        { max: 499, price: 650 },
        { max: 999, price: 600 },
        { max: 1999, price: 550 },
        { max: Infinity, price: 500 }
    ],
    awards: [
        { max: 1, price: 5000 },
        { max: 50, price: 3000 },
        { max: 100, price: 2500 },
        { max: 199, price: 2000 },
        { max: 299, price: 1500 },
        { max: 499, price: 1200 },
        { max: 999, price: 1000 },
        { max: 1999, price: 800 },
        { max: Infinity, price: 600 }
    ],

    // ------------------------------------------
    // 8. УФ-ПЕЧАТЬ (КВАНТ, с НДС)
    // ------------------------------------------
    uv_pens: [
        { max: 10, price: 360 },
        { max: 30, price: 280 },
        { max: 50, price: 240 },
        { max: 100, price: 200 },
        { max: 300, price: 160 },
        { max: 500, price: 140 },
        { max: 1000, price: 120 },
        { max: 2000, price: 100 },
        { max: Infinity, price: 80 }
    ],
    uv_notebooks: [
        { max: 10, price: 700 },
        { max: 25, price: 550 },
        { max: 50, price: 450 },
        { max: 100, price: 400 },
        { max: 200, price: 375 },
        { max: Infinity, price: 350 }
    ],
    uv_bottles: [
        { max: 10, price: 1200 },
        { max: 25, price: 950 },
        { max: 50, price: 550 },
        { max: 100, price: 450 },
        { max: 200, price: 400 },
        { max: 500, price: 375 },
        { max: Infinity, price: 350 }
    ]
};
