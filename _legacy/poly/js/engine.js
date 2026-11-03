// ==========================================================================
// ЯДРО РАСЧЕТОВ И ДИСПЕТЧЕР ПРОДУКТОВ (js/engine.js)
// ==========================================================================

window.ProductModules = window.ProductModules || {};

const CalcEngine = {
    // 1. Геометрическая раскладка на листе
    calcYield: function(netW, netH, paperW, paperH, gapX, gapY, outerBleed, margins) {
        let usableW = paperW - margins;
        let usableH = paperH - margins;

        let calcN = (paperUsable, itemNet, currentGap) => {
            if (paperUsable < itemNet + 2 * outerBleed) return 0;
            return Math.floor((paperUsable + currentGap - 2 * outerBleed) / (itemNet + currentGap));
        };

        let opt1 = calcN(usableW, netW, gapX) * calcN(usableH, netH, gapY);
        let opt2 = calcN(usableW, netH, gapX) * calcN(usableH, netW, gapY);
        return Math.max(opt1, opt2);
    },

    // 2. Детализированная раскладка с координатами элементов
    calcYieldDetailed: function(netW, netH, paperW, paperH, gapX, gapY, outerBleed, margins) {
        let usableW = paperW - margins;
        let usableH = paperH - margins;

        let calcN = (paperUsable, itemNet, currentGap) => {
            if (paperUsable < itemNet + 2 * outerBleed) return 0;
            return Math.floor((paperUsable + currentGap - 2 * outerBleed) / (itemNet + currentGap));
        };

        let cols1 = calcN(usableW, netW, gapX), rows1 = calcN(usableH, netH, gapY);
        let cols2 = calcN(usableW, netH, gapX), rows2 = calcN(usableH, netW, gapY);
        let opt1Count = cols1 * rows1, opt2Count = cols2 * rows2;

        let bestCols = cols1, bestRows = rows1, rotated = false;
        if (opt2Count > opt1Count) {
            bestCols = cols2; bestRows = rows2; rotated = true;
        }
        let maxYield = Math.max(opt1Count, opt2Count);

        let items = [];
        if (maxYield > 0) {
            let w = rotated ? netH : netW;
            let h = rotated ? netW : netH;
            let blockW = bestCols * w + (bestCols > 0 ? (bestCols - 1) * gapX : 0) + 2 * outerBleed;
            let blockH = bestRows * h + (bestRows > 0 ? (bestRows - 1) * gapY : 0) + 2 * outerBleed;
            let startX = (paperW - blockW) / 2 + outerBleed;
            let startY = (paperH - blockH) / 2 + outerBleed;

            for (let r = 0; r < bestRows; r++) {
                for (let c = 0; c < bestCols; c++) {
                    items.push({
                        x: startX + c * (w + gapX),
                        y: startY + r * (h + gapY),
                        w: w,
                        h: h
                    });
                }
            }
        }
        return { yield: maxYield, items: items };
    },

    getLenFactor: function(paperDef) {
        if (!paperDef) return 1;
        return Math.max(1, Math.max(paperDef.w, paperDef.h) / 450);
    },

    getBaseRunCost: function(paperDef, isEnvelope, sel, config) {
        if (isEnvelope) {
            return sel.envelope_size === 'small' ? config.run_small : config.run_color;
        }
        if (!paperDef) return config.run_color;
        let maxLen = Math.max(paperDef.w, paperDef.h);
        let minLen = Math.min(paperDef.w, paperDef.h);

        if (maxLen <= 330 && minLen <= 225) return config.run_small;
        if (maxLen <= 490) return config.run_color;
        return config.run_small * Math.ceil(maxLen / 220);
    },

    getColorPrice: function(colorKey, paperDef, isEnvelope, sel, config) {
        let run = this.getBaseRunCost(paperDef, isEnvelope, sel, config);
        if (colorKey === '4_0') return run;
        if (colorKey === '4_4') return run * 2;
        if (colorKey === '4_1') return run + config.run_bw;
        if (colorKey === '1_0') return config.run_bw;
        if (colorKey === '1_1') return config.run_bw * 2;
        return 0;
    },

    // 6. Расчет стоимости ламинации с поддержкой сторонности (1+0 / 1+1)
    getLamPrice: function(lamKey, sides, paperDef, isEnvelope, laminations) {
        let actualSides = '1_0';
        let actualPaperDef = paperDef;
        let actualIsEnvelope = isEnvelope;
        let actualLaminations = laminations;

        // Определение формата вызова: новый (с sides) или старый (без sides)
        if (typeof sides === 'string') {
            actualSides = sides;
        } else {
            actualPaperDef = sides;
            actualIsEnvelope = paperDef;
            actualLaminations = isEnvelope;
            if (typeof lamKey === 'string' && lamKey.endsWith('_1_1')) {
                actualSides = '1_1';
            }
        }

        if (!actualLaminations || !lamKey || lamKey === 'none') return 0;

        // Нормализация ключа (если передан устаревший ключ с суффиксом)
        let cleanKey = lamKey;
        if (typeof cleanKey === 'string') {
            if (cleanKey.endsWith('_1_0')) {
                cleanKey = cleanKey.replace('_1_0', '');
            } else if (cleanKey.endsWith('_1_1')) {
                cleanKey = cleanKey.replace('_1_1', '');
                actualSides = '1_1';
            }
            if (cleanKey === 'press_touch') {
                cleanKey = 'press_touch_velvet';
            }
        }

        let item = actualLaminations[cleanKey] || actualLaminations[lamKey];
        if (!item || !item.price) return 0;

        let multiplier = 1;
        // Для рулонных припрессов учитывается сторонность; пакетная считается за 1 пакет
        if (item.type === 'roll') {
            multiplier = (actualSides === '1_1') ? 2 : 1;
        }

        let base = item.price * multiplier;
        if (base === 0 || actualIsEnvelope || !actualPaperDef) return base;
        return base * this.getLenFactor(actualPaperDef);
    },

    getPaperDef: function(key, sel, papers) {
        if (key === 'custom') return { w: (sel ? sel.custom_paper_width : 450), h: (sel ? sel.custom_paper_height : 320) };
        return { w: (papers[key] ? papers[key].w : 450), h: (papers[key] ? papers[key].h : 320) };
    },

    isLaminated: function(lamKey, laminations) {
        if (!laminations || !lamKey || lamKey === 'none') return false;
        let cleanKey = typeof lamKey === 'string' ? lamKey.replace('_1_0', '').replace('_1_1', '') : lamKey;
        let item = laminations[cleanKey] || laminations[lamKey];
        if (!item) return false;
        if (item.type === 'pouch') return true;
        return item.name ? item.name.toLowerCase().includes('ламинация') : false;
    },

    // Диспетчеризация по зарегистрированным модулям
    calcLayoutForSpec: function(sel, config, papers, sizes, laminations) {
        let mod = window.ProductModules[sel.good];
        if (mod && mod.calcLayout) return mod.calcLayout(sel, config, papers, sizes, laminations);
        return { 
            base: { yield: 1 }, 
            cover: { yield: 1 }, 
            block: { yield: 1 }, 
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] }, 
            svg: { paperW: 450, paperH: 320, items: [] } 
        };
    },

    calcPriceForSpec: function(sel, config, papers, sizes, colors, laminations, toners) {
        let mod = window.ProductModules[sel.good];
        if (mod && mod.calcPrice) return mod.calcPrice(sel, config, papers, sizes, colors, laminations, toners);
        return { doesNotFit: false, one_total: 0, total: 0, productionCost: 0, productionCostWithTax: 0, totalPapersCount: 0 };
    },

    calcDeliveryTimeForSpec: function(sel) {
        let mod = window.ProductModules[sel.good];
        if (mod && mod.calcDelivery) return mod.calcDelivery(sel);
        return '1-3';
    }
};