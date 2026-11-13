/*
 * Source unique des liens et des coordonnées affichés par l'en-tête
 * et le pied de page. Les href sont relatifs à la racine du site :
 * les composants les préfixent avec siteRoot() (voir utils/site-root.js).
 *
 * Les lots suivants remplaceront NAV par les 7 pages du studio ;
 * l'en-tête passe en menu compact quand la barre ne tient plus.
 */
export const NAV = [
    { id: 'projets', label: 'Projets', href: 'index.html#projets' },
    { id: 'expertise', label: 'Expertise', href: 'index.html#expertise' },
    { id: 'parcours', label: 'Parcours', href: 'index.html#parcours' },
    { id: 'cv', label: 'CV', href: 'cv.html' },
];

export const CTA = { id: 'contact', label: 'Me contacter', href: 'index.html#contact' };

export const BRAND = {
    name: 'Seif Eddine Denkir',
    role: 'Développeur & designer web',
    href: 'index.html#top',
};

export const CONTACT = {
    email: 'denkirseifeddine@gmail.com',
    phone: '+216 21 327 315',
    phoneHref: 'tel:+21621327315',
    city: 'Tunis, Tunisie',
};

// Libellés d'interface des composants (à traduire avec le reste du contenu)
export const LABELS = {
    mainNav: 'Navigation principale',
    menu: 'Menu',
    menuNav: 'Menu du site',
    footerNav: 'Navigation du pied de page',
    footerNavTitle: 'Navigation',
    footerContactTitle: 'Contact',
    backToTop: 'Revenir en haut',
};
