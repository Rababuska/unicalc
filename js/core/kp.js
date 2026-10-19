(function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function buildDocument(items, companyName, includeVat, quoteSettings) {
    const settings = OrderFinance.normalizeQuoteSettings(quoteSettings);
    const displayItems = OrderFinance.itemsForVat(items, includeVat, settings);
    const runGroups = OrderFinance.groupRuns(displayItems);
    const totals = OrderFinance.calculate(items, includeVat, settings);
    const vatLabel = includeVat === false ? 'без учета НДС' : 'с учетом НДС 16%';
    const rows = runGroups.map(function (runItems, index) {
      const item = runItems[0];
      const photos = Array.isArray(item.photos) ? item.photos : (item.photo ? [item.photo] : []);
      const photo = photos.filter(function (source) {
        return typeof source === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(source);
      }).map(function (source) {
        return '<br><img src="' + escapeHtml(source) + '" style="max-width:75px;max-height:75px;object-fit:contain">';
      }).join('');
      return '<tr><td>' + (index + 1) + '</td><td><strong>' + escapeHtml(item.title) + '</strong>' +
        photo +
        (item.details ? '<br><small>' + escapeHtml(item.details) + '</small>' : '') +
        '</td><td>' + runItems.map(function (run) { return escapeHtml(run.quantity); }).join('<br>') + '</td><td>' + runItems.map(function (run) { return OrderFinance.formatAmount(run.unitPrice); }).join('<br>') +
        '</td><td>' + runItems.map(function (run) { return OrderFinance.formatAmount(run.total); }).join('<br>') + '</td><td>' + runItems.map(function (run) { return escapeHtml(run.delivery || '-'); }).join('<br>') + '</td></tr>';
    }).join('');

    const totalText = totals.hideTotal ? 'Итог скрыт' : (totals.manualTotal !== null ? 'Ручной итог: ' + OrderFinance.formatAmount(totals.total) + ' теңге' : 'Итого по КП (' + vatLabel + '): ' + OrderFinance.formatAmount(totals.total) + ' теңге');

    return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Коммерческое предложение</title>' +
      '<style>body{font:14px Arial,sans-serif;color:#222;margin:32px}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #777;padding:8px;text-align:left}th{background:#eee}.totals{margin:20px 0 0 auto;width:320px}.totals div{display:flex;justify-content:space-between;padding:5px 0}.grand{font-weight:bold;border-top:1px solid #444;font-size:16px}@media print{body{margin:12mm}}</style>' +
      '</head><body><h1>Коммерческое предложение</h1>' +
      (companyName ? '<p>Клиент: ' + escapeHtml(companyName) + '</p>' : '') +
      '<p>Дата: ' + new Intl.DateTimeFormat('ru-RU').format(new Date()) + '</p>' +
      '<table><thead><tr><th>№</th><th>Наименование</th><th>Кол-во</th><th>Цена за ед. / теңге</th><th>Сумма / теңге</th><th>Срок</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      (totals.hideTotal ? '' : '<div class="totals"><div class="grand"><span>' + escapeHtml(totalText) + '</span></div></div>') +
      '<script>window.onload=function(){window.print()}<\/script></body></html>';
  }

  function buildWordTable(items, companyName, includeVat, quoteSettings) {
    const settings = OrderFinance.normalizeQuoteSettings(quoteSettings);
    const displayItems = OrderFinance.itemsForVat(items, includeVat, settings);
    const runGroups = OrderFinance.groupRuns(displayItems);
    const heading = 'КП ' + new Intl.DateTimeFormat('ru-RU').format(new Date()) + ' ' + (companyName || 'БЕЗ НАЗВАНИЯ').toUpperCase();
    const rows = runGroups.map(function (runItems, index) {
      const item = runItems[0];
      const photos = Array.isArray(item.photos) ? item.photos : (item.photo ? [item.photo] : []);
      const images = photos.filter(function (source) {
        return typeof source === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(source);
      }).map(function (source) {
        return '<br><img src="' + escapeHtml(source) + '" width="75" style="max-width:75px;max-height:75px">';
      }).join('');
      const details = escapeHtml(item.details).replace(/\n/g, '<br>');
      return '<tr><td>' + (index + 1) + '</td><td><strong>' + escapeHtml(item.title) + '</strong>' + images +
        '</td><td>' + details + '</td><td>' + runGroups[index].map(function (run) { return escapeHtml(run.quantity); }).join('<br>') + '</td><td>' +
        runGroups[index].map(function (run) { return escapeHtml(OrderFinance.formatAmount(run.unitPrice)); }).join('<br>') + '</td><td><strong>' + runGroups[index].map(function (run) { return escapeHtml(OrderFinance.formatAmount(run.total)); }).join('<br>') + '</strong></td><td>' +
        runGroups[index].map(function (run) { return escapeHtml(run.delivery || '-'); }).join('<br>') + '</td></tr>';
    }).join('');
    const totals = OrderFinance.calculate(items, includeVat, settings);
    const vatLabel = includeVat === false ? 'без учета НДС' : 'с учетом НДС 16%';
    const totalText = totals.hideTotal ? 'Итог скрыт' : 'ИТОГО ПО ЗАКАЗУ (' + vatLabel + '):';
    const totalValue = totals.hideTotal ? '' : OrderFinance.formatAmount(totals.total) + ' теңге';
    return '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font:13px Times New Roman,serif;color:#000">' +
      '<thead><tr><th colspan="7">' + escapeHtml(heading) + '</th></tr><tr><th>№</th><th>Наименование</th><th>Данные</th><th>Кол-во / шт</th><th>Цена за ед. / теңге</th><th>Итого / теңге</th><th>Срок / раб. дни</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot><tr><td colspan="5" align="right"><strong>' + escapeHtml(totalText) + '</strong></td><td><strong>' +
      totalValue + '</strong></td><td></td></tr></tfoot></table>';
  }

  function copyWordTable(items, companyName, includeVat, quoteSettings) {
    if (!items.length) return false;
    const holder = document.createElement('div');
    holder.contentEditable = 'true';
    holder.style.cssText = 'position:fixed;left:-10000px;top:0';
    holder.innerHTML = buildWordTable(items, companyName, includeVat, quoteSettings);
    document.body.appendChild(holder);
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(holder);
    selection.removeAllRanges();
    selection.addRange(range);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      selection.removeAllRanges();
      holder.remove();
    }
    return copied;
  }

  function plainDescription(value) {
    return String(value == null ? '' : value)
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ');
  }

  function convertPdfImage(source) {
    if (/^data:image\/(?:png|jpe?g);base64,/i.test(source)) return Promise.resolve(source);
    if (!/^data:image\/(?:gif|webp);base64,/i.test(source)) return Promise.resolve('');
    return new Promise(function (resolve) {
      const image = new Image();
      image.onload = function () {
        try {
          const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) return resolve('');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          resolve('');
        }
      };
      image.onerror = function () { resolve(''); };
      image.src = source;
    });
  }

  async function downloadPdf(items, companyName, pdfMake, managerInfo, includeVat, quoteSettings) {
    if (!items.length || !pdfMake || typeof pdfMake.createPdf !== 'function') return Promise.resolve(false);
    const settings = OrderFinance.normalizeQuoteSettings(quoteSettings);
    const displayItems = OrderFinance.itemsForVat(items, includeVat, settings);
    const runGroups = OrderFinance.groupRuns(displayItems);
    const imageSources = Array.from(new Set(displayItems.reduce(function (sources, item) {
      const photos = Array.isArray(item.photos) ? item.photos : (item.photo ? [item.photo] : []);
      return sources.concat(photos.filter(function (source) { return typeof source === 'string'; }));
    }, [])));
    const pdfImages = new Map();
    await Promise.all(imageSources.map(async function (source) {
      pdfImages.set(source, await convertPdfImage(source));
    }));
    const vatLabel = includeVat === false ? 'без учета НДС' : 'с учетом НДС 16%';
    const tableBody = [[
      { text: '№', style: 'tableHeader' },
      { text: 'Наименование', style: 'tableHeader' },
      { text: 'Данные', style: 'tableHeader' },
      { text: 'Кол-во / шт', style: 'tableHeader' },
      { text: 'Стоимость за единицу / теңге', style: 'tableHeader' },
      { text: 'Итого / теңге', style: 'tableHeader' },
      { text: 'Срок / раб. дни', style: 'tableHeader' }
    ]];

    runGroups.forEach(function (runItems, index) {
      const item = runItems[0];
      const photos = Array.isArray(item.photos) ? item.photos : (item.photo ? [item.photo] : []);
      const titleContent = [{ text: item.title || '', bold: true, alignment: 'center', margin: [0, 2, 0, 4] }];
      photos.forEach(function (photo) {
        const pdfImage = pdfImages.get(photo);
        if (pdfImage) titleContent.push({ image: pdfImage, fit: [65, 65], alignment: 'center', margin: [0, 0, 0, 3] });
      });
      tableBody.push([
        { text: String(index + 1), alignment: 'center' },
        titleContent,
        { text: plainDescription(item.details), alignment: 'left' },
        { text: runItems.map(function (run) { return String(run.quantity); }).join('\n'), alignment: 'center' },
        { text: runItems.map(function (run) { return OrderFinance.formatAmount(run.unitPrice); }).join('\n'), alignment: 'center' },
        { text: runItems.map(function (run) { return OrderFinance.formatAmount(run.total); }).join('\n'), bold: true, alignment: 'center' },
        { text: runItems.map(function (run) { return run.delivery || '-'; }).join('\n'), alignment: 'center' }
      ]);
    });

    const totals = OrderFinance.calculate(items, includeVat, settings);
    if (!totals.hideTotal) {
      tableBody.push([
        { text: totals.manualTotal !== null ? 'РУЧНОЙ ИТОГ:' : 'ИТОГО ПО ЗАКАЗУ (' + vatLabel + '):', colSpan: 5, alignment: 'right', bold: true },
        {}, {}, {}, {},
        { text: OrderFinance.formatAmount(totals.total) + ' теңге', bold: true, alignment: 'center' },
        { text: '', alignment: 'center' }
      ]);
    }

    const date = new Intl.DateTimeFormat('ru-RU').format(new Date());
    const company = companyName ? companyName.trim().toUpperCase() : 'БЕЗ НАЗВАНИЯ';
    const manager = managerInfo || {};
    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 40, 30, 40],
      content: [
        { text: 'V.T.O. Creative & Marketing Laboratory', fontSize: 18, bold: true, alignment: 'center', color: '#1a4e8a', margin: [0, 0, 0, 5] },
        { text: 'Коммерческое предложение', fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
        { text: 'КП ' + date + ' ' + company, style: 'header' },
        { table: { headerRows: 1, widths: ['auto', '17%', '*', 'auto', '13%', '11%', '11%'], body: tableBody }, layout: { fillColor: function (rowIndex) { return rowIndex === 0 ? '#f2f2f2' : null; } } },
        {
          margin: [0, 25, 0, 0],
          text: [
            '________________________________\n',
            { text: (manager.name || 'Менеджер') + '\n', bold: true, fontSize: 11 },
            'Специалист лаборатории VTO\n',
            (manager.phone || '+7 (___) ___-__-__') + '\n',
            (manager.internal || '+7 (727) 357-22-77') + '\n',
            'Email: ' + (manager.email || 'info@vto.kz') + '\n',
            'Сайт: https://vto.kz/\n'
          ],
          fontSize: 9.5,
          lineHeight: 1.25
        }
      ],
      styles: {
        header: { fontSize: 13, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },
        tableHeader: { bold: true, alignment: 'center', fillColor: '#f2f2f2', margin: [0, 5, 0, 5] }
      },
      defaultStyle: { fontSize: 9 }
    };
    const filename = 'КП_' + company.replace(/[^a-zа-яё0-9]/gi, '_') + '_' + date + '.pdf';

    return new Promise(function (resolve, reject) {
      try {
        pdfMake.createPdf(docDefinition).getBlob(function (blob) {
          try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
            resolve(true);
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  window.OrderKP = {
    open: function (items, companyName, includeVat, quoteSettings) {
      if (!items.length) return false;
      const documentWindow = window.open('', '_blank');
      if (!documentWindow) return false;
      documentWindow.document.open();
      documentWindow.document.write(buildDocument(items, companyName, includeVat, quoteSettings));
      documentWindow.document.close();
      return true;
    },
    copy: copyWordTable,
    downloadPdf: downloadPdf
  };
})();
