// Lange indexkaarten inklappen tot een vaste hoogte, met "Lees meer" om ze uit te klappen.
// Zonder JavaScript blijven alle kaarten gewoon helemaal open.
(function () {
    var MAX = 380;

    document.querySelectorAll('.lab-card').forEach(function (card, i) {
        // echte inhoudshoogte meten, niet de door het raster uitgerekte hoogte
        card.style.alignSelf = 'start';
        var natural = card.offsetHeight;
        card.style.alignSelf = '';
        if (natural <= MAX + 80) return;

        var meta = card.querySelector('.lab-meta');
        if (meta && !meta.id) meta.id = 'kaart-' + (i + 1);

        var fade = document.createElement('div');
        fade.className = 'lab-card-more';
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lab-card-toggle';
        button.textContent = 'Lees meer';
        button.setAttribute('aria-expanded', 'false');
        if (meta) button.setAttribute('aria-controls', meta.id);
        fade.appendChild(button);
        card.appendChild(fade);
        card.classList.add('is-collapsible', 'is-collapsed');

        button.addEventListener('click', function () {
            var open = card.classList.toggle('is-collapsed') === false;
            button.textContent = open ? 'Minder' : 'Lees meer';
            button.setAttribute('aria-expanded', String(open));
            if (!open) card.scrollIntoView({ block: 'nearest' });
        });
    });
})();
