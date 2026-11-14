/*
 * Pied de page commun : remplit <footer class="footer" data-site-footer>
 * à partir de BRAND, NAV et CONTACT (config/navigation.js).
 */
import { NAV, BRAND, CONTACT, label, pageHref } from '../config/navigation.js';
import { locale, t } from '../i18n/index.js';
import { resolveLink } from '../utils/site-root.js';
import { escapeHtml } from '../utils/html.js';
import { starIcon, mailIcon, phoneIcon, pinIcon, linkedinIcon } from './icons.js';

// href (préfixé par la racine et la langue), hreflang d'une page d'une autre langue, aria-current
function linkAttrs(item) {
    const link = resolveLink(pageHref(item));
    const hreflang = item.lang && item.lang !== locale() ? ` hreflang="${escapeHtml(item.lang)}"` : '';
    return `href="${escapeHtml(link.href)}"${hreflang}${link.current ? ' aria-current="page"' : ''}`;
}

function template() {
    const links = NAV.map((item) => `<li><a ${linkAttrs(item)}><span>${escapeHtml(label(item))}</span></a></li>`).join('');
    // Retour en haut : ancre #top si la page la fournit, sinon haut du document
    const topHref = document.getElementById('top') ? '#top' : '#';

    return `
        <div class="footer-main">
            <div class="footer-brand">
                <a class="footer-brand-link" ${linkAttrs(BRAND)}>${starIcon()}<span>${escapeHtml(BRAND.name)}</span></a>
                <p class="footer-role">${escapeHtml(t(BRAND.roleKey))}</p>
            </div>
            <nav class="footer-nav" aria-label="${escapeHtml(t('footer.nav'))}">
                <p class="footer-title">${escapeHtml(t('footer.navTitle'))}</p>
                <ul class="footer-links" role="list">${links}</ul>
            </nav>
            <div class="footer-contact-block">
                <p class="footer-title">${escapeHtml(t('footer.contactTitle'))}</p>
                <ul class="footer-contact" role="list">
                    <li>${mailIcon()}<a href="mailto:${escapeHtml(CONTACT.email)}"><span dir="ltr">${escapeHtml(CONTACT.email)}</span></a></li>
                    <li>${phoneIcon()}<a href="${escapeHtml(CONTACT.phoneHref)}"><span dir="ltr">${escapeHtml(CONTACT.phone)}</span></a></li>
                    <li>${pinIcon()}<span>${escapeHtml(t(CONTACT.cityKey))}</span></li>
                    ${CONTACT.linkedin ? `<li>${linkedinIcon()}<a href="${escapeHtml(CONTACT.linkedin)}" target="_blank" rel="noopener"><span>${escapeHtml(t('footer.linkedin'))}</span></a></li>` : ''}
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p><bdi>© <span>${new Date().getFullYear()}</span> ${escapeHtml(BRAND.name)}</bdi></p>
            <a href="${topHref}">${escapeHtml(t('footer.backToTop'))}</a>
        </div>`;
}

export function mountFooter() {
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) return null;
    footer.innerHTML = template();
    return footer;
}
