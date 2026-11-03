window.ProductModules = window.ProductModules || {};

window.ProductModules['brochure'] = {
    calcLayout: function(selected, config, papers, sizes, laminations) {
        let isLandscape = selected.orientation === 'landscape';
        let pageW = sizes.brochure[selected.size].w;
        let pageH = sizes.brochure[selected.size].h;
        
        let spreadW = isLandscape ? pageH * 2 : pageW * 2;
        let spreadH = isLandscape ? pageW : pageH;

        let outer = (config.bleeds || 6) / 2;
        let gapY = (config.bleeds || 6) / 2;
        let gapX = 5;

        let coverPaper = CalcEngine.getPaperDef(selected.cover_paper, selected, papers);
        if (CalcEngine.isLaminated(selected.cover_lamination, laminations)) { 
            coverPaper.w = 420; 
            coverPaper.h = 297; 
        }
        let coverYield = CalcEngine.calcYield(spreadW, spreadH, coverPaper.w, coverPaper.h, gapX, gapY, outer, config.margins || 4);

        let blockPaper = CalcEngine.getPaperDef(selected.block_paper, selected, papers);
        if (CalcEngine.isLaminated(selected.block_lamination, laminations)) { 
            blockPaper.w = 420; 
            blockPaper.h = 297; 
        }
        let blockYield = CalcEngine.calcYield(spreadW, spreadH, blockPaper.w, blockPaper.h, gapX, gapY, outer, config.margins || 4);

        return {
            base: { yield: 1 },
            cover: { yield: coverYield },
            block: { yield: blockYield },
            presentation: { cover_yield: 1, back_cover_yield: 1, blocks_yield: [] },
            svg: { paperW: coverPaper.w, paperH: coverPaper.h, items: [] }
        };
    },

    calcPrice: function(selected, config, papers, sizes, colors, laminations, toners) {
        let layout = this.calcLayout(selected, config, papers, sizes, laminations);
        let doesNotFit = false;

        if (layout.cover.yield === 0) doesNotFit = true;
        if (selected.pages_count > 4 && layout.block.yield === 0) doesNotFit = true;

        let yCover = layout.cover.yield || 1;
        let yBlock = layout.block.yield || 1;

        let coverSheets = Math.ceil(selected.circulation / yCover);
        let blockSheets = selected.pages_count > 4 
            ? Math.ceil((selected.circulation * ((selected.pages_count - 4) / 4)) / yBlock) 
            : 0;
        let totalPapersCount = coverSheets + blockSheets;

        let coverPaperDef = CalcEngine.getPaperDef(selected.cover_paper, selected, papers);
        let blockPaperDef = CalcEngine.getPaperDef(selected.block_paper, selected, papers);

        let coverPaperPrice = selected.cover_paper === 'custom' 
            ? Number(selected.custom_paper_price || 0) 
            : (papers[selected.cover_paper] ? papers[selected.cover_paper].price : 0);
        let blockPaperPrice = selected.block_paper === 'custom' 
            ? Number(selected.custom_paper_price || 0) 
            : (papers[selected.block_paper] ? papers[selected.block_paper].price : 0);

        let coverColorPrice = CalcEngine.getColorPrice(selected.cover_color, coverPaperDef, false, selected, config);
        let blockColorPrice = CalcEngine.getColorPrice(selected.block_color, blockPaperDef, false, selected, config);

        // Расчет ламинаций с поддержкой сторонности (1+0 / 1+1)
        let coverLaminationPrice = CalcEngine.getLamPrice(
            selected.cover_lamination, 
            selected.cover_lamination_sides || '1_0', 
            coverPaperDef, 
            false, 
            laminations
        );
        let blockLaminationPrice = CalcEngine.getLamPrice(
            selected.block_lamination, 
            selected.block_lamination_sides || '1_0', 
            blockPaperDef, 
            false, 
            laminations
        );

        let coverPlotterCost = 0;
        if (selected.cover_plotter_cut === 'plotter') {
            coverPlotterCost = (config.plotter_sra3 || 150) * CalcEngine.getLenFactor(coverPaperDef);
        }
        if (selected.cover_plotter_cut === 'plotter_perf') {
            coverPlotterCost = (config.plotter_perf_sra3 || 300) * CalcEngine.getLenFactor(coverPaperDef);
        }

        // Тонеры обложки
        let runCostForCoverToner = CalcEngine.getBaseRunCost(coverPaperDef, false, selected, config);
        let toner1_runs_cost = 0;
        let toner1_usd_lump = 0;
        if (selected.toner1 && selected.toner1 !== 'none') {
            toner1_runs_cost = runCostForCoverToner * 2;
            toner1_usd_lump = (Number(selected.toner1_usd) || 0) * (config.usd_rate || 500);
        }

        let extra_run_cost = 0;
        let toner2_runs_cost = 0;
        let toner2_usd_lump = 0;
        if (selected.add_extra_run) {
            if (selected.toner2 && selected.toner2 !== 'none') {
                toner2_runs_cost = runCostForCoverToner * 2;
                toner2_usd_lump = (Number(selected.toner2_usd) || 0) * (config.usd_rate || 500);
            } else {
                extra_run_cost = runCostForCoverToner;
            }
        }

        let coverCostPerSheet = coverPaperPrice + coverColorPrice + coverLaminationPrice + toner1_runs_cost + extra_run_cost + toner2_runs_cost + coverPlotterCost;
        let blockCostPerSheet = blockPaperPrice + blockColorPrice + blockLaminationPrice;

        // Спецтонер для блока
        let block_toners_lump = 0;
        let block_toners_usd_converted = 0;
        let block_toners_runs_cost = 0;
        if (selected.block_toner && selected.block_toner !== 'none') {
            let blockRunCost = CalcEngine.getBaseRunCost(blockPaperDef, false, selected, config);
            block_toners_usd_converted = (Number(selected.block_toners_usd) || 0) * (config.usd_rate || 500);
            block_toners_runs_cost = blockSheets * blockRunCost * 2;
            block_toners_lump = block_toners_usd_converted + block_toners_runs_cost;
        }

        let productionCost = (coverSheets * coverCostPerSheet) + toner1_usd_lump + toner2_usd_lump + (blockSheets * blockCostPerSheet) + block_toners_lump;

        let profitMultiplier = config.profit_per_one || 2.3;
        let tax = config.tax || 1.36;
        let productionCostWithTax = productionCost * tax;
        let costPerPiece = productionCost / (selected.circulation || 1);
        let unitPrice = Math.ceil((costPerPiece * tax) * profitMultiplier);
        let totalPrice = unitPrice * selected.circulation;

        return {
            doesNotFit: doesNotFit,
            one_total: doesNotFit ? 0 : Math.round(unitPrice),
            total: doesNotFit ? 'НЕ ПОМЕЩАЕТСЯ' : Math.round(totalPrice),
            productionCost: Math.round(productionCost),
            productionCostWithTax: Math.round(productionCostWithTax),
            totalPapersCount: totalPapersCount,

            coverSheets: coverSheets,
            blockSheets: blockSheets,
            coverCostPerSheet: Math.round(coverCostPerSheet),
            blockCostPerSheet: Math.round(blockCostPerSheet),

            coverPaperPrice: Math.round(coverPaperPrice),
            coverColorPrice: Math.round(coverColorPrice),
            coverLaminationPrice: Math.round(coverLaminationPrice),
            coverPlotterCost: Math.round(coverPlotterCost),

            blockPaperPrice: Math.round(blockPaperPrice),
            blockColorPrice: Math.round(blockColorPrice),
            blockLaminationPrice: Math.round(blockLaminationPrice),

            toner1_runs_cost: Math.round(toner1_runs_cost),
            toner1_usd_lump: Math.round(toner1_usd_lump),
            extra_run_cost: Math.round(extra_run_cost),
            toner2_runs_cost: Math.round(toner2_runs_cost),
            toner2_usd_lump: Math.round(toner2_usd_lump),

            block_toners_cost: Math.round(block_toners_lump),
            block_toners_runs_cost: Math.round(block_toners_runs_cost),
            block_toners_usd_converted: Math.round(block_toners_usd_converted)
        };
    },

    calcDelivery: function(sel) {
        let circ = Number(sel.circulation) || 0;
        let add = Math.floor(circ / 100);
        return (3 + add) + '-' + (5 + add);
    }
};