/*
 * Racine du site, déclarée par chaque page : <html data-root=""> à la racine,
 * <html data-root="../"> pour une page dans un dossier. Tous les liens internes
 * générés en JavaScript sont préfixés par cette valeur, ce qui garde des chemins
 * relatifs (site servi à la racine sur Vercel et sous /mon-cv-fr/ sur GitHub Pages).
 */
export function siteRoot() {
    return document.documentElement.getAttribute('data-root') || '';
}

// "/dossier/index.html" et "/dossier/" désignent la même page
function pagePath(url) {
    return url.pathname.replace(/index\.html$/, '');
}

/*
 * Calcule le lien à écrire pour une adresse relative à la racine du site
 * (ex. "index.html#projets", "cv.html").
 * - Ancre vers la page courante : "#projets" seul, pour garder le défilement doux.
 * - Sinon : siteRoot() + href.
 * `current` vaut true quand le lien mène à la page affichée (sans ancre).
 */
export function resolveLink(href) {
    const hashAt = href.indexOf('#');
    const path = hashAt === -1 ? href : href.slice(0, hashAt);
    const hash = hashAt === -1 ? '' : href.slice(hashAt);
    const target = new URL(siteRoot() + path, window.location.href);
    const samePage = pagePath(target) === pagePath(window.location);
    if (samePage && hash) return { href: hash, current: false };
    return { href: siteRoot() + href, current: samePage };
}
