(function () {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Année du pied de page
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    // Animation d'entrée : on attend les polices pour éviter un saut de texte
    const start = function () { root.classList.add('is-loaded'); };
    if (document.fonts && document.fonts.ready) {
        Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]).then(start);
    } else {
        start();
    }

    // Décalage progressif des éléments d'un même groupe
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
        group.querySelectorAll('[data-reveal]').forEach(function (el, i) {
            el.style.setProperty('--i', i);
        });
    });

    // Apparition au défilement
    const reveals = document.querySelectorAll('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) {
        reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -10% 0px' });
        reveals.forEach(function (el) { io.observe(el); });
    }

    if (reduce) return;

    // Barre de progression et parallaxe du hero
    const movers = Array.from(document.querySelectorAll('[data-speed]'));
    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            const y = window.scrollY;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            root.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : 0);
            if (y < window.innerHeight * 1.5) {
                movers.forEach(function (el) {
                    el.style.setProperty('--shift', (y * parseFloat(el.dataset.speed)).toFixed(1) + 'px');
                });
            }
            ticking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Inclinaison 3D des maquettes au survol (souris uniquement)
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('[data-tilt]').forEach(function (mock) {
            mock.addEventListener('pointermove', function (e) {
                const r = mock.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                mock.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
                mock.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
                mock.style.setProperty('--px', (x * -14).toFixed(1) + 'px');
                mock.style.setProperty('--py', (y * -10).toFixed(1) + 'px');
            });
            mock.addEventListener('pointerleave', function () {
                ['--rx', '--ry', '--px', '--py'].forEach(function (p) { mock.style.removeProperty(p); });
            });
        });
    }
})();
