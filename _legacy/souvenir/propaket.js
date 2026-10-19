// ==========================================
// БАЗА ДАННЫХ И ТАРИФЫ PROPAKET
// ==========================================

const propaketCatalog = [
    {
        id: 'pvd_white',
        name: 'Пакеты ПВД (Белые)',
        keywords: 'пакет полиэтиленовый пвд белый шелкография',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "200x240 мм (вертикальный)": { w: 200, h: 240, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 100}, {max: 499, p: 95}, {max: Infinity, p: 90}] },
            "250x350 мм (вертикальный)": { w: 250, h: 350, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 120}, {max: 499, p: 110}, {max: Infinity, p: 100}] },
            "300x400 мм (вертикальный)": { w: 300, h: 400, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 130}, {max: 499, p: 120}, {max: Infinity, p: 110}] },
            "380x530 (400x500) мм (вертикальный)": { w: 380, h: 530, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 140}, {max: 499, p: 130}, {max: Infinity, p: 120}] },
            "500x600 мм (вертикальный)": { w: 500, h: 600, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 180}, {max: 499, p: 170}, {max: Infinity, p: 160}] },
            "600x630 мм (вертикальный)": { w: 600, h: 630, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 190}, {max: 499, p: 180}, {max: Infinity, p: 170}] }
        }
    },
    {
        id: 'pvd_color',
        name: 'Пакеты ПВД (Цветные / Черные)',
        keywords: 'пакет полиэтиленовый пвд цветной черный шелкография',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "200x240 мм (вертикальный)": { w: 200, h: 240, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 110}, {max: 499, p: 105}, {max: 4999, p: 100}, {max: Infinity, p: 37}] },
            "250x350 мм (вертикальный)": { w: 250, h: 350, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 130}, {max: 499, p: 120}, {max: 4999, p: 110}, {max: Infinity, p: 42}] },
            "300x400 мм (вертикальный)": { w: 300, h: 400, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 140}, {max: 499, p: 130}, {max: 4999, p: 120}, {max: Infinity, p: 47}] },
            "380x530 (400x500) мм (вертикальный)": { w: 380, h: 530, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 150}, {max: 499, p: 140}, {max: 4999, p: 130}, {max: Infinity, p: 61}] },
            "500x600 мм (вертикальный)": { w: 500, h: 600, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 190}, {max: 499, p: 180}, {max: 4999, p: 170}, {max: Infinity, p: 85}] },
            "600x630 мм (вертикальный)": { w: 600, h: 630, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 200}, {max: 499, p: 190}, {max: 4999, p: 180}, {max: Infinity, p: 87}] }
        }
    },
    {
        id: 'paper_white_black',
        name: 'Бумажные пакеты плотные 260 гр (Белые / Черные)',
        keywords: 'пакет бумажный плотный припресс 260 белый черный',
        colorPriceStep: 45, maxColors: 3, defaultQty: 24, minQty: 24,
        sizes: {
            "120x160x70 мм (вертикальный)": { w: 120, h: 160, d: 70, orient: "вертикальный", tiers: [{max: 48, p: 340}, {max: 180, p: 330}, {max: Infinity, p: 310}] },
            "180x230x100 мм (вертикальный)": { w: 180, h: 230, d: 100, orient: "вертикальный", tiers: [{max: 48, p: 415}, {max: 180, p: 395}, {max: Infinity, p: 380}] },
            "230x180x100 мм (горизонтальный)": { w: 230, h: 180, d: 100, orient: "горизонтальный", tiers: [{max: 48, p: 415}, {max: 180, p: 395}, {max: Infinity, p: 380}] },
            "260x320x110 мм (вертикальный)": { w: 260, h: 320, d: 110, orient: "вертикальный", tiers: [{max: 48, p: 550}, {max: 180, p: 530}, {max: Infinity, p: 510}] },
            "320x260x110 мм (горизонтальный)": { w: 320, h: 260, d: 110, orient: "горизонтальный", tiers: [{max: 48, p: 550}, {max: 180, p: 530}, {max: Infinity, p: 510}] },
            "320x380x120 (300x400) мм (вертикальный)": { w: 320, h: 380, d: 120, orient: "вертикальный", tiers: [{max: 48, p: 685}, {max: 180, p: 670}, {max: Infinity, p: 640}] },
            "380x320x120 (400x300) мм (горизонтальный)": { w: 380, h: 320, d: 120, orient: "горизонтальный", tiers: [{max: 48, p: 685}, {max: 180, p: 670}, {max: Infinity, p: 640}] },
            "470x360x150 мм (горизонтальный)": { w: 470, h: 360, d: 150, orient: "горизонтальный", tiers: [{max: 48, p: 925}, {max: 180, p: 910}, {max: Infinity, p: 890}] },
            "550x450x150 мм (горизонтальный)": { w: 550, h: 450, d: 150, orient: "горизонтальный", tiers: [{max: 48, p: 1255}, {max: 180, p: 1180}, {max: Infinity, p: 1130}] },
            "600x400x220 мм (горизонтальный)": { w: 600, h: 400, d: 220, orient: "горизонтальный", tiers: [{max: 48, p: 1255}, {max: 180, p: 1180}, {max: Infinity, p: 1130}] }
        }
    },
    {
        id: 'paper_color',
        name: 'Бумажные пакеты плотные 260 гр (Цветные горизонтальные)',
        keywords: 'пакет бумажный плотный цветной горизонтальный припресс 260',
        colorPriceStep: 45, maxColors: 3, defaultQty: 60, minQty: 60,
        sizes: {
            "150x140x70 мм (горизонтальный)": { w: 150, h: 140, d: 70, orient: "горизонтальный", tiers: [{max: 204, p: 330}, {max: 324, p: 310}, {max: 444, p: 290}, {max: Infinity, p: 270}] },
            "230x180x100 мм (горизонтальный)": { w: 230, h: 180, d: 100, orient: "горизонтальный", tiers: [{max: 204, p: 395}, {max: 324, p: 375}, {max: 444, p: 355}, {max: Infinity, p: 335}] },
            "320x260x110 мм (горизонтальный)": { w: 320, h: 260, d: 110, orient: "горизонтальный", tiers: [{max: 204, p: 530}, {max: 324, p: 510}, {max: 444, p: 490}, {max: Infinity, p: 470}] },
            "380x320x120 (400x300) мм (горизонтальный)": { w: 380, h: 320, d: 120, orient: "горизонтальный", tiers: [{max: 204, p: 670}, {max: 324, p: 650}, {max: 444, p: 630}, {max: Infinity, p: 610}] }
        }
    },
    {
        id: 'paper_square',
        name: 'Бумажные квадратные пакеты (Коричневый / Белый)',
        keywords: 'пакет бумажный квадратный 25х25 30х30 коричневый белый',
        colorPriceStep: 45, maxColors: 3, defaultQty: 108, minQty: 108,
        sizes: {
            "250x250x250 мм (квадратный)": { w: 250, h: 250, d: 250, orient: "квадратный", tiers: [{max: 204, p: 1150}, {max: 324, p: 1130}, {max: 444, p: 1110}, {max: Infinity, p: 1060}] },
            "300x300x300 мм (квадратный)": { w: 300, h: 300, d: 300, orient: "квадратный", tiers: [{max: 204, p: 1250}, {max: 324, p: 1220}, {max: 444, p: 1190}, {max: Infinity, p: 1150}] }
        }
    },
    {
        id: 'paper_fullcolor',
        name: 'Плотные полноцветные пакеты (Картон / Ламинация)',
        keywords: 'пакет полноцветный картон печать ламинация индивидуальный',
        colorPriceStep: 0, maxColors: 1, defaultQty: 50, minQty: 50,
        sizes: {
            "170x150x70 мм (Без полной заливки)": { w: 170, h: 150, d: 70, orient: "вертикальный", tiers: [{max: Infinity, p: 800}] },
            "170x150x70 мм (С полной заливкой)": { w: 170, h: 150, d: 70, orient: "вертикальный", tiers: [{max: Infinity, p: 1090}] },
            "150x210x80 мм (Без полной заливки)": { w: 150, h: 210, d: 80, orient: "вертикальный", tiers: [{max: Infinity, p: 800}] },
            "150x210x80 мм (С полной заливкой)": { w: 150, h: 210, d: 80, orient: "вертикальный", tiers: [{max: Infinity, p: 1090}] },
            "230x340x70 мм (Без полной заливки)": { w: 230, h: 340, d: 70, orient: "вертикальный", tiers: [{max: Infinity, p: 970}] },
            "230x340x70 мм (С полной заливкой)": { w: 230, h: 340, d: 70, orient: "вертикальный", tiers: [{max: Infinity, p: 1370}] },
            "250x350x100 мм (Без полной заливки)": { w: 250, h: 350, d: 100, orient: "вертикальный", tiers: [{max: Infinity, p: 1220}] },
            "250x350x100 мм (С полной заливкой)": { w: 250, h: 350, d: 100, orient: "вертикальный", tiers: [{max: Infinity, p: 1770}] },
            "280x410x150 мм (Без полной заливки)": { w: 280, h: 410, d: 150, orient: "вертикальный", tiers: [{max: Infinity, p: 1910}] },
            "280x410x150 мм (С полной заливкой)": { w: 280, h: 410, d: 150, orient: "вертикальный", tiers: [{max: Infinity, p: 2210}] },
            "330x220x70 мм (вертикальный)": { w: 330, h: 220, d: 70, orient: "вертикальный", tiers: [{max: 99, p: 1605}, {max: 199, p: 1270}, {max: Infinity, p: 870}] }
        }
    },
    {
        id: 'kraft_brown',
        name: 'Крафт пакет с ручками 80 гр (Бурый)',
        keywords: 'крафт пакет бурый с ручками стандартный 80',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "220x250x120 мм (вертикальный)": { w: 220, h: 250, d: 120, orient: "вертикальный", tiers: [{max: 499, p: 170}, {max: 1999, p: 155}, {max: Infinity, p: 145}] },
            "240x280x140 мм (вертикальный)": { w: 240, h: 280, d: 140, orient: "вертикальный", tiers: [{max: 499, p: 175}, {max: 1999, p: 165}, {max: Infinity, p: 155}] },
            "260x350x150 мм (вертикальный)": { w: 260, h: 350, d: 150, orient: "вертикальный", tiers: [{max: 499, p: 180}, {max: 1999, p: 170}, {max: Infinity, p: 155}] },
            "320x370x200 мм (вертикальный)": { w: 320, h: 370, d: 200, orient: "вертикальный", tiers: [{max: 499, p: 200}, {max: 1999, p: 190}, {max: Infinity, p: 180}] },
            "350x450x150 мм (вертикальный)": { w: 350, h: 450, d: 150, orient: "вертикальный", tiers: [{max: 499, p: 205}, {max: 1999, p: 195}, {max: Infinity, p: 185}] }
        }
    },
    {
        id: 'kraft_white',
        name: 'Крафт пакет с ручками 80 гр (Белый)',
        keywords: 'крафт пакет белый с ручками стандартный 80',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "220x250x120 мм (вертикальный)": { w: 220, h: 250, d: 120, orient: "вертикальный", tiers: [{max: 499, p: 190}, {max: 1999, p: 175}, {max: Infinity, p: 165}] },
            "240x280x140 мм (вертикальный)": { w: 240, h: 280, d: 140, orient: "вертикальный", tiers: [{max: 499, p: 195}, {max: 1999, p: 185}, {max: Infinity, p: 175}] },
            "260x350x150 мм (вертикальный)": { w: 260, h: 350, d: 150, orient: "вертикальный", tiers: [{max: 499, p: 200}, {max: 1999, p: 190}, {max: Infinity, p: 180}] },
            "320x370x200 мм (вертикальный)": { w: 320, h: 370, d: 200, orient: "вертикальный", tiers: [{max: 499, p: 225}, {max: 1999, p: 215}, {max: Infinity, p: 205}] },
            "350x450x150 мм (вертикальный)": { w: 350, h: 450, d: 150, orient: "вертикальный", tiers: [{max: 499, p: 235}, {max: 1999, p: 225}, {max: Infinity, p: 215}] }
        }
    },
    {
        id: 'kraft_horizontal',
        name: 'Крафт пакет плотный (Горизонтальный)',
        keywords: 'крафт пакет горизонтальный плотный белый бурый ручки',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "320x250x110 мм (горизонтальный)": { w: 320, h: 250, d: 110, orient: "горизонтальный", tiers: [{max: 499, p: 265}, {max: 1999, p: 255}, {max: Infinity, p: 245}] },
            "400x310x130 мм (горизонтальный)": { w: 400, h: 310, d: 130, orient: "горизонтальный", tiers: [{max: 499, p: 375}, {max: 1999, p: 365}, {max: Infinity, p: 355}] }
        }
    },
    {
        id: 'kraft_color',
        name: 'Крафт пакет цветной',
        keywords: 'крафт пакет цветной ручки цвета уточнять',
        colorPriceStep: 45, maxColors: 3, defaultQty: 108, minQty: 108,
        sizes: {
            "120x160 мм (вертикальный)": { w: 120, h: 160, d: 0, orient: "вертикальный", tiers: [{max: 504, p: 215}, {max: 2004, p: 205}, {max: Infinity, p: 195}] },
            "160x220 мм (вертикальный)": { w: 160, h: 220, d: 0, orient: "вертикальный", tiers: [{max: 504, p: 235}, {max: 2004, p: 225}, {max: Infinity, p: 215}] },
            "220x270 мм (вертикальный)": { w: 220, h: 270, d: 0, orient: "вертикальный", tiers: [{max: 504, p: 265}, {max: 2004, p: 255}, {max: Infinity, p: 245}] },
            "260x320 мм (вертикальный)": { w: 260, h: 320, d: 0, orient: "вертикальный", tiers: [{max: 504, p: 285}, {max: 2004, p: 275}, {max: Infinity, p: 265}] },
            "320x260 мм (горизонтальный)": { w: 320, h: 260, d: 0, orient: "горизонтальный", tiers: [{max: 504, p: 285}, {max: 2004, p: 275}, {max: Infinity, p: 265}] },
            "310x410 мм (вертикальный)": { w: 310, h: 410, d: 0, orient: "вертикальный", tiers: [{max: 504, p: 305}, {max: 2004, p: 295}, {max: Infinity, p: 285}] },
            "410x310 мм (горизонтальный)": { w: 410, h: 310, d: 0, orient: "горизонтальный", tiers: [{max: 504, p: 305}, {max: 2004, p: 295}, {max: Infinity, p: 285}] },
            "440x400 мм (горизонтальный)": { w: 440, h: 400, d: 0, orient: "горизонтальный", tiers: [{max: 504, p: 385}, {max: 2004, p: 375}, {max: Infinity, p: 365}] }
        }
    },
    {
        id: 'kraft_no_handles_brown',
        name: 'Крафт пакет без ручек (Бурый)',
        keywords: 'крафт без ручек бурый фасовка еда на вынос саше',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "80x50x170 мм (бурый)": { w: 80, h: 170, d: 50, orient: "вертикальный", tiers: [{max: 199, p: 69}, {max: Infinity, p: 65}] },
            "180x120x290 мм (бурый)": { w: 180, h: 290, d: 120, orient: "вертикальный", tiers: [{max: 199, p: 102}, {max: Infinity, p: 97}] },
            "220x120x290 мм (бурый)": { w: 220, h: 290, d: 120, orient: "вертикальный", tiers: [{max: 199, p: 103}, {max: Infinity, p: 99}] },
            "260x150x340 мм (бурый)": { w: 260, h: 340, d: 150, orient: "вертикальный", tiers: [{max: 199, p: 171}, {max: Infinity, p: 165}] },
            "240x140x400 мм (бурый)": { w: 240, h: 400, d: 140, orient: "вертикальный", tiers: [{max: 199, p: 203}, {max: Infinity, p: 195}] },
            "320x200x340 мм (бурый)": { w: 320, h: 340, d: 200, orient: "вертикальный", tiers: [{max: 199, p: 250}, {max: Infinity, p: 245}] }
        }
    },
    {
        id: 'kraft_no_handles_white',
        name: 'Крафт пакет без ручек (Белый)',
        keywords: 'крафт без ручек белый фасовка еда выпечка',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "80x50x170 мм (белый)": { w: 80, h: 170, d: 50, orient: "вертикальный", tiers: [{max: 199, p: 95}, {max: Infinity, p: 90}] },
            "180x120x290 мм (белый)": { w: 180, h: 290, d: 120, orient: "вертикальный", tiers: [{max: 199, p: 198}, {max: Infinity, p: 191}] },
            "260x150x340 мм (белый)": { w: 260, h: 340, d: 150, orient: "вертикальный", tiers: [{max: 199, p: 265}, {max: Infinity, p: 260}] }
        }
    },
    {
        id: 'zip_white',
        name: 'Слайдер / Zip пакеты (Белые матовые)',
        keywords: 'зип zip слайдер пакет замок бегунок белый матовый одежда купальники',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "110x220 мм": { w: 110, h: 220, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 170}, {max: 499, p: 150}, {max: Infinity, p: 140}] },
            "140x200 мм": { w: 140, h: 200, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 155}, {max: 499, p: 135}, {max: Infinity, p: 125}] },
            "150x240 мм": { w: 150, h: 240, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 160}, {max: 499, p: 140}, {max: Infinity, p: 130}] },
            "170x250 мм": { w: 170, h: 250, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 160}, {max: 499, p: 140}, {max: Infinity, p: 130}] },
            "200x300 мм": { w: 200, h: 300, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 170}, {max: 499, p: 150}, {max: Infinity, p: 140}] },
            "250x350 мм": { w: 250, h: 350, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 180}, {max: 499, p: 160}, {max: Infinity, p: 150}] },
            "300x400 мм": { w: 300, h: 400, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 200}, {max: 499, p: 180}, {max: Infinity, p: 170}] },
            "350x450 мм": { w: 350, h: 450, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 210}, {max: 499, p: 190}, {max: Infinity, p: 180}] },
            "400x500 мм": { w: 400, h: 500, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 240}, {max: 499, p: 220}, {max: Infinity, p: 210}] }
        }
    },
    {
        id: 'zip_black',
        name: 'Слайдер / Zip пакеты (Черные)',
        keywords: 'зип zip слайдер пакет черный замок бегунок одежда',
        colorPriceStep: 45, maxColors: 1, defaultQty: 100, minQty: 100,
        sizes: {
            "170x250 мм (горизонтальный)": { w: 250, h: 170, d: 0, orient: "горизонтальный", tiers: [{max: 199, p: 165}, {max: 499, p: 150}, {max: Infinity, p: 140}] },
            "250x350 мм": { w: 250, h: 350, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 200}, {max: 499, p: 185}, {max: Infinity, p: 175}] },
            "300x400 мм": { w: 300, h: 400, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 210}, {max: 499, p: 195}, {max: Infinity, p: 185}] }
        }
    },
    {
        id: 'zip_pink',
        name: 'Слайдер / Zip пакеты (Розовые)',
        keywords: 'зип zip слайдер пакет розовый замок бегунок',
        colorPriceStep: 45, maxColors: 1, defaultQty: 100, minQty: 100,
        sizes: {
            "200x250 мм": { w: 200, h: 250, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 170}, {max: 499, p: 155}, {max: Infinity, p: 145}] },
            "300x400 мм": { w: 300, h: 400, d: 0, orient: "вертикальный", tiers: [{max: 199, p: 210}, {max: 499, p: 195}, {max: Infinity, p: 185}] }
        }
    },
    {
        id: 'transparent_bags',
        name: 'Прозрачные пакеты с ручками',
        keywords: 'пакет прозрачный прозрачные ручки пвх силикон',
        colorPriceStep: 45, maxColors: 3, defaultQty: 108, minQty: 108,
        sizes: {
            "150x110x70 мм": { w: 150, h: 110, d: 70, orient: "горизонтальный", tiers: [{max: 204, p: 650}, {max: 324, p: 630}, {max: 444, p: 610}, {max: Infinity, p: 590}] },
            "200x130x70 мм": { w: 200, h: 130, d: 70, orient: "горизонтальный", tiers: [{max: 204, p: 710}, {max: 324, p: 690}, {max: 444, p: 670}, {max: Infinity, p: 650}] },
            "200x180x70 мм": { w: 200, h: 180, d: 70, orient: "вертикальный", tiers: [{max: 204, p: 750}, {max: 324, p: 730}, {max: 444, p: 710}, {max: Infinity, p: 690}] },
            "250x200x70 мм (горизонтальный)": { w: 250, h: 200, d: 70, orient: "горизонтальный", tiers: [{max: 204, p: 830}, {max: 324, p: 810}, {max: 444, p: 790}, {max: Infinity, p: 770}] },
            "280x210x80 мм": { w: 280, h: 210, d: 80, orient: "горизонтальный", tiers: [{max: 204, p: 970}, {max: 324, p: 950}, {max: 444, p: 930}, {max: Infinity, p: 910}] },
            "320x260x90 мм": { w: 320, h: 260, d: 90, orient: "горизонтальный", tiers: [{max: 204, p: 990}, {max: 324, p: 970}, {max: 444, p: 950}, {max: Infinity, p: 930}] }
        }
    },
    {
        id: 'mayechka',
        name: 'Пакеты «Маечка»',
        keywords: 'маечка пакет полиэтиленовый майка маркет магазин ручки',
        colorPriceStep: 1.5, maxColors: 3, defaultQty: 10000, minQty: 10000,
        sizes: {
            "270x450 мм (12 мкр)": { w: 270, h: 450, d: 0, orient: "вертикальный", tiers: [{max: Infinity, p: 13}] },
            "300x550 мм (14 мкр)": { w: 300, h: 550, d: 0, orient: "вертикальный", tiers: [{max: Infinity, p: 16}] },
            "320x600 мм (17.5 мкр)": { w: 320, h: 600, d: 0, orient: "вертикальный", tiers: [{max: Infinity, p: 21.5}] },
            "450x600 мм (20 мкр)": { w: 450, h: 600, d: 0, orient: "вертикальный", tiers: [{max: Infinity, p: 32}] },
            "450x700 мм (20 мкр)": { w: 450, h: 700, d: 0, orient: "вертикальный", tiers: [{max: Infinity, p: 39}] },
            "500x700 мм (25 мкр)": { w: 500, h: 700, d: 0, orient: "вертикальный", tiers: [{max: Infinity, p: 50.5}] }
        }
    },
    {
        id: 'boxes',
        name: 'Коробки самосборные с откидной крышкой',
        keywords: 'коробка коробки печать откидная крышка самосборная упаковка крафт',
        colorPriceStep: 45, maxColors: 3, defaultQty: 100, minQty: 100,
        sizes: {
            "90x90x30 мм (Белый / Бурый)": { w: 90, h: 90, d: 30, orient: "квадратный", tiers: [{max: 199, p: 380}, {max: Infinity, p: 350}] },
            "230x170x80 мм (Белый / Бурый)": { w: 230, h: 170, d: 80, orient: "горизонтальный", tiers: [{max: 199, p: 640}, {max: Infinity, p: 610}] },
            "230x170x80 мм (Цветная)": { w: 230, h: 170, d: 80, orient: "горизонтальный", tiers: [{max: 199, p: 930}, {max: Infinity, p: 910}] },
            "310x210x100 (80) мм (Белый / Бурый)": { w: 310, h: 210, d: 100, orient: "горизонтальный", tiers: [{max: 199, p: 820}, {max: Infinity, p: 800}] },
            "310x210x80 мм (Цветная)": { w: 310, h: 210, d: 80, orient: "горизонтальный", tiers: [{max: 199, p: 1300}, {max: Infinity, p: 1280}] }
        }
    },
    {
        id: 'tissue',
        name: 'Тишью упаковочная бумага с печатью',
        keywords: 'тишью бумага упаковка упаковочная печать логотипа 20гр',
        colorPriceStep: 0, maxColors: 1, defaultQty: 100, minQty: 50,
        sizes: {
            "510x665 мм (Плотность 20 гр, 1 цвет)": { w: 510, h: 665, d: 0, orient: "листовая", tiers: [{max: 99, p: 320}, {max: 199, p: 250}, {max: 499, p: 245}, {max: Infinity, p: 240}] }
        }
    },
    {
        id: 'ribbons',
        name: 'Ленты сатиновые и силиконовые с печатью (за метр)',
        keywords: 'лента ленты сатиновая сатин матовая классик силиконовая',
        colorPriceStep: 0, maxColors: 1, defaultQty: 100, minQty: 100,
        sizes: {
            "Сатиновая матовая 15 мм (цена/м)": { w: 15, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 175}, {max: 399, p: 170}, {max: Infinity, p: 165}] },
            "Сатиновая матовая 20 мм (цена/м)": { w: 20, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 185}, {max: 399, p: 175}, {max: Infinity, p: 170}] },
            "Сатиновая классик 15 мм (цена/м)": { w: 15, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 175}, {max: 399, p: 170}, {max: Infinity, p: 160}] },
            "Сатиновая классик 20 мм (цена/м)": { w: 20, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 185}, {max: 399, p: 180}, {max: Infinity, p: 170}] },
            "Сатиновая классик 25 мм (цена/м)": { w: 25, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 190}, {max: 399, p: 185}, {max: Infinity, p: 175}] },
            "Сатиновая классик 30 мм (цена/м)": { w: 30, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 215}, {max: 399, p: 210}, {max: Infinity, p: 200}] },
            "Силиконовая 20 мм (цена/м)": { w: 20, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 350}, {max: 399, p: 345}, {max: Infinity, p: 335}] },
            "Силиконовая 25 мм (цена/м)": { w: 25, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 405}, {max: 399, p: 395}, {max: Infinity, p: 385}] },
            "Силиконовая 30 мм (цена/м)": { w: 30, h: 1000, d: 0, orient: "рулон", tiers: [{max: 199, p: 460}, {max: 399, p: 455}, {max: Infinity, p: 440}] }
        }
    }
];

