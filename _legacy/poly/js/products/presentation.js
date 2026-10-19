// ==========================================================================
// МОДУЛЬ ПРОДУКТА: ПРЕЗЕНТАЦИИ (js/products/presentation.js)
// ==========================================================================

window.ProductModules = window.ProductModules || {};

window.ProductModules['presentation'] = {
    calcLayout: function(sel, config, papers, sizes, laminations) {
        let isLandscape = sel.orientation === 'landscape';

        // Считываем либо свой размер, либо габариты из справочника
        let leafSizes = (sizes && sizes.leaflet) ? sizes.leaflet : {};
        let pageW = (sel.size === 'custom') 
            ? (Number(sel.custom_width) || 0) 
            : (leafSizes[sel.size] ? leafSizes[sel.size].w : 210);
        let pageH = (sel.size === 'custom') 
            ? (Number(sel.custom_height) || 0) 
            : (leafSizes[sel.size] ? leafSizes[sel.size].h : 297);

        let w = isLandscape ? pageH : pageW;
        let h = isLandscape ? pageW : pageH;

        let outer = (config.bleeds || 6) / 2;
        let gapY = (config.bleeds || 6) / 2;
        let gapX = 5;

        let coverYield = 1;
        let backCoverYield = 1;

        if (!sel.presentation_only_block) {
            let cPaper = CalcEngine.getPaperDef(sel.cover_paper, sel, papers);
            if (CalcEngine.isLaminated(sel.cover_lamination, laminations)) { cPaper.w = 420; cPaper.h = 297; }
            coverYield = CalcEngine.calcYield(w, h, cPaper.w, cPaper.h, gapX, gapY, outer, config.margins || 4);

            let bcPaper = CalcEngine.getPaperDef(sel.back_cover_paper, sel, papers);
            if (CalcEngine.isLaminated(sel.back_cover_lamination, laminations)) { bcPaper.w = 420; bcPaper.h = 297; }
            backCoverYield = CalcEngine.calcYield(w, h, bcPaper.w, bcPaper.h, gapX, gapY, outer, config.margins || 4);
        }

        let blocksYield = [];
        if (sel.presentation_blocks) {
            for (let b of sel.presentation_blocks) {
                let bPaper = CalcEngine.getPaperDef(b.paper, sel, papers);
                if (CalcEngine.isLaminated(b.lamination, laminations)) { bPaper.w = 420; bPaper.h = 297; }
                blocksYield.push(CalcEngine.calcYield(w, h, bPaper.w, bPaper.h, gapX, gapY, outer, config.margins || 4));
            }
        }

        return {
            base: { yield: 1 },
            cover: { yield: 1 },
            block: { yield: 1 },
            presentation: {
                cover_yield: coverYield,
                back_cover_yield: backCoverYield,
                blocks_yield: blocksYield
            },
            svg: { paperW: 450, paperH: 320, items: [] }
        };
    },

    calcPrice: function(sel, config, papers, sizes, colors, laminations, toners) {
        let profitMult = config.profit_per_one || 2.3;
        let lay = this.calcLayout(sel, config, papers, sizes, laminations);

        let doesNotFit = false;
        if (!sel.presentation_only_block) {
            if (lay.presentation.cover_yield === 0 || lay.presentation.back_cover_yield === 0) doesNotFit = true;
        }
        if (lay.presentation.blocks_yield.some(y => y === 0)) doesNotFit = true;

        let totalCoverCost = 0;
        let totalBackCost = 0;
        let coverSheets = 0;
        let backSheets = 0;
        let totalPresSheetsPerItem = 0;

        let coverCostPerSheet = 0;
        let cTonerLump = 0;
        let cPlotter = 0;

        let backCostPerSheet = 0;
        let bcTonerLump = 0;
        let bcPlotter = 0;

        // Если обложки включены
        if (!sel.presentation_only_block) {
            let yCover = lay.presentation.cover_yield || 1;
            let yBack = lay.presentation.back_cover_yield || 1;

            coverSheets = Math.ceil(sel.circulation / yCover);
            backSheets = Math.ceil(sel.circulation / yBack);
            totalPresSheetsPerItem += 2;

            // Обложка
            let cPaperDef = CalcEngine.getPaperDef(sel.cover_paper, sel, papers);
            let cPaperPrice = sel.cover_paper === 'custom' ? Number(sel.custom_paper_price || 0) : (papers[sel.cover_paper] ? papers[sel.cover_paper].price : 0);
            let cColorPrice = CalcEngine.getColorPrice(sel.cover_color, cPaperDef, false, sel, config);
            let cLamPrice = CalcEngine.getLamPrice(sel.cover_lamination, sel.cover_lamination_sides || '1_0', cPaperDef, false, laminations);
            let cRunCost = CalcEngine.getBaseRunCost(cPaperDef, false, sel, config);
            let cTonerRuns = (sel.cover_toner && sel.cover_toner !== 'none') ? cRunCost * 2 : 0;
            cTonerLump = (sel.cover_toner && sel.cover_toner !== 'none') ? (Number(sel.cover_toner_usd) || 0) * (config.usd_rate || 500) : 0;
            cPlotter = (sel.cover_plotter_cut === 'plotter') ? (config.plotter_sra3 || 150) * CalcEngine.getLenFactor(cPaperDef) : ((sel.cover_plotter_cut === 'plotter_perf') ? (config.plotter_perf_sra3 || 300) * CalcEngine.getLenFactor(cPaperDef) : 0);

            coverCostPerSheet = cPaperPrice + cColorPrice + cLamPrice + cTonerRuns + cPlotter;
            totalCoverCost = (coverSheets * coverCostPerSheet) + cTonerLump;

            // Подложка
            let bcPaperDef = CalcEngine.getPaperDef(sel.back_cover_paper, sel, papers);
            let bcPaperPrice = sel.back_cover_paper === 'custom' ? Number(sel.custom_paper_price || 0) : (papers[sel.back_cover_paper] ? papers[sel.back_cover_paper].price : 0);
            let bcColorPrice = CalcEngine.getColorPrice(sel.back_cover_color, bcPaperDef, false, sel, config);
            let bcLamPrice = CalcEngine.getLamPrice(sel.back_cover_lamination, sel.back_cover_lamination_sides || '1_0', bcPaperDef, false, laminations);
            let bcRunCost = CalcEngine.getBaseRunCost(bcPaperDef, false, sel, config);
            let bcTonerRuns = (sel.back_cover_toner && sel.back_cover_toner !== 'none') ? bcRunCost * 2 : 0;
            bcTonerLump = (sel.back_cover_toner && sel.back_cover_toner !== 'none') ? (Number(sel.back_cover_toner_usd) || 0) * (config.usd_rate || 500) : 0;
            bcPlotter = (sel.back_cover_plotter_cut === 'plotter') ? (config.plotter_sra3 || 150) * CalcEngine.getLenFactor(bcPaperDef) : ((sel.back_cover_plotter_cut === 'plotter_perf') ? (config.plotter_perf_sra3 || 300) * CalcEngine.getLenFactor(bcPaperDef) : 0);

            backCostPerSheet = bcPaperPrice + bcColorPrice + bcLamPrice + bcTonerRuns + bcPlotter;
            totalBackCost = (backSheets * backCostPerSheet) + bcTonerLump;
        }

        // Внутренние блоки
        let totalBlocksCost = 0;
        let blockSheetsCount = 0;

        if (sel.presentation_blocks) {
            for (let i = 0; i < sel.presentation_blocks.length; i++) {
                let b = sel.presentation_blocks[i];
                let yBlock = lay.presentation.blocks_yield[i] || 1;
                let bSra3Sheets = Math.ceil((sel.circulation * Number(b.sheets || 0)) / yBlock);
                blockSheetsCount += bSra3Sheets;
                totalPresSheetsPerItem += Number(b.sheets || 0);

                let bPaperDef = CalcEngine.getPaperDef(b.paper, sel, papers);
                let bPaperPrice = b.paper === 'custom' ? Number(sel.custom_paper_price || 0) : (papers[b.paper] ? papers[b.paper].price : 0);
                let bColorPrice = CalcEngine.getColorPrice(b.color, bPaperDef, false, sel, config);
                let bLamPrice = CalcEngine.getLamPrice(b.lamination, b.lamination_sides || '1_0', bPaperDef, false, laminations);
                let bRunC = CalcEngine.getBaseRunCost(bPaperDef, false, sel, config);
                let bTonerRuns = (b.toner && b.toner !== 'none') ? bRunC * 2 : 0;
                let bTonerLump = (b.toner && b.toner !== 'none') ? (Number(b.toner_usd) || 0) * (config.usd_rate || 500) : 0;

                let bCostPerSheet = bPaperPrice + bColorPrice + bLamPrice + bTonerRuns;
                totalBlocksCost += (bSra3Sheets * bCostPerSheet) + bTonerLump;
            }
        }

        // Выбор базового тарифа пружины (металл / пластик)
        let isPlastic = sel.presentation_spring_type === 'plastic';
        let baseBindRate = isPlastic 
            ? (config.presentation_bind_plastic || 350) 
            : (config.presentation_bind_metal || 500);

        let bindPerItem = baseBindRate + Math.max(0, totalPresSheetsPerItem - 20) * 1;
        let totalBindCost = bindPerItem * sel.circulation;

        let productionCost = totalCoverCost + totalBackCost + totalBlocksCost + totalBindCost;
        let tax = config.tax || 1.36;
        let costPerPiece = productionCost / (sel.circulation || 1);
        let unitPrice = Math.ceil((costPerPiece * tax) * profitMult);
        let totalPrice = unitPrice * sel.circulation;

        let presDetails = {
            coverSheets: coverSheets,
            coverCostPerSheet: Math.round(coverCostPerSheet),
            cTonerUsdLump: Math.round(cTonerLump),
            coverPlotterCost: Math.round(cPlotter),
            backSheets: backSheets,
            backCostPerSheet: Math.round(backCostPerSheet),
            bcTonerUsdLump: Math.round(bcTonerLump),
            backPlotterCost: Math.round(bcPlotter),
            totalBlocksCost: Math.round(totalBlocksCost),
            blockSra3Sheets: blockSheetsCount,
            bindCostPerItem: Math.round(bindPerItem),
            totalBindCost: Math.round(totalBindCost)
        };

        return {
            doesNotFit: doesNotFit,
            one_total: doesNotFit ? 0 : Math.round(unitPrice),
            total: doesNotFit ? 'НЕ ПОМЕЩАЕТСЯ' : Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCost * tax),
            totalPapersCount: coverSheets + backSheets + blockSheetsCount,
            paperPrice: 0,
            colorPrice: 0,
            laminationPrice: 0,
            totalCostPerSheet: Math.round(productionCost / (sel.circulation || 1)),
            plotterCost: 0,
            pres: presDetails
        };
    },

    calcDelivery: function(sel) {
        let circ = Number(sel.circulation) || 0;
        let add = Math.floor(circ / 100);
        return (4 + add) + '-' + (6 + add);
    }
};