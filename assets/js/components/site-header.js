/*
 * En-tête commun : remplit <header class="top" data-site-header> à partir
 * de NAV et CTA (config/navigation.js).
 *
 * Deux modes :
 * - barre : marque, liens en ligne, lien « Me contacter » (grand écran) ;
 * - compact (classe .is-compact) : bouton « Menu » qui ouvre un panneau avec
 *   tous les liens. Toujours activé sur petit écran (COMPACT_QUERY) ; au-delà,
 *   seulement si la barre ne tient pas en largeur (plus de liens, libellés
 *   plus longs, autre langue).
 */
import { NAV, CTA, BRAND, LABELS } from '../config/navigation.js';
import { resolveLink } from '../utils/site-root.js';
import { escapeHtml } from '../utils/html.js';
import { starIcon, arrowIcon } from './icons.js';

// Sous ce seuil, le menu compact est toujours utilisé ; au-dessus, la barre
// reste affichée tant qu'elle tient (mesure dans barFits)
export const COMPACT_QUERY = '(max-width: 820px)';
const PANEL_ID = 'site-menu';

function linkAttrs(href) {
    const link = resolveLink(href);
    return `href="${escapeHtml(link.href)}"${link.current ? ' aria-current="page"' : ''}`;
}

function template() {
    const navLinks = NAV.map((item) => `<a ${linkAttrs(item.href)}>${escapeHtml(item.label)}</a>`).join('');
    const menuItems = NAV.map((item, i) => `
            <li style="--i:${i}"><a class="menu-link" ${linkAttrs(item.href)}><span class="menu-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="menu-link-label">${escapeHtml(item.label)}</span></a></li>`).join('');

    return `
        <a class="top-brand" ${linkAttrs(BRAND.href)}>${starIcon()}<span>${escapeHtml(BRAND.role)}</span></a>
        <nav class="top-nav" aria-label="${escapeHtml(LABELS.mainNav)}">${navLinks}</nav>
        <a class="top-cta" ${linkAttrs(CTA.href)}>${escapeHtml(CTA.label)} ${arrowIcon()}</a>
        <button class="top-toggle" type="button" aria-expanded="false" aria-controls="${PANEL_ID}">
            <span class="top-toggle-icon" aria-hidden="true"></span>${escapeHtml(LABELS.menu)}
        </button>
        <div class="top-panel" id="${PANEL_ID}">
            <nav aria-label="${escapeHtml(LABELS.menuNav)}">
                <ul class="menu-list" role="list">${menuItems}
                </ul>
                <a class="btn btn-solid menu-cta" ${linkAttrs(CTA.href)}>${escapeHtml(CTA.label)} ${arrowIcon()}</a>
            </nav>
        </div>`;
}

export function mountHeader() {
    const header = document.querySelector('[data-site-header]');
    if (!header) return null;

    header.innerHTML = template();

    const toggle = header.querySelector('.top-toggle');
    const panel = header.querySelector('.top-panel');
    const compactQuery = window.matchMedia(COMPACT_QUERY);

    function isOpen() {
        return toggle.getAttribute('aria-expanded') === 'true';
    }

    function setOpen(open, { returnFocus = false } = {}) {
        if (open === isOpen()) return;
        toggle.setAttribute('aria-expanded', String(open));
        header.classList.toggle('is-menu-open', open);
        if (!open && returnFocus) toggle.focus();
    }

    // Largeur naturelle de la barre (les éléments ne passent pas à la ligne)
    function barFits() {
        const style = getComputedStyle(header);
        const gap = parseFloat(style.columnGap) || 0;
        const items = ['.top-brand', '.top-nav', '.top-cta'].map((s) => header.querySelector(s));
        const needed = items.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0)
            + gap * (items.length - 1)
            + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        return needed <= header.clientWidth + 0.5;
    }

    // Mode compact : forcé sous le seuil, sinon seulement si la barre ne tient pas
    function updateMode() {
        let compact = compactQuery.matches;
        if (!compact) {
            header.classList.remove('is-compact');
            compact = !barFits();
        }
        header.classList.toggle('is-compact', compact);
        if (!compact) setOpen(false);
    }

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Un lien choisi ferme le menu (navigation ou défilement vers la section)
    panel.addEventListener('click', (event) => {
        if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) {
            event.preventDefault();
            setOpen(false, { returnFocus: true });
        }
    });

    // Le focus clavier quitte l'en-tête : le panneau se referme
    header.addEventListener('focusout', (event) => {
        if (isOpen() && event.relatedTarget && !header.contains(event.relatedTarget)) setOpen(false);
    });

    let pending = false;
    function scheduleUpdate() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { pending = false; updateMode(); });
    }
    compactQuery.addEventListener('change', updateMode);
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateMode);

    updateMode();
    return header;
}
