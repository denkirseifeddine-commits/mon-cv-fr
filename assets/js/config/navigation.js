/*
 * Source unique des liens et des coordonnées affichés par l'en-tête
 * et le pied de page. Les href sont relatifs au dossier de la langue :
 * les composants les préfixent avec siteRoot() + localePrefix()
 * (voir pageHref). Les libellés sont des clés des dictionnaires
 * (i18n/messages/*.js), lues avec label().
 *
 * NAV liste les pages du site, dans l'ordre du menu ; l'en-tête passe
 * en menu compact quand la barre ne tient plus.
 * `lang` : page qui n'existe que dans cette langue (le CV, en français) ;
 * son lien mène toujours à cette version et porte hreflang.
 */
import { t, localePrefix } from '../i18n/index.js';

export const NAV = [
    { id: 'accueil', labelKey: 'nav.home', href: 'index.html' },
    { id: 'portfolio', labelKey: 'nav.portfolio', href: 'portfolio/' },
    { id: 'services', labelKey: 'nav.services', href: 'services/' },
    { id: 'solutions', labelKey: 'nav.solutions', href: 'solutions/' },
    { id: 'automatisations', labelKey: 'nav.automations', href: 'automatisations/' },
    { id: 'trouver', labelKey: 'nav.finder', href: 'trouver-ma-solution/' },
    { id: 'cv', labelKey: 'nav.cv', href: 'cv.html', lang: 'fr' },
];

export const CTA = { id: 'contact', labelKey: 'nav.cta', href: 'contact/' };

export const BRAND = {
    name: 'Seif Eddine Denkir',
    roleKey: 'brand.role',
    href: 'index.html',
};

export const CONTACT = {
    email: 'denkirseifeddine@gmail.com',
    phone: '+216 21 327 315',
    phoneHref: 'tel:+21621327315',
    cityKey: 'contact.city',
    linkedin: 'https://www.linkedin.com/in/seif-eddine-denkir',
};

// Libellé traduit d'une entrée (NAV, CTA)
export function label(item) {
    return t(item.labelKey);
}

// Adresse relative à la racine du site : dans le dossier de la langue de la
// page, sauf pour une page qui n'existe que dans une langue (`lang`)
export function pageHref(item) {
    return (item.lang ? localePrefix(item.lang) : localePrefix()) + item.href;
}
