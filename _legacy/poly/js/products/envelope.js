window.ProductModules = window.ProductModules || {};

window.ProductModules['envelope'] = {
    calcLayout: function(sel, config, papers, sizes, laminations) {
        return {
            base: { yield: 1 }, 
            cover: { yield: 1 }, 
            block: { yield: 1 },
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] },
            svg: { paperW: 450, paperH: 320, items: [] }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors, laminations, toners) {
        let profitMult = config.profit_per_one || 2.3;
        let sheets = Number(sel.circulation) || 1;
        let paperPrice = Number(sel.envelope_price) || 0;
        let colorPrice = CalcEngine.getColorPrice(sel.color, null, true, sel, config);

        let runCost = CalcEngine.getBaseRunCost(null, true, sel, config);
        
        // Спецтонер 1
        let toner1Cost = (sel.toner1 && sel.toner1 !== 'none') ? runCost * 2 : 0;
        let toner1Lump = (sel.toner1 && sel.toner1 !== 'none') ? (Number(sel.toner1_usd) || 0) * (config.usd_rate || 500) : 0;
        
        // Доп. прогон и Спецтонер 2
        let extraRunCost = 0;
        let toner2Cost = 0;
        let toner2Lump = 0;
        if (sel.add_extra_run) {
            if (sel.toner2 && sel.toner2 !== 'none') {
                toner2Cost = runCost * 2;
                toner2Lump = (Number(sel.toner2_usd) || 0) * (config.usd_rate || 500);
            } else {
                extraRunCost = runCost;
            }
        }

        let costPerItem = paperPrice + colorPrice + toner1Cost + extraRunCost + toner2Cost;
        let productionCost = (sheets * costPerItem) + toner1Lump + toner2Lump;

        let tax = config.tax || 1.36;
        let costPerPiece = productionCost / (sel.circulation || 1);
        let unitPrice = Math.ceil((costPerPiece * tax) * profitMult);
        let totalPrice = unitPrice * sel.circulation;

        return {
            doesNotFit: false,
            one_total: Math.round(unitPrice),
            total: Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCost * tax),
            totalPapersCount: sheets,
            paperPrice: Math.round(paperPrice),
            colorPrice: Math.round(colorPrice),
            laminationPrice: 0,
            totalCostPerSheet: Math.round(costPerItem),
            plotterCost: 0,
            
            // Детализация тонеров для отображения в таблице расходов
            toner1_runs_cost: Math.round(toner1Cost),
            toner1_usd_lump: Math.round(toner1Lump),
            extra_run_cost: Math.round(extraRunCost),
            toner2_runs_cost: Math.round(toner2Cost),
            toner2_usd_lump: Math.round(toner2Lump)
        };
    },

    calcDelivery: function(sel) {
        let circ = Number(sel.circulation) || 0;
        let add = Math.floor(circ / 500);
        return (3 + add) + '-' + (5 + add);
    },

    generateDesc: function(sel, specSize, specPaper, colors) {
        return 'Цветность: ' + (colors[sel.color] ? colors[sel.color].name : sel.color) + '<br/>' +
               'Конверт (' + (sel.envelope_size === 'small' ? 'До С4 включительно' : 'Больше С4') + ')<br/>';
    }
};