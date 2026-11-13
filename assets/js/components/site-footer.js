/*
 * Pied de page commun : remplit <footer class="footer" data-site-footer>
 * à partir de BRAND, NAV et CONTACT (config/navigation.js).
 */
import { NAV, BRAND, CONTACT, LABELS } from '../config/navigation.js';
import { resolveLink } from '../utils/site-root.js';
import { escapeHtml } from '../utils/html.js';
import { starIcon, mailIcon, phoneIcon, pinIcon } from './icons.js';

function linkAttrs(href) {
    const link = resolveLink(href);
    return `href="${escapeHtml(link.href)}"${link.current ? ' aria-current="page"' : ''}`;
}

function template() {
    const links = NAV.map((item) => `<li><a ${linkAttrs(item.href)}><span>${escapeHtml(item.label)}</span></a></li>`).join('');
    // Retour en haut : ancre #top si la page la fournit, sinon haut du document
    const topHref = document.getElementById('top') ? '#top' : '#';

    return `
        <div class="footer-main">
            <div class="footer-brand">
                <a class="footer-brand-link" ${linkAttrs(BRAND.href)}>${starIcon()}<span>${escapeHtml(BRAND.name)}</span></a>
                <p class="footer-role">${escapeHtml(BRAND.role)}</p>
            </div>
            <nav class="footer-nav" aria-label="${escapeHtml(LABELS.footerNav)}">
                <p class="footer-title">${escapeHtml(LABELS.footerNavTitle)}</p>
                <ul class="footer-links" role="list">${links}</ul>
            </nav>
            <div class="footer-contact-block">
                <p class="footer-title">${escapeHtml(LABELS.footerContactTitle)}</p>
                <ul class="footer-contact" role="list">
                    <li>${mailIcon()}<a href="mailto:${escapeHtml(CONTACT.email)}"><span>${escapeHtml(CONTACT.email)}</span></a></li>
                    <li>${phoneIcon()}<a href="${escapeHtml(CONTACT.phoneHref)}"><span>${escapeHtml(CONTACT.phone)}</span></a></li>
                    <li>${pinIcon()}<span>${escapeHtml(CONTACT.city)}</span></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>© <span>${new Date().getFullYear()}</span> ${escapeHtml(BRAND.name)}</p>
            <a href="${topHref}">${escapeHtml(LABELS.backToTop)}</a>
        </div>`;
}

export function mountFooter() {
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) return null;
    footer.innerHTML = template();
    return footer;
}
