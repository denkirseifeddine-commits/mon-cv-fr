/*
 * Présentation d'une solution, partagée par le catalogue (solutions/) et la
 * fiche (solutions/fiche/) : libellés, badge de statut, prix, délai, carte.
 *
 * Les données viennent de catalog-service.js ; tout texte injecté passe par
 * escapeHtml. Une solution au statut « exemple » n'a jamais de bouton
 * d'achat : l'action est toujours « Demander un devis ».
 */
import { escapeHtml } from '../utils/html.js';
import { siteRoot } from '../utils/site-root.js';
import { localized } from '../services/catalog-service.js';
import { arrowIcon } from './icons.js';

// Libellés d'interface (à déplacer dans assets/i18n/ avec les traductions)
export const SOLUTION_TEXT = {
    statuses: { exemple: 'Exemple, non commercialisé', published: 'Disponible' },
    price: 'Prix',
    onQuote: 'Sur devis',
    delay: 'Délai',
    toDefine: 'À définir',
    days: (n) => `${n} jour${n > 1 ? 's' : ''}`,
    demo: 'Démonstration',
    noDemo: 'Pas encore disponible',
    viewDemo: 'Voir la démonstration',
    noShot: 'Pas encore de capture',
    features: 'Fonctionnalités',
    technologies: 'Technologies',
    viewSheet: 'Voir la fiche',
    askQuote: 'Demander un devis',
    // Nom de la solution ajouté aux liens répétés, pour les lecteurs d'écran
    forSolution: (name) => ` : ${name}`,
};

const list = (value) => (Array.isArray(value) ? value : []);

export function solutionName(solution) {
    return localized(solution.name) || solution.slug || '';
}

// Libellé du badge : la mention de la fiche (notice), sinon celle du statut
export function statusLabel(solution) {
    if (solution.status === 'exemple') return localized(solution.notice) || SOLUTION_TEXT.statuses.exemple;
    return SOLUTION_TEXT.statuses[solution.status] || '';
}

export function badgeHtml(solution) {
    const label = statusLabel(solution);
    if (!label) return '';
    const status = /^[a-z-]+$/.test(solution.status || '') ? solution.status : 'draft';
    return `<span class="badge badge-${status}">${escapeHtml(label)}</span>`;
}

// Prix affiché seulement pour une solution publiée au prix renseigné ; sinon « Sur devis »
export function priceLabel(solution) {
    const price = solution.price;
    if (solution.status !== 'published' || !price || typeof price.amount !== 'number' || !price.currency) return SOLUTION_TEXT.onQuote;
    try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: price.currency, maximumFractionDigits: 0 }).format(price.amount);
    } catch (error) {
        return SOLUTION_TEXT.onQuote;
    }
}

export function delayLabel(solution) {
    const days = solution.deliveryDays;
    if (solution.status !== 'published' || typeof days !== 'number' || days <= 0) return SOLUTION_TEXT.toDefine;
    return SOLUTION_TEXT.days(days);
}

// Adresse relative à la racine du site ; les URL externes ou absolues sont refusées :
// schéma (« https: », « javascript: »), début par « / » ou « \ » (que les navigateurs
// lisent comme « / »), espace ou caractère de contrôle en tête
export function rootUrl(src) {
    if (typeof src !== 'string' || !src || /^(?:[a-z][a-z0-9+.-]*:|[\/\\]|[\s\u0000-\u001f])/i.test(src) || src.includes('\\')) return '';
    return siteRoot() + src;
}

export function sheetHref(solution) {
    return `${siteRoot()}solutions/fiche/?s=${encodeURIComponent(solution.slug)}`;
}

export function quoteHref(solution) {
    return `${siteRoot()}contact/?solution=${encodeURIComponent(solution.slug)}`;
}

// Première capture (cadre du catalogue), ou l'état « Pas encore de capture »
function mediaHtml(solution) {
    const shot = list(solution.screenshots).find((s) => s && rootUrl(s.src));
    const visual = shot
        ? `<img src="${escapeHtml(rootUrl(shot.src))}" alt="${escapeHtml(localized(shot.alt))}" loading="lazy" decoding="async">`
        : `<p class="solution-shot-empty"><span>${escapeHtml(SOLUTION_TEXT.noShot)}</span></p>`;
    return `<div class="solution-media">${badgeHtml(solution)}${visual}</div>`;
}

// Carte du catalogue (composant .solution de catalog.css)
export function solutionCardHtml(solution, categoryLabel = '') {
    const name = solutionName(solution);
    const id = `sol-${String(solution.slug || '').replace(/[^a-z0-9-]/gi, '')}`;
    const features = list(solution.features).map((f) => localized(f)).filter(Boolean).slice(0, 3);
    const techs = list(solution.technologies).map((t) => localized(t)).filter(Boolean);
    const hidden = `<span class="visually-hidden">${escapeHtml(SOLUTION_TEXT.forSolution(name))}</span>`;
    return `
        <li>
            <article class="card solution" aria-labelledby="${id}">
                ${mediaHtml(solution)}
                <div class="solution-body">
                    ${categoryLabel ? `<p class="solution-cat">${escapeHtml(categoryLabel)}</p>` : ''}
                    <h3 class="solution-name" id="${id}">${escapeHtml(name)}</h3>
                    ${localized(solution.shortDescription) ? `<p class="solution-desc">${escapeHtml(localized(solution.shortDescription))}</p>` : ''}
                    ${features.length ? `<ul class="solution-features" aria-label="${escapeHtml(SOLUTION_TEXT.features)}">${features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
                    ${techs.length ? `<ul class="tags" aria-label="${escapeHtml(SOLUTION_TEXT.technologies)}">${techs.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
                    <dl class="solution-meta">
                        <div><dt>${escapeHtml(SOLUTION_TEXT.price)}</dt><dd>${escapeHtml(priceLabel(solution))}</dd></div>
                        <div><dt>${escapeHtml(SOLUTION_TEXT.delay)}</dt><dd>${escapeHtml(delayLabel(solution))}</dd></div>
                    </dl>
                    <div class="solution-actions">
                        <a class="link-arrow" href="${escapeHtml(sheetHref(solution))}">${escapeHtml(SOLUTION_TEXT.viewSheet)}${hidden} ${arrowIcon()}</a>
                        <a class="link-arrow solution-quote" href="${escapeHtml(quoteHref(solution))}">${escapeHtml(SOLUTION_TEXT.askQuote)}${hidden} ${arrowIcon()}</a>
                    </div>
                </div>
            </article>
        </li>`;
}
