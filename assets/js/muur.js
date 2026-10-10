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
        if (item && item.dataset.id) copy.appendChild(linkedData(item.dataset.id));
        sheet.appendChild(copy);
        dialog.showModal();
    }
    // Het stukje linked data van een concept, uit /publicxs.jsonld (één bron, geen kopie)
    var ldUrl = (document.querySelector('link[rel="alternate"][type="application/ld+json"]') || {}).href;
    var ldGraph = null;
    function loadGraph() {
        if (!ldGraph) ldGraph = fetch(ldUrl).then(function (r) { return r.json(); }).then(function (d) { return d['@graph']; });
        return ldGraph;
    }
    function linkedData(id) {
        var box = document.createElement('div');
        box.className = 'a4-ld';
        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'a4-ld-toggle';
        toggle.textContent = '{ } linked data';
        toggle.setAttribute('aria-expanded', 'false');
        var panel = document.createElement('div');
        panel.className = 'a4-ld-data';
        panel.hidden = true;
        toggle.addEventListener('click', function () {
            var open = panel.hidden;
            panel.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            if (!open || panel.dataset.loaded || !ldUrl) return;
            panel.textContent = 'laden…';
            loadGraph().then(function (graph) {
                var node = graph.filter(function (n) { return /\/id\/concept\//.test(n['@id']) && n['@id'].split('/').pop() === id; })[0];
                if (!node) { panel.textContent = 'Geen linked data gevonden.'; return; }
                panel.dataset.loaded = '1';
                panel.innerHTML = '';
                var uri = document.createElement('p');
                uri.className = 'a4-ld-uri';
                var code = document.createElement('code');
                code.textContent = node['@id'];
                var copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.textContent = 'kopieer';
                copyBtn.addEventListener('click', function () {
                    navigator.clipboard && navigator.clipboard.writeText(node['@id']).then(function () { copyBtn.textContent = 'gekopieerd'; });
                });
                uri.appendChild(code);
                uri.appendChild(copyBtn);
                var pre = document.createElement('pre');
                pre.textContent = JSON.stringify(node, null, 2);
                var more = document.createElement('a');
                more.href = ldUrl;
                more.textContent = 'hele dataset (PublicXS, JSON-LD)';
                panel.appendChild(uri);
                panel.appendChild(pre);
                panel.appendChild(more);
            }).catch(function () { panel.textContent = 'Kon de linked data niet laden.'; });
        });
        box.appendChild(toggle);
        box.appendChild(panel);
        return box;
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

    // Rode draadjes tussen verbonden concepten, van speldje naar speldje (bovenaan de velletjes)
    var wall = scroller.querySelector('.wall');
    var threads = scroller.querySelector('.wall-threads');
    function drawThreads() {
        if (!threads) return;
        var base = wall.getBoundingClientRect();
        threads.setAttribute('width', wall.scrollWidth);
        threads.setAttribute('height', wall.scrollHeight);
        var out = '';
        function pin(item) {
            var r = item.querySelector('.a4').getBoundingClientRect();
            return { x: r.left - base.left + r.width * 0.78, y: r.top - base.top + 14 };
        }
        scroller.querySelectorAll('.wall-item[data-verbonden]').forEach(function (from) {
            from.dataset.verbonden.split(' ').forEach(function (id) {
                var to = scroller.querySelector('.wall-item[data-id="' + id + '"]');
                if (!to) return;
                var a = pin(from), b = pin(to);
                // het draadje hangt een beetje door
                var sag = Math.min(120, Math.abs(b.x - a.x) * 0.18 + 30);
                var mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y) + sag;
                out += '<path d="M' + a.x + ' ' + a.y + ' Q' + mx + ' ' + my + ' ' + b.x + ' ' + b.y + '"/>';
                out += '<circle cx="' + a.x + '" cy="' + a.y + '" r="5"/><circle cx="' + b.x + '" cy="' + b.y + '" r="5"/>';
            });
        });
        threads.innerHTML = out;
    }

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', drawThreads);
    window.addEventListener('load', drawThreads);
    drawThreads();
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    update();
})();
