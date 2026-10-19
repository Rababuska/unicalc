(function () {
  const VAT_RATE = 1.16;

  function totalOf(item) {
    if (item.total !== undefined && Number.isFinite(Number(item.total))) return Number(item.total);
    return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }

  function internalAdjustmentCharge(item) {
    const adjustments = Array.isArray(item.quoteInternalAdjustments) ? item.quoteInternalAdjustments : [];
    return adjustments.reduce(function (sum, adjustment) {
      return sum + (Number(adjustment.chargeAmount) || 0);
    }, 0);
  }

  function amountForVat(amount, includeVat) {
    return includeVat === false ? Math.round(amount / VAT_RATE) : amount;
  }

  function amountToInclusive(amount, includeVat) {
    return includeVat === false ? Math.round(amount * VAT_RATE) : amount;
  }

  function normalizeQuoteSettings(settings) {
    const input = settings && typeof settings === 'object' ? settings : {};
    const discountValue = Number(input.discountValue);
    const manualTotal = input.manualTotal !== undefined && input.manualTotal !== null && input.manualTotal !== ''
      ? Number(input.manualTotal)
      : null;
    const isFixed = input.discountType === 'amount' || input.discountType === 'fixed';
    const discountItemId = input.discountItemId !== undefined && input.discountItemId !== null
      ? String(input.discountItemId)
      : '';

    return {
      discountEnabled: Boolean(input.discountEnabled !== false && Number.isFinite(discountValue) && discountValue > 0),
      discountType: isFixed ? 'amount' : 'percent',
      discountValue: Number.isFinite(discountValue) ? Math.max(0, discountValue) : 0,
      discountScope: input.discountScope === 'position' || (input.discountScope === 'item' && discountItemId)
        ? 'position'
        : 'order',
      discountItemId: discountItemId,
      manualTotal: Number.isFinite(manualTotal) ? manualTotal : null,
      hideTotal: Boolean(input.hideTotal)
    };
  }

  function calculateDiscount(items, includeVat, settings) {
    const normalized = normalizeQuoteSettings(settings);
    if (!normalized.discountEnabled) return 0;

    const baseItems = items.map(function (item) {
      const adjustmentCharge = internalAdjustmentCharge(item);
      const quantity = Number(item.quantity) || 0;
      return Object.assign({}, item, {
        unitPrice: amountForVat(Math.max(0, (Number(item.unitPrice) || 0) - (quantity ? adjustmentCharge / quantity : 0)), includeVat),
        total: amountForVat(Math.max(0, totalOf(item) - adjustmentCharge), includeVat)
      });
    });

    const discountItems = normalized.discountScope === 'position'
      ? baseItems.filter(function (item) {
        return normalized.discountItemId && runGroupKey(item) === normalized.discountItemId;
      })
      : baseItems;
    const rawTotal = discountItems.reduce(function (sum, item) { return sum + (Number(item.total) || 0); }, 0);
    if (rawTotal <= 0) return 0;

    if (normalized.discountScope === 'order') {
      if (normalized.discountType === 'percent') return rawTotal * (normalized.discountValue / 100);
      return Math.min(rawTotal, normalized.discountValue);
    }

    const itemTotals = discountItems.map(function (item) { return Number(item.total) || 0; });
    const totalItemBase = itemTotals.reduce(function (sum, value) { return sum + value; }, 0);
    if (totalItemBase <= 0) return 0;

    if (normalized.discountType === 'percent') {
      return itemTotals.reduce(function (sum, value) { return sum + value * (normalized.discountValue / 100); }, 0);
    }

    const amount = Math.min(normalized.discountValue, totalItemBase);
    return itemTotals.reduce(function (sum, value) {
      const share = totalItemBase > 0 ? value / totalItemBase : 0;
      return sum + amount * share;
    }, 0);
  }

  function metadataExtraProductionCost(item) {
    const quantity = Number(item.quantity) || 0;
    if (item.productionCostIncludesFinish || item.finishCostCalculated) {
      return 0;
    }

    let extraCost = 0;

    // 1. Плоттерная резка
    const plotterCut = item.plotterCut || item.coverPlotterCut || item.backCoverPlotterCut || item.plotter_cut || item.cover_plotter_cut || item.back_cover_plotter_cut;
    if (plotterCut && plotterCut !== 'none') {
      const cutMeters = Number(item.plotterLength || item.plotter_length || 0);
      const isPerf = plotterCut === 'plotter_perf' || item.plotterType === 'perf';

      if (cutMeters > 0) {
        const meterRate = isPerf ? 350 : 250;
        extraCost += 2500 + (cutMeters * meterRate);
      } else {
        const unitRate = isPerf ? 300 : 150;
        extraCost += unitRate * (quantity || 1);
      }
    }

    // 2. Тиснение
    const hasEmbossing = Boolean(
      item.embossing === true ||
      item.embossing === 'notebook' ||
      item.embossType ||
      item.notebookEmboss ||
      item.notebook_emboss ||
      /тисн|emboss/i.test(String(item.details || item.desc || ''))
    );

    if (hasEmbossing) {
      const embossText = String(item.title || '') + ' ' + String(item.details || item.desc || '');
      const isNotebookEmboss = item.embossing === 'notebook' || item.notebookEmboss === 'notebook' || item.notebookEmboss === true || item.notebook_emboss === true || /(?:блокн|ежеднев).{0,60}тисн|тисн.{0,60}(?:блокн|ежеднев)/i.test(embossText);
      const isCustomerCliche = Boolean(
        item.customerCliche ||
        item.customer_cliche ||
        item.clicheExists ||
        item.cliche_exists
      );

      if (!isCustomerCliche) {
        const width = Number(item.clicheW || item.cliche_w || 0) || 0;
        const height = Number(item.clicheH || item.cliche_h || 0) || 0;
        const areaCm = width > 0 && height > 0 ? ((width + 10) * (height + 10)) / 100 : 0;
        const calculatedCliche = areaCm * 250;
        extraCost += Math.max(3500, calculatedCliche);
      }

      const setupCost = isNotebookEmboss ? 7000 : 5000;
      const isFoil = item.embossType === 'foil' || /фольг|foil/i.test(String(item.embossType || item.details || ''));
      const impressionRate = isNotebookEmboss ? 150 : (isFoil ? 65 : 45);
      const impressionsCost = impressionRate * (quantity || 1);

      extraCost += setupCost + impressionsCost;
    }

    return extraCost;
  }

  function runGroupKey(item, index) {
    const baseKey = item.runGroupId !== undefined && item.runGroupId !== null
      ? 'group:' + item.runGroupId
      : (item.id !== undefined && item.id !== null ? 'item:' + item.id : 'index:' + index);
    const productType = item.specData && item.specData.good ? String(item.specData.good) : '';
    return productType ? baseKey + '|product:' + productType : baseKey;
  }

  function itemsForVat(items, includeVat, settings) {
    const normalized = normalizeQuoteSettings(settings);
    const displayItems = items.map(function (item) {
      const adjustmentCharge = internalAdjustmentCharge(item);
      const discountableTotal = amountForVat(Math.max(0, totalOf(item) - adjustmentCharge), includeVat);
      const adjustmentTotal = amountForVat(adjustmentCharge, includeVat);
      const total = discountableTotal + adjustmentTotal;
      const quantity = Number(item.quantity) || 0;
      return Object.assign({}, item, {
        unitPrice: quantity ? total / quantity : 0,
        total: total,
        discountableTotal: discountableTotal
      });
    });

    if (!normalized.discountEnabled) return displayItems;
    if (normalized.discountScope === 'position' && !normalized.discountItemId) return displayItems;

    const discountItems = normalized.discountScope === 'position'
      ? displayItems.filter(function (item) { return runGroupKey(item) === normalized.discountItemId; })
      : displayItems;
    const rawTotal = discountItems.reduce(function (sum, item) {
      return sum + (Number(item.discountableTotal) || 0);
    }, 0);
    if (rawTotal <= 0) return displayItems;

    return displayItems.map(function (item) {
      const currentTotal = Number(item.total) || 0;
      const discountableTotal = Number(item.discountableTotal) || 0;
      if (normalized.discountScope === 'position' && runGroupKey(item) !== normalized.discountItemId) return item;
      let discountedTotal = currentTotal;
      if (normalized.discountType === 'percent') {
        discountedTotal = currentTotal - discountableTotal * Math.min(100, normalized.discountValue) / 100;
      } else {
        const share = rawTotal > 0 ? discountableTotal / rawTotal : 0;
        const appliedDiscount = Math.min(normalized.discountValue, rawTotal);
        discountedTotal = Math.max(0, currentTotal - appliedDiscount * share);
      }
      const quantity = Number(item.quantity) || 0;
      return Object.assign({}, item, {
        unitPrice: quantity ? discountedTotal / quantity : 0,
        total: discountedTotal
      });
    });
  }

  function groupRuns(items) {
    const groups = new Map();
    items.forEach(function (item, index) {
      const key = runGroupKey(item, index);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return Array.from(groups.values());
  }

  function formatAmount(amount) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount);
  }

  window.OrderFinance = {
    vatRate: VAT_RATE,
    amountForVat: amountForVat,
    amountToInclusive: amountToInclusive,
    formatAmount: formatAmount,
    normalizeQuoteSettings: normalizeQuoteSettings,
    itemsForVat: itemsForVat,
    runGroupKey: runGroupKey,
    groupRuns: groupRuns,
    calculate: function (itemsOrOrder, includeVat, settingsOrOptions) {
      const isOrderObj = itemsOrOrder && !Array.isArray(itemsOrOrder) && Array.isArray(itemsOrOrder.items);
      const items = isOrderObj ? itemsOrOrder.items : (Array.isArray(itemsOrOrder) ? itemsOrOrder : []);
      const settings = isOrderObj ? Object.assign({}, itemsOrOrder, settingsOrOptions || {}) : settingsOrOptions;

      const normalized = normalizeQuoteSettings(settings);
      const rawTotal = items.reduce(function (sum, item) {
        return sum + amountForVat(totalOf(item), includeVat);
      }, 0);

      const discounts = calculateDiscount(items, includeVat, normalized);
      const totalWithDiscount = Math.max(0, rawTotal - discounts);
      const visibleTotal = normalized.manualTotal !== null ? normalized.manualTotal : totalWithDiscount;

      const expenses = { poly: 0, souvenir: 0, other: 0, overtime: 0, cashback: 0 };
      items.forEach(function (item) {
        const extraProductionCost = metadataExtraProductionCost(item);
        if (item.productionCostByCategory && typeof item.productionCostByCategory === 'object') {
          Object.keys(item.productionCostByCategory).forEach(function (category) {
            const bucket = category === 'poly' || category === 'souvenir' ? category : 'other';
            expenses[bucket] += Number(item.productionCostByCategory[category]) || 0;
          });
        } else {
          const bucket = item.category === 'poly' || item.category === 'souvenir' ? item.category : 'other';
          expenses[bucket] += Number(item.productionCost) || 0;
        }
        if (extraProductionCost > 0) {
          expenses.other += extraProductionCost;
        }
        const internalAdjustments = Array.isArray(item.quoteInternalAdjustments) ? item.quoteInternalAdjustments : [];
        internalAdjustments.forEach(function (adjustment) {
          if (adjustment.type === 'overtime') expenses.overtime += Number(adjustment.expenseAmount) || 0;
          if (adjustment.type === 'cashback') expenses.cashback += Number(adjustment.expenseAmount) || 0;
        });
        expenses.overtime += Number(item.overtimeExpense) || 0;
      });

      const productionCost = expenses.poly + expenses.souvenir + expenses.other + expenses.overtime + expenses.cashback;
      const margin = visibleTotal - productionCost;
      const marginPercent = visibleTotal !== 0 ? (margin / visibleTotal) * 100 : 0;

      return {
        rawTotal: rawTotal,
        totalWithoutDiscount: rawTotal,
        discountAmount: discounts,
        totalWithDiscount: totalWithDiscount,
        total: visibleTotal,
        finalTotal: visibleTotal,
        productionCost: productionCost,
        totalCost: productionCost,
        expenses: expenses,
        margin: margin,
        totalMargin: margin,
        totalMarginPercent: marginPercent,
        manualTotal: normalized.manualTotal,
        hideTotal: normalized.hideTotal,
        quoteSettings: normalized
      };
    },
    formatKzt: function (amount) {
      return formatAmount(amount) + ' теңге';
    }
  };
})();