function calculatePropaketItem(product, sizeKey, qty, frontColors, backColors, addHandle, addBow, boxInside) {
    if (!product || !product.sizes[sizeKey]) return { cost: 0, unitPrice: 0, calcQty: qty, meta: null };
    
    let meta = product.sizes[sizeKey];
    
    let minQty = product.minQty || 1;
    if (product.id === 'mayechka' && (frontColors + backColors) >= 3) {
        minQty = 30000;
    }

    let calcQty = qty < minQty ? minQty : qty;
    let tiers = meta.tiers;
    let tier = tiers.find(t => calcQty <= t.max);
    
    if (!tier) return { cost: 0, unitPrice: 0, calcQty: calcQty, meta: meta };
    
    let basePrice = tier.p;
    let extraColors = (frontColors - 1) + backColors;
    if (extraColors < 0) extraColors = 0;
    let extraCost = extraColors * (product.colorPriceStep || 0);

    let extraOptionsCost = 0;
    if (addHandle) extraOptionsCost += 100;
    if (addBow) extraOptionsCost += 100;

    let boxInsideCost = 0;
    if (product.id === 'boxes') {
        if (boxInside === 'same') boxInsideCost = 45;
        else if (boxInside === 'diff') boxInsideCost = 90;
    }
    
    let unitPrice = basePrice + extraCost + extraOptionsCost + boxInsideCost;
    return {
        unitPrice: unitPrice,
        cost: unitPrice * calcQty,
        calcQty: calcQty,
        minQty: minQty,
        meta: meta
    };
}
