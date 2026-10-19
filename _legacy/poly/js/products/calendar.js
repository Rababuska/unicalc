// ==========================================================================
// МОДУЛЬ ПРОДУКТА: КАЛЕНДАРИ НАСТОЛЬНЫЕ А5 (js/products/calendar.js)
// ==========================================================================

window.ProductModules = window.ProductModules || {};

window.ProductModules['calendar'] = {
    // Вспомогательный расчет клише (по правилам exclusive.js)
    calcClicheCost: function(sel) {
        if (sel.calendar_cliche_exists) return 0;
        let w = Number(sel.calendar_cliche_w) || 0;
        let h = Number(sel.calendar_cliche_h) || 0;
        if (w <= 0 || h <= 0) return 0;

        // Техническое поле +10 мм к ширине и высоте, перевод в см²
        let areaCm = ((w + 10) * (h + 10)) / 100;
        // 250 тг за см², минимальная стоимость 3 500 тг
        return Math.max(3500, Math.round(areaCm * 250));
    },

    calcLayout: function(sel) {
        return {
            base: { yield: 4 }, // 4 перекидных листа А5 на лист SRA3
            cover: { yield: 1 },
            block: { yield: 1 },
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] },
            svg: { paperW: 450, paperH: 320, items: [] }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors, laminations, toners) {
        let circ = Number(sel.circulation) || 1;
        let profitMult = config.profit_per_one; // 2.3
        let pCount = Number(sel.calendar_sheets) || 7;
        let blockSra3Sheets = Math.ceil((circ * pCount) / 4);

        // ------------------------------------------------------------------
        // 1. РАСЧЕТ ПЕРЕКИДНОГО БЛОКА
        // ------------------------------------------------------------------
        let bPaperDef = CalcEngine.getPaperDef(sel.calendar_block_paper, sel, papers);
        let bPaperPrice = sel.calendar_block_paper === 'custom' 
            ? sel.custom_paper_price 
            : (papers[sel.calendar_block_paper] ? papers[sel.calendar_block_paper].price : 37);
        let bColorPrice = CalcEngine.getColorPrice(sel.color, bPaperDef, false, sel, config);
        let bLamPrice = CalcEngine.getLamPrice(sel.lamination, sel.lamination_sides || '1_0', bPaperDef, false, laminations);

        let runCost = CalcEngine.getBaseRunCost(bPaperDef, false, sel, config);
        let toner1Runs = (sel.toner1 !== 'none') ? runCost * 2 : 0;
        let toner1Lump = (sel.toner1 !== 'none') ? (Number(sel.toner1_usd) || 0) * config.usd_rate : 0;
        let toner2Runs = (sel.add_extra_run && sel.toner2 !== 'none') ? runCost * 2 : (sel.add_extra_run ? runCost : 0);
        let toner2Lump = (sel.add_extra_run && sel.toner2 !== 'none') ? (Number(sel.toner2_usd) || 0) * config.usd_rate : 0;

        let bCostPerSheet = bPaperPrice + bColorPrice + bLamPrice + toner1Runs + toner2Runs;
        let totalBlockCost = (blockSra3Sheets * bCostPerSheet) + toner1Lump + toner2Lump;
        let blockSellingTotal = Math.ceil((totalBlockCost * config.tax) * profitMult);

        // ------------------------------------------------------------------
        // 2. РАСЧЕТ НОЖКИ (ОСНОВЫ)
        // ------------------------------------------------------------------
        let standProdCost = 0;
        let standSellingTotal = 0;
        let standSheetsCount = 0;
        let standTitle = '';
        let standProdPerItem = 0;
        let isHardCover = false;

        let deliveryCost = config.calendar_delivery || 5400;
        let excMarkup = config.calendar_exclusive_markup || 1.35;

        // ВАРИАНТ 1: Белая переплетная (готовая)
        if (sel.calendar_stand_type === 'hard_cover') {
            isHardCover = true;
            standProdPerItem = config.calendar_hard_cover_cost; // 920 тг
            standProdCost = standProdPerItem * circ;
            standSellingTotal = config.calendar_hard_cover_sell * circ; // 1250 тг
            standTitle = 'Белая переплетная (готовая, с пружиной)';
        }

        // ВАРИАНТ 2: Печатная переплетная (лайнер + Эксклюзив)
        else if (sel.calendar_stand_type === 'hard_cover_print') {
            isHardCover = true;
            standSheetsCount = circ; // 1 лист 330х488 на 1 ножку

            let linerPaperDef = papers['p47'] || { w: 488, h: 330, price: 22 };
            let linerPaperPrice = linerPaperDef.price;
            let linerColorPrice = CalcEngine.getColorPrice('4_0', linerPaperDef, false, sel, config);
            let linerLamPrice = CalcEngine.getLamPrice('press_matt', '1_0', linerPaperDef, false, laminations);

            let linerCostPerSheet = linerPaperPrice + linerColorPrice + linerLamPrice;
            let totalLinerProdCost = standSheetsCount * linerCostPerSheet;
            let linerSellingTotal = Math.ceil((totalLinerProdCost * config.tax) * profitMult);

            let excCost = circ * (config.calendar_print_stand_rate || 900);
            let excSelling = Math.round(excCost * excMarkup) + deliveryCost;

            standProdCost = totalLinerProdCost + excCost + deliveryCost;
            standSellingTotal = linerSellingTotal + excSelling;
            standProdPerItem = Math.round(standProdCost / circ);
            standTitle = 'Печатная переплетная (лайнер 488х330 150г + мат. припресс 1+0, Эксклюзив)';
        }

        // ВАРИАНТ 3: Бумвинил (Эксклюзив + клише)
        else if (sel.calendar_stand_type === 'boomvinyl') {
            isHardCover = true;
            let clicheCost = this.calcClicheCost(sel);
            let excCost = circ * (config.calendar_boomvinyl_rate || 1100);

            standProdCost = excCost + deliveryCost + clicheCost;
            standSellingTotal = Math.round((excCost + clicheCost) * excMarkup) + deliveryCost;
            standProdPerItem = Math.round(standProdCost / circ);

            let clicheLabel = clicheCost > 0 ? `, клише ${sel.calendar_cliche_w}x${sel.calendar_cliche_h} мм: ${clicheCost} тг` : ' (клише заказчика)';
            standTitle = 'Бумвинил (Эксклюзив 1100 тг' + clicheLabel + ')';
        }

        // ВАРИАНТ 4: Термокожа (Эксклюзив + клише)
        else if (sel.calendar_stand_type === 'thermo_leather') {
            isHardCover = true;
            let clicheCost = this.calcClicheCost(sel);
            let excCost = circ * (config.calendar_thermo_leather_rate || 4000);

            standProdCost = excCost + deliveryCost + clicheCost;
            standSellingTotal = Math.round((excCost + clicheCost) * excMarkup) + deliveryCost;
            standProdPerItem = Math.round(standProdCost / circ);

            let clicheLabel = clicheCost > 0 ? `, клише ${sel.calendar_cliche_w}x${sel.calendar_cliche_h} мм: ${clicheCost} тг` : ' (клише заказчика)';
            standTitle = 'Термокожа (Эксклюзив 4000 тг' + clicheLabel + ')';
        }

        // ВАРИАНТ 5: Картон 260 г (1 лист SRA3)
        else if (sel.calendar_stand_type === 'cardboard_single') {
            standSheetsCount = circ;
            let stPaper = 50;
            let stColor = CalcEngine.getColorPrice(sel.calendar_stand_color, papers['p42'], false, sel, config);
            let stLam = CalcEngine.getLamPrice(sel.calendar_stand_lamination, sel.calendar_stand_lamination_sides || '1_0', papers['p42'], false, laminations);

            standProdPerItem = stPaper + stColor + stLam;
            standProdCost = standSheetsCount * standProdPerItem;
            let standWithTax = standProdCost * config.tax;
            standSellingTotal = Math.ceil(standWithTax * profitMult);
            standTitle = 'Картон 260 г (1 лист) + припресс';
        }

        // ВАРИАНТ 6: Картон 260 г (2 листа со склейкой)
        else if (sel.calendar_stand_type === 'cardboard_double') {
            standSheetsCount = circ * 2;
            let stPaper = 100;
            let stColor = CalcEngine.getColorPrice(sel.calendar_stand_color, papers['p42'], false, sel, config);
            let stLam = CalcEngine.getLamPrice(sel.calendar_stand_lamination, sel.calendar_stand_lamination_sides || '1_0', papers['p42'], false, laminations);

            standProdPerItem = stPaper + stColor + stLam + config.calendar_glue_double;
            standProdCost = circ * standProdPerItem;
            let standWithTax = standProdCost * config.tax;
            standSellingTotal = Math.ceil(standWithTax * profitMult);
            standTitle = 'Картон 260 г (2 листа, склейка) + припресс';
        }

        // ------------------------------------------------------------------
        // 3. ИТОГОВАЯ СБОРКА И СЕБЕСТОИМОСТЬ
        // ------------------------------------------------------------------
        let totalBindCost = isHardCover ? 0 : (config.calendar_bind * circ);
        let productionCost = 0;
        let totalPrice = 0;
        let unitPrice = 0;

        if (isHardCover) {
            // Для переплетных ножек пружина и сборка уже включены в ножку
            productionCost = totalBlockCost + standProdCost;
            totalPrice = blockSellingTotal + standSellingTotal;
            unitPrice = Math.round(totalPrice / circ);
        } else {
            // Для картона сборка на пружину добавляется отдельно
            productionCost = totalBlockCost + standProdCost + totalBindCost;
            let costPerPiece = productionCost / circ;
            unitPrice = Math.ceil((costPerPiece * config.tax) * profitMult);
            totalPrice = unitPrice * circ;
        }

        return {
            doesNotFit: false,
            one_total: Math.round(unitPrice),
            total: Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCost * config.tax),
            totalPapersCount: blockSra3Sheets + standSheetsCount,
            totalCostPerSheet: Math.round(productionCost / circ),
            paperPrice: Math.round(bPaperPrice),
            colorPrice: Math.round(bColorPrice),
            laminationPrice: Math.round(bLamPrice),
            plotterCost: 0,
            cal: {
                blockSra3Sheets: blockSra3Sheets,
                totalBlockCost: Math.round(totalBlockCost),
                standTitle: standTitle,
                standProdCostPerItem: Math.round(standProdPerItem),
                isHardCover: isHardCover
            }
        };
    },

    calcDelivery: function(sel) {
        if (sel.calendar_stand_type === 'hard_cover_print' || 
            sel.calendar_stand_type === 'boomvinyl' || 
            sel.calendar_stand_type === 'thermo_leather') {
            return '7-10';
        }
        let circ = Number(sel.circulation) || 0;
        let add = Math.floor(circ / 100);
        return (4 + add) + '-' + (6 + add);
    }
};