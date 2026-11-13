/*
 * Source unique des liens et des coordonnées affichés par l'en-tête
 * et le pied de page. Les href sont relatifs à la racine du site :
 * les composants les préfixent avec siteRoot() (voir utils/site-root.js).
 *
 * NAV liste les pages du site, dans l'ordre du menu ; l'en-tête passe
 * en menu compact quand la barre ne tient plus.
 */
export const NAV = [
    { id: 'accueil', label: 'Accueil', href: 'index.html' },
    { id: 'portfolio', label: 'Portfolio', href: 'portfolio/' },
    { id: 'services', label: 'Services', href: 'services/' },
    { id: 'solutions', label: 'Solutions', href: 'solutions/' },
    { id: 'automatisations', label: 'Automatisations', href: 'automatisations/' },
    { id: 'trouver', label: 'Trouver ma solution', href: 'trouver-ma-solution/' },
    { id: 'cv', label: 'CV', href: 'cv.html' },
];

export const CTA = { id: 'contact', label: 'Demander un devis', href: 'contact/' };

export const BRAND = {
    name: 'Seif Eddine Denkir',
    role: 'Digital Solution Studio',
    href: 'index.html',
};

export const CONTACT = {
    email: 'denkirseifeddine@gmail.com',
    phone: '+216 21 327 315',
    phoneHref: 'tel:+21621327315',
    city: 'Tunis, Tunisie',
    linkedin: 'https://www.linkedin.com/in/seif-eddine-denkir',
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
    linkedin: 'Profil LinkedIn',
};
