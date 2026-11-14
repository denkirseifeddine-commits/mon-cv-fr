/*
 * En-tête commun : remplit <header class="top" data-site-header> à partir
 * de NAV et CTA (config/navigation.js).
 *
 * Deux modes :
 * - barre : marque, liens en ligne, lien « Demander un devis », sélecteur
 *   de langue (grand écran) ;
 * - compact (classe .is-compact) : bouton « Menu » qui ouvre un panneau avec
 *   tous les liens et le sélecteur de langue. Toujours activé sur petit écran
 *   (COMPACT_QUERY) ; au-delà, seulement si la barre ne tient pas en largeur
 *   (plus de liens, libellés plus longs, autre langue).
 *
 * Sélecteur de langue : un lien par langue vers la même page dans cette
 * langue (alternateUrl), paramètres d'adresse conservés. L'adresse est
 * recalculée au survol, au focus et au clic, car les pages Catalogue et
 * Questionnaire réécrivent leurs paramètres sans recharger.
 */
import { NAV, CTA, BRAND, label, pageHref } from '../config/navigation.js';
import { LOCALES, locale, t, alternateUrl } from '../i18n/index.js';
import { resolveLink } from '../utils/site-root.js';
import { escapeHtml } from '../utils/html.js';
import { starIcon, arrowIcon } from './icons.js';

// Sous ce seuil, le menu compact est toujours utilisé ; au-dessus, la barre
// reste affichée tant qu'elle tient (mesure dans barFits)
export const COMPACT_QUERY = '(max-width: 820px)';
const PANEL_ID = 'site-menu';

// href (préfixé par la racine et la langue) et aria-current de la page affichée ;
// hreflang pour une page d'une autre langue (le CV)
function linkAttrs(item) {
    const link = resolveLink(pageHref(item));
    const hreflang = item.lang && item.lang !== locale() ? ` hreflang="${escapeHtml(item.lang)}"` : '';
    return `href="${escapeHtml(link.href)}"${hreflang}${link.current ? ' aria-current="page"' : ''}`;
}

// Sélecteur de langue : FR, EN, ع ; la langue de la page est marquée aria-current
function langSwitchHtml(className) {
    const current = locale();
    const items = LOCALES.map((l) => `<li><a class="lang-link" href="${escapeHtml(alternateUrl(l.code))}" data-locale="${l.code}" lang="${l.code}" hreflang="${l.code}" aria-label="${escapeHtml(l.name)}"${l.code === current ? ' aria-current="true"' : ''}>${escapeHtml(l.short)}</a></li>`).join('');
    return `<ul class="${className}" role="list" aria-label="${escapeHtml(t('header.languages'))}">${items}</ul>`;
}

function template() {
    const navLinks = NAV.map((item) => `<a ${linkAttrs(item)}>${escapeHtml(label(item))}</a>`).join('');
    const menuItems = NAV.map((item, i) => `
            <li style="--i:${i}"><a class="menu-link" ${linkAttrs(item)}><span class="menu-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="menu-link-label">${escapeHtml(label(item))}</span></a></li>`).join('');

    return `
        <a class="top-brand" ${linkAttrs(BRAND)}>${starIcon()}<span>${escapeHtml(t(BRAND.roleKey))}</span></a>
        <nav class="top-nav" aria-label="${escapeHtml(t('header.mainNav'))}">${navLinks}</nav>
        <a class="top-cta" ${linkAttrs(CTA)}>${escapeHtml(label(CTA))} ${arrowIcon()}</a>
        ${langSwitchHtml('top-lang')}
        <button class="top-toggle" type="button" aria-expanded="false" aria-controls="${PANEL_ID}">
            <span class="top-toggle-icon" aria-hidden="true"></span>${escapeHtml(t('header.menu'))}
        </button>
        <div class="top-panel" id="${PANEL_ID}">
            <nav aria-label="${escapeHtml(t('header.menuNav'))}">
                <ul class="menu-list" role="list">${menuItems}
                </ul>
                <a class="btn btn-solid menu-cta" ${linkAttrs(CTA)}>${escapeHtml(label(CTA))} ${arrowIcon()}</a>
            </nav>
            ${langSwitchHtml('menu-lang')}
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
        const items = ['.top-brand', '.top-nav', '.top-cta', '.top-lang'].map((s) => header.querySelector(s));
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

    // Adresse du sélecteur recalculée juste avant usage (paramètres à jour)
    const refreshLang = (event) => {
        const link = event.target.closest && event.target.closest('.lang-link');
        if (link) link.setAttribute('href', alternateUrl(link.dataset.locale));
    };
    ['pointerover', 'focusin', 'click'].forEach((type) => header.addEventListener(type, refreshLang));

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
