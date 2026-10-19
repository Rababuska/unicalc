// ==========================================
// БАЗА ТАРИФОВ И ЛОГИКА ЭКСКЛЮЗИВ (с НДС)
// ==========================================

const exclusiveBagsPrices = [
    { max: 25, price: 600 },
    { max: 50, price: 500 },
    { max: 80, price: 450 },
    { max: 100, price: 430 },
    { max: Infinity, price: 370 }
];

function calculateExclusive(exType, quantity) {
    let totalCost = 0;

    if (exType === 'emboss_notebook' || exType === 'emboss_sheet') {
        let priladka = 7000;
        let udarPrice = (exType === 'emboss_notebook') ? 150 : 100;
        let clicheCost = 0;

        if (!$('#clicheExists').is(':checked')) {
            let w = Number($('#clicheW').val()) || 0;
            let h = Number($('#clicheH').val()) || 0;
            let areaCm = 0;

            // Техническое поле +10 мм к ширине и высоте
            if (w > 0 && h > 0) {
                areaCm = ((w + 10) * (h + 10)) / 100;
            }

            $('#clicheAreaOut').text(`(${areaCm.toFixed(1)} см²)`);

            // 250 тг за см², минималка 3 500 тг
            let calculatedClicheCost = areaCm * 250;
            clicheCost = Math.max(3500, calculatedClicheCost);
        } else {
            $('#clicheAreaOut').text(`(0 см²)`);
        }

        totalCost = clicheCost + priladka + (udarPrice * quantity);

    } else if (exType === 'bags') {
        let tier = exclusiveBagsPrices.find(t => quantity <= t.max);
        let calculatedBagsCost = tier ? tier.price * quantity : 0;
        totalCost = Math.max(12000, calculatedBagsCost); // Минималка 12 000 тг

    } else if (exType === 'die_cutting') {
        let priladka = 8000;
        let udarPrice = 15;
        totalCost = priladka + (udarPrice * quantity);
    }

    return totalCost;
}
