window.ProductModules = window.ProductModules || {};

window.ProductModules['bag'] = {
    calcLayout: function(sel, config, papers, sizes, laminations) {
        let paperDef = CalcEngine.getPaperDef(sel.paper, sel, papers);
        let maxL = Math.max(paperDef.w, paperDef.h);
        let minL = Math.min(paperDef.w, paperDef.h);
        let doesNotFit = maxL < 488 || minL < 330;

        return {
            base: { yield: doesNotFit ? 0 : 1 },
            cover: { yield: 1 },
            block: { yield: 1 },
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] },
            svg: { paperW: paperDef.w, paperH: paperDef.h, items: [] }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors, laminations, toners) {
        let profitMult = config.profit_per_one;
        let paperDef = CalcEngine.getPaperDef(sel.paper, sel, papers);
        let maxL = Math.max(paperDef.w, paperDef.h);
        let minL = Math.min(paperDef.w, paperDef.h);
        let doesNotFit = maxL < 488 || minL < 330;

        let makeready = config.bag_makeready_sheets || 10;
        let totalSheetsCount = (sel.circulation * 2) + makeready;

        let paperPrice = sel.paper === 'custom' ? sel.custom_paper_price : (papers[sel.paper] ? papers[sel.paper].price : 50);
        let fullColorPrice = CalcEngine.getColorPrice(sel.color, paperDef, false, sel, config);

        // Печать только с одной стороны: половина тиража запечатывается, вторая 0+0
        let printedSheets = (sel.bag_print_sides === 'single') 
            ? (sel.circulation + Math.ceil(makeready / 2)) 
            : totalSheetsCount;

        // Расчет ламинации с учетом сторонности (для пакетов по умолчанию 1+0) и масштабирования под 488 мм
        let laminationPrice = CalcEngine.getLamPrice(sel.lamination, sel.lamination_sides || '1_0', paperDef, false, laminations);

        let bagPlotterPerSheet = 0;
        if (sel.bag_production === 'plotter') {
            bagPlotterPerSheet = config.plotter_sra3 * CalcEngine.getLenFactor(paperDef);
        }

        let runCost = CalcEngine.getBaseRunCost(paperDef, false, sel, config);
        let toner1Cost = (sel.toner1 !== 'none') ? runCost * 2 : 0;
        let toner1Lump = (sel.toner1 !== 'none') ? (Number(sel.toner1_usd) || 0) * config.usd_rate : 0;
        let toner2Cost = (sel.add_extra_run && sel.toner2 !== 'none') ? runCost * 2 : (sel.add_extra_run ? runCost : 0);
        let toner2Lump = (sel.add_extra_run && sel.toner2 !== 'none') ? (Number(sel.toner2_usd) || 0) * config.usd_rate : 0;

        let totalPaperCost = totalSheetsCount * paperPrice;
        let totalColorCost = printedSheets * fullColorPrice;
        let totalLamCost = totalSheetsCount * laminationPrice;
        let totalPlotterCost = totalSheetsCount * bagPlotterPerSheet;
        let totalTonerRuns = totalSheetsCount * (toner1Cost + toner2Cost);

        let totalSheetsCost = totalPaperCost + totalColorCost + totalLamCost + totalPlotterCost + totalTonerRuns + toner1Lump + toner2Lump;
        let sheetsSellingTotal = Math.ceil((totalSheetsCost * config.tax) * profitMult);

        let assemblySellingTotal = 0;
        let assemblyCostTotal = 0;

        if (sel.bag_production === 'barvit') {
            let excCost = sel.circulation * config.bag_exclusive_rate;
            assemblyCostTotal = excCost + config.bag_exclusive_delivery;
            assemblySellingTotal = Math.round(excCost * config.bag_exclusive_markup) + config.bag_exclusive_delivery;
        } else {
            let inhouseCost = sel.circulation * config.bag_inhouse_assembly;
            assemblyCostTotal = inhouseCost;
            assemblySellingTotal = inhouseCost;
        }

        let productionCost = totalSheetsCost + assemblyCostTotal;
        let productionCostWithTax = (totalSheetsCost * config.tax) + assemblyCostTotal;
        let totalPrice = sheetsSellingTotal + assemblySellingTotal;
        let unitPrice = Math.round(totalPrice / sel.circulation);

        return {
            doesNotFit: doesNotFit,
            one_total: doesNotFit ? 0 : Math.round(unitPrice),
            total: doesNotFit ? 'НЕ ПОМЕЩАЕТСЯ' : Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCostWithTax),
            totalPapersCount: totalSheetsCount,
            totalSheetsCost: totalSheetsCost,
            paperPrice: Math.round(paperPrice),
            colorPrice: Math.round(fullColorPrice),
            laminationPrice: Math.round(laminationPrice),
            totalCostPerSheet: Math.round(productionCost / sel.circulation),
            plotterCost: Math.round(bagPlotterPerSheet)
        };
    },

    calcDelivery: function(sel) { return '7-10'; }
};