// ==========================================================================
// МОДУЛЬ ГЕНЕРАЦИИ ВЕКТОРНЫХ PDF (js/pdf.js)
// ==========================================================================

const PdfGenerator = {
    download: function(savedItems, companyName, dateStr, includeVat, grandTotal, maxDeliveryTime, managerInfo) {
        if (typeof pdfMake === 'undefined') {
            alert('Библиотека pdfmake не загружена!');
            return;
        }

        managerInfo = managerInfo || {};
        let comp = companyName ? companyName.trim().toUpperCase() : 'БЕЗ НАЗВАНИЯ';
        let vatLabel = includeVat ? 'с учетом НДС' : 'без учета НДС';

        // 1. Формируем шапку таблицы с единицами измерения
        let tableBody = [
            [
                { text: '№', style: 'tableHeader' },
                { text: 'Наименование', style: 'tableHeader' },
                { text: 'Данные', style: 'tableHeader' },
                { text: 'Кол-во /\nшт', style: 'tableHeader' },
                { text: 'Стоимость за единицу /\nтеңге', style: 'tableHeader' },
                { text: 'Итого /\nтеңге', style: 'tableHeader' },
                { text: 'Срок /\nрабочие дни', style: 'tableHeader' }
            ]
        ];

        // 2. Заполняем строки товарами
        savedItems.forEach((it, idx) => {
            let cleanDesc = (it.desc || '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>?/gm, '');

            // Формируем ячейку наименования с поддержкой фото
            let titleCellContent = [
                { 
                    text: it.title || '', 
                    bold: true, 
                    alignment: 'center', 
                    margin: [0, 2, 0, it.photo ? 4 : 2] 
                }
            ];

            // Если прикреплено фото (Base64), добавляем его в ячейку наименования
            if (it.photo && typeof it.photo === 'string' && it.photo.startsWith('data:image')) {
                titleCellContent.push({
                    image: it.photo,
                    fit: [65, 65], // Пропорциональное вписывание в квадрат 65х65 pt
                    alignment: 'center',
                    margin: [0, 0, 0, 2]
                });
            }

            tableBody.push([
                { text: (idx + 1).toString(), alignment: 'center', margin: [0, 4, 0, 4] },
                titleCellContent,
                { text: cleanDesc, alignment: 'left', margin: [0, 4, 0, 4] },
                { text: it.circulation.toString(), alignment: 'center', margin: [0, 4, 0, 4] },
                { text: it.one_total.toString(), alignment: 'center', margin: [0, 4, 0, 4] },
                { text: it.total.toString(), bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: (it.delivery || '-').toString(), alignment: 'center', margin: [0, 4, 0, 4] }
            ]);
        });

        // 3. Итоговая строка
        tableBody.push([
            { text: `ИТОГО ПО ЗАКАЗУ (${vatLabel}):`, colSpan: 5, alignment: 'right', bold: true, margin: [0, 5, 5, 5] },
            {}, {}, {}, {},
            { text: grandTotal.toString(), bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
            { text: maxDeliveryTime.toString(), alignment: 'center', margin: [0, 5, 0, 5] }
        ]);

        // 4. Главный конфиг документа
        let docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [30, 40, 30, 40], // Отступы: лево, верх, право, низ
            
            content: [
                // Шапка документа
                { text: 'V.T.O. Creative & Marketing Laboratory', fontSize: 18, bold: true, alignment: 'center', color: '#1a4e8a', margin: [0, 0, 0, 5] },
                { text: 'Коммерческое предложение', fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },

                // Заголовок документа
                { text: `КП ${dateStr} ${comp}`, style: 'header' },
                
                // Таблица
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', '17%', '*', 'auto', '13%', '11%', '11%'],
                        body: tableBody
                    },
                    layout: {
                        fillColor: function (rowIndex) { return (rowIndex === 0) ? '#f2f2f2' : null; }
                    }
                },

                // Подвал с контактами менеджера
                {
                    margin: [0, 25, 0, 0],
                    text: [
                        '________________________________\n',
                        { text: (managerInfo.name || 'Менеджер') + '\n', bold: true, fontSize: 11, margin: [0, 5, 0, 0] },
                        'Специалист лаборатории VTO\n',
                        (managerInfo.phone || '+7 (___) ___-__-__') + '\n',
                        (managerInfo.internal || '+7 (727) 357-22-77') + '\n',
                        'Email: ' + (managerInfo.email || 'info@vto.kz') + '\n',
                        'Сайт: ',
                        { text: 'https://vto.kz/\n', color: 'blue', decoration: 'underline', link: 'https://vto.kz/' },
                        'Сувенирный каталог: ',
                        { text: 'https://vto.kz/shop/\n', color: 'blue', decoration: 'underline', link: 'https://vto.kz/shop/' },
                        'Витрина презентаций: ',
                        { text: 'https://vto.kz/presentations/\n', color: 'blue', decoration: 'underline', link: 'https://vto.kz/presentations/' },
                        'Новогодний раздел: ',
                        { text: 'https://vto.kz/new-year/', color: 'blue', decoration: 'underline', link: 'https://vto.kz/new-year/' }
                    ],
                    fontSize: 9.5,
                    lineHeight: 1.25
                }
            ],
            styles: {
                header: { fontSize: 13, bold: true, alignment: 'center', margin: [0, 0, 0, 15] },
                tableHeader: { bold: true, alignment: 'center', fillColor: '#f2f2f2', margin: [0, 5, 0, 5] }
            },
            defaultStyle: {
                fontSize: 9
            }
        };

        let fileName = `КП_${comp.replace(/[^a-zа-яё0-9]/gi, '_')}_${dateStr}.pdf`;
        pdfMake.createPdf(docDefinition).download(fileName);
    }
};