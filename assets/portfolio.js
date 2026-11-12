// Bascule Design / Code du hero (onglets accessibles au clavier)
(function () {
    const tabs = Array.from(document.querySelectorAll('.duo-switch [role="tab"]'));
    if (!tabs.length) return;

    function select(tab, focus) {
        tabs.forEach(function (t) {
            const active = t === tab;
            t.setAttribute('aria-selected', String(active));
            t.tabIndex = active ? 0 : -1;
            document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
        });
        if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(tab, false); });
        tab.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const dir = e.key === 'ArrowRight' ? 1 : -1;
                select(tabs[(i + dir + tabs.length) % tabs.length], true);
            }
        });
    });
})();

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
