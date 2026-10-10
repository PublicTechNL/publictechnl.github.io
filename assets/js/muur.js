// De muur als slider: horizontaal schuiven met de pijlen, vegen, shift+scroll of de zonebalk.
// De pagina zelf scrolt gewoon verticaal. Zonder JavaScript is het een horizontaal scrollbare strook.
(function () {
    var scroller = document.querySelector('.wall-scroller');
    if (!scroller) return;
    var track = scroller.querySelector('.wall-track');
    var prev = scroller.querySelector('.wall-arrow-prev');
    var next = scroller.querySelector('.wall-arrow-next');
    var links = scroller.querySelectorAll('.wall-nav [data-zone]');
    var zones = scroller.querySelectorAll('.wall-zone');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function scrollTo(x) {
        track.scrollTo({ left: x, behavior: reduce ? 'auto' : 'smooth' });
    }

    function update() {
        var max = track.scrollWidth - track.clientWidth;
        prev.hidden = next.hidden = max <= 0;
        prev.disabled = track.scrollLeft <= 4;
        next.disabled = track.scrollLeft >= max - 4;
        // de zone die nu het meest in beeld is, oplichten in de zonebalk
        var mid = track.scrollLeft + track.clientWidth * 0.35, current = zones[0];
        zones.forEach(function (z) { if (z.offsetLeft <= mid) current = z; });
        links.forEach(function (l) { l.classList.toggle('is-current', l.dataset.zone === current.id); });
    }

    // een flinke stap per klik: zo'n driekwart scherm
    prev.addEventListener('click', function () { scrollTo(track.scrollLeft - track.clientWidth * 0.75); });
    next.addEventListener('click', function () { scrollTo(track.scrollLeft + track.clientWidth * 0.75); });

    links.forEach(function (l) {
        l.addEventListener('click', function (e) {
            var zone = document.getElementById(l.dataset.zone);
            if (!zone) return;
            e.preventDefault();
            var pad = parseFloat(getComputedStyle(zone).scrollMarginLeft) || 0;
            scrollTo(zone.offsetLeft - pad);
        });
    });

    track.addEventListener('keydown', function (e) {
        if (e.target !== track) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
    });

    // Een A4'tje van de muur halen en groot lezen
    var dialog = document.querySelector('.a4-dialog');
    var sheet = dialog && dialog.querySelector('.a4-dialog-sheet');
    function open(a4) {
        if (!dialog || !dialog.showModal) return;
        sheet.innerHTML = '';
        var copy = a4.cloneNode(true);
        copy.removeAttribute('tabindex');
        copy.removeAttribute('role');
        copy.removeAttribute('aria-haspopup');
        copy.removeAttribute('aria-label');
        copy.classList.add('a4-open');
        var item = a4.closest('.wall-item');
        if (item && item.style.cssText) sheet.style.cssText = item.style.cssText;
        sheet.appendChild(copy);
        dialog.showModal();
    }
    scroller.querySelectorAll('.a4').forEach(function (a4) {
        a4.addEventListener('click', function (e) {
            if (e.target.closest('a')) return; // links op het velletje werken gewoon
            open(a4);
        });
        a4.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(a4); }
        });
    });
    if (dialog) {
        dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    }

    // Toetsenbord: een velletje in focus horizontaal in beeld brengen
    scroller.addEventListener('focusin', function (e) {
        var item = e.target.closest('.wall-item');
        if (!item) return;
        var r = item.getBoundingClientRect(), t = track.getBoundingClientRect();
        if (r.left < t.left || r.right > t.right) item.scrollIntoView({ inline: 'center', block: 'nearest' });
    });

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    update();
})();
