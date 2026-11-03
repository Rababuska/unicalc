window.ProductModules = window.ProductModules || {};

window.ProductModules['sticker'] = {
    calcLayout: function(sel, config, papers, sizes, laminations) {
        let isSingle = sel.cut_type === 'single';
        let outer = isSingle ? 0 : config.bleeds / 2;
        let gapY = isSingle ? 0 : config.bleeds / 2;
        let gapX = isSingle ? 0 : 5;

        let paper = CalcEngine.getPaperDef(sel.paper, sel, papers);
        if (CalcEngine.isLaminated(sel.lamination, laminations)) { 
            paper.w = 420; 
            paper.h = 297; 
        }

        let itemW = (sel.size === 'custom') 
            ? (Number(sel.custom_width) || 0) 
            : (sizes.sticker[sel.size] ? sizes.sticker[sel.size].w : 210);
        let itemH = (sel.size === 'custom') 
            ? (Number(sel.custom_height) || 0) 
            : (sizes.sticker[sel.size] ? sizes.sticker[sel.size].h : 297);

        let calcRes = CalcEngine.calcYieldDetailed(itemW, itemH, paper.w, paper.h, gapX, gapY, outer, config.margins);
        return {
            base: { yield: calcRes.yield },
            cover: { yield: 1 }, 
            block: { yield: 1 },
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] },
            svg: { paperW: paper.w, paperH: paper.h, items: calcRes.items }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors, laminations, toners) {
        let profitMult = config.profit_per_one || 2.3;
        let lay = this.calcLayout(sel, config, papers, sizes, laminations);
        let y = lay.base.yield || 1;
        let doesNotFit = lay.base.yield === 0;

        let sheets = Math.ceil(sel.circulation / y);
        let paperDef = CalcEngine.getPaperDef(sel.paper, sel, papers);
        let paperPrice = sel.paper === 'custom' 
            ? Number(sel.custom_paper_price || 0) 
            : (papers[sel.paper] ? papers[sel.paper].price : 100); // Рафлатак / самоклейка
        
        let colorPrice = CalcEngine.getColorPrice(sel.color, paperDef, false, sel, config); // 4+0 или 1+0
        
        // Для стикеров принудительно 1+0
        let laminationPrice = CalcEngine.getLamPrice(sel.lamination, sel.lamination_sides || '1_0', paperDef, false, laminations);

        let plotterCost = 0;
        if (sel.plotter_cut === 'plotter') {
            plotterCost = (config.plotter_sra3 || 150) * CalcEngine.getLenFactor(paperDef);
        }
        if (sel.plotter_cut === 'plotter_perf') {
            plotterCost = (config.plotter_perf_sra3 || 300) * CalcEngine.getLenFactor(paperDef);
        }

        let runCost = CalcEngine.getBaseRunCost(paperDef, false, sel, config);
        
        // Спецтонер 1
        let toner1Cost = (sel.toner1 && sel.toner1 !== 'none') ? runCost * 2 : 0;
        let toner1Lump = (sel.toner1 && sel.toner1 !== 'none') ? (Number(sel.toner1_usd) || 0) * (config.usd_rate || 500) : 0;
        
        // Дополнительный прогон и Спецтонер 2
        let extra_run_cost = 0;
        let toner2Cost = 0;
        let toner2Lump = 0;
        if (sel.add_extra_run) {
            if (sel.toner2 && sel.toner2 !== 'none') {
                toner2Cost = runCost * 2;
                toner2Lump = (Number(sel.toner2_usd) || 0) * (config.usd_rate || 500);
            } else {
                extra_run_cost = runCost;
            }
        }

        let costPerSheet = paperPrice + colorPrice + laminationPrice + toner1Cost + extra_run_cost + toner2Cost + plotterCost;
        let productionCost = (sheets * costPerSheet) + toner1Lump + toner2Lump;

        let tax = config.tax || 1.36;
        let costPerPiece = productionCost / (sel.circulation || 1);
        let unitPrice = Math.ceil((costPerPiece * tax) * profitMult);
        let totalPrice = unitPrice * sel.circulation;

        return {
            doesNotFit: doesNotFit,
            one_total: doesNotFit ? 0 : Math.round(unitPrice),
            total: doesNotFit ? 'НЕ ПОМЕЩАЕТСЯ' : Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCost * tax),
            totalPapersCount: sheets,
            paperPrice: Math.round(paperPrice),
            colorPrice: Math.round(colorPrice),
            laminationPrice: Math.round(laminationPrice),
            totalCostPerSheet: Math.round(costPerSheet),
            plotterCost: Math.round(plotterCost),

            // Детализация расходов по тонерам для карточки себестоимости
            toner1_runs_cost: Math.round(toner1Cost),
            toner1_usd_lump: Math.round(toner1Lump),
            extra_run_cost: Math.round(extra_run_cost),
            toner2_runs_cost: Math.round(toner2Cost),
            toner2_usd_lump: Math.round(toner2Lump)
        };
    },

    calcDelivery: function(sel) {
        let circ = Number(sel.circulation) || 0;
        let minDays = 1, maxDays = 3;
        if (sel.plotter_cut === 'plotter') {
            let add = Math.floor(circ / 100);
            minDays += add; maxDays += add;
        } else if (sel.plotter_cut === 'plotter_perf') {
            let add = Math.floor(circ / 100) * 2;
            minDays += add; maxDays += add;
        }
        return minDays + '-' + maxDays;
    },

    generateDesc: function(sel, specSize, specPaper, colors, laminations) {
        let lamText = 'Без припресса';
        if (sel.lamination && sel.lamination !== 'none' && laminations[sel.lamination]) {
            lamText = laminations[sel.lamination].name;
        }

        let desc = 'Размер: ' + specSize + '<br/>' +
                   'Цветность: ' + (colors[sel.color] ? colors[sel.color].name : sel.color) + '<br/>' +
                   'Ламинация: ' + lamText + '<br/>' +
                   'Бумага: ' + specPaper + '<br/>';
        if (sel.plotter_cut !== 'none') desc += 'Плоттерная резка<br/>';
        return desc;
    }
};