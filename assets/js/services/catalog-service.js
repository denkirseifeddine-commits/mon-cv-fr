/*
 * Service du catalogue de solutions.
 *
 * Version actuelle (sans serveur) : lit assets/data/solutions.json et
 * assets/data/categories.json avec fetch (adresse construite avec siteRoot(),
 * donc valable à la racine comme sous /mon-cv-fr/) et les garde en cache
 * le temps de la visite.
 *
 * Évolution prévue : getSolutions(), getSolutionBySlug() et getCategories()
 * appelleront GET /api/v1/solutions, GET /api/v1/solutions/{slug} et
 * GET /api/v1/solution-categories (voir docs/API-CONTRACT.md). Les pages
 * n'auront pas à changer : elles n'appellent que ces fonctions.
 *
 * Les fonctions pures (localized, normalizeText, isListed, filterSolutions,
 * sortSolutions) ne touchent ni au DOM ni au réseau : elles se testent sous
 * Node par un simple import de ce module.
 */
import { siteRoot } from '../utils/site-root.js';

export const DEFAULT_LOCALE = 'fr';

// Statuts jamais affichés dans le catalogue public
const HIDDEN_STATUSES = new Set(['draft', 'archived']);

// Ordre d'affichage par statut : solutions publiées d'abord, puis exemples
const STATUS_RANK = { published: 0, exemple: 1 };

/*
 * Texte dans la langue demandée. Accepte une chaîne simple ou un objet
 * { fr: '…', en: '…' } ; repli sur le français puis sur la première valeur.
 * Renvoie '' pour une valeur absente.
 */
export function localized(value, locale = DEFAULT_LOCALE) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value !== 'object') return String(value);
    const text = value[locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value).find((v) => typeof v === 'string');
    return typeof text === 'string' ? text : '';
}

// Minuscules, sans accents ; tout ce qui n'est ni lettre ni chiffre (apostrophes,
// traits d'union, ponctuation, parenthèses) devient une espace :
// « Téléphone » → « telephone », « rendez-vous » → « rendez vous », « (CRM) » → « crm »
export function normalizeText(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

// Une solution est visible dans le catalogue sauf en brouillon ou archivée
export function isListed(solution) {
    return Boolean(solution) && !HIDDEN_STATUSES.has(solution.status);
}

// Textes parcourus par la recherche : nom, description courte, fonctionnalités, technologies
function searchableText(solution, locale) {
    const list = (value) => (Array.isArray(value) ? value : []);
    return normalizeText([
        localized(solution.name, locale),
        localized(solution.shortDescription, locale),
        ...list(solution.features).map((f) => localized(f, locale)),
        ...list(solution.technologies).map((t) => localized(t, locale)),
    ].join(' '));
}

/*
 * Filtre pur.
 * - category : id de catégorie ; '' / 'all' / absent = toutes.
 * - query : recherche insensible à la casse et aux accents ; chaque mot cherché
 *   doit commencer un mot de l'un des champs (« prise » trouve « prise de
 *   rendez-vous » mais pas « entreprise »).
 * Les solutions en brouillon ou archivées sont toujours exclues.
 */
export function filterSolutions(solutions, { category = 'all', query = '', locale = DEFAULT_LOCALE } = {}) {
    const words = normalizeText(query).split(' ').filter(Boolean);
    const allCategories = !category || category === 'all';
    return (Array.isArray(solutions) ? solutions : []).filter((solution) => {
        if (!isListed(solution)) return false;
        if (!allCategories && solution.categoryId !== category) return false;
        if (!words.length) return true;
        const textWords = searchableText(solution, locale).split(' ');
        return words.every((word) => textWords.some((w) => w.startsWith(word)));
    });
}

/*
 * Tri pur (renvoie un nouveau tableau) : published avant exemple (puis les
 * autres statuts), puis ordre de la catégorie, puis nom.
 */
export function sortSolutions(solutions, categories = [], locale = DEFAULT_LOCALE) {
    const order = new Map((Array.isArray(categories) ? categories : []).map((c) => [c.id, Number(c.order) || 0]));
    const rank = (s) => STATUS_RANK[s.status] ?? 2;
    const catOrder = (s) => (order.has(s.categoryId) ? order.get(s.categoryId) : Number.MAX_SAFE_INTEGER);
    return [...(Array.isArray(solutions) ? solutions : [])].sort((a, b) =>
        rank(a) - rank(b)
        || catOrder(a) - catOrder(b)
        || localized(a.name, locale).localeCompare(localized(b.name, locale), locale, { sensitivity: 'base' }));
}

// ---------- Chargement (navigateur) ----------

const cache = new Map();

// Lit un JSON de assets/data/ une seule fois ; un échec n'est pas mis en cache
function loadJson(file) {
    if (!cache.has(file)) {
        const request = fetch(`${siteRoot()}assets/data/${file}`)
            .then((response) => {
                if (!response.ok) throw new Error(`${file} : HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => (Array.isArray(data) ? data : []))
            .catch((error) => {
                cache.delete(file);
                throw error;
            });
        cache.set(file, request);
    }
    return cache.get(file);
}

// Catégories triées par ordre d'affichage
export async function getCategories() {
    const categories = await loadJson('categories.json');
    return [...categories].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

// Solutions visibles, filtrées ({ category, query }) puis triées
export async function getSolutions(filters = {}) {
    const [solutions, categories] = await Promise.all([loadJson('solutions.json'), getCategories()]);
    return sortSolutions(filterSolutions(solutions, filters), categories, filters.locale);
}

// Une solution visible par son slug, ou null
export async function getSolutionBySlug(slug) {
    if (!slug) return null;
    const solutions = await loadJson('solutions.json');
    return solutions.find((s) => s.slug === slug && isListed(s)) || null;
}
