/*
 * Traductions de l'interface générée en JavaScript.
 *
 * La langue de la page vient de <html lang="…"> : "fr" (racine du site),
 * "en" (dossier en/) ou "ar" (dossier ar/, écrit de droite à gauche).
 * Aucune préférence n'est stockée : la langue est portée par l'adresse.
 *
 * - locale() / dir() : langue et direction de la page ("fr" hors navigateur) ;
 * - t(key, params) : texte du dictionnaire de la langue, repli sur le
 *   français puis sur la clé ; {nom} est remplacé par params.nom ;
 * - tn(key, n, params) : variante selon le nombre (clés key.one, key.two,
 *   key.few, key.many, key.other, choisies par Intl.PluralRules) ;
 * - localePrefix() : "" | "en/" | "ar/", dossier de la langue sous la racine ;
 * - localized(obj) : obj[langue] ?? obj.fr ?? "" (textes des données JSON) ;
 * - alternateUrl(code) : adresse relative de la page courante dans une autre
 *   langue, paramètres d'adresse conservés (sélecteur de langue).
 *
 * Les dictionnaires (messages/*.js) ont tous les mêmes clés.
 */
import fr from './messages/fr.js';
import en from './messages/en.js';
import ar from './messages/ar.js';

export const DEFAULT_LOCALE = 'fr';

// Langues du site, dans l'ordre du sélecteur. `name` : nom de la langue dans
// cette langue (jamais traduit) ; `short` : libellé court du sélecteur.
export const LOCALES = [
    { code: 'fr', name: 'Français', short: 'FR', dir: 'ltr', prefix: '', tag: 'fr-FR' },
    { code: 'en', name: 'English', short: 'EN', dir: 'ltr', prefix: 'en/', tag: 'en-US' },
    { code: 'ar', name: 'العربية', short: 'ع', dir: 'rtl', prefix: 'ar/', tag: 'ar-TN-u-nu-latn' },
];

const MESSAGES = { fr, en, ar };
const BY_CODE = new Map(LOCALES.map((l) => [l.code, l]));

function normalize(code) {
    const base = String(code || '').trim().toLowerCase().split('-')[0];
    return BY_CODE.has(base) ? base : DEFAULT_LOCALE;
}

// Langue de la page ; "fr" sous Node (tests) ou sans attribut lang
export function locale() {
    if (typeof document === 'undefined' || !document.documentElement) return DEFAULT_LOCALE;
    return normalize(document.documentElement.lang);
}

export function dir(code = locale()) {
    return BY_CODE.get(normalize(code)).dir;
}

// Étiquette BCP 47 pour Intl (chiffres occidentaux en arabe)
export function localeTag(code = locale()) {
    return BY_CODE.get(normalize(code)).tag;
}

export function localePrefix(code = locale()) {
    return BY_CODE.get(normalize(code)).prefix;
}

// Remplace {nom} ; la valeur est insérée telle quelle (pas d'interprétation de « $ »)
function format(template, params) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) =>
        (Object.prototype.hasOwnProperty.call(params, name) && params[name] != null ? String(params[name]) : match));
}

// Texte de l'interface ; `code` permet de forcer une langue (tests, e-mail)
export function t(key, params, code = locale()) {
    const lang = normalize(code);
    const text = MESSAGES[lang][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
    return format(text, params);
}

// Texte selon le nombre n (params.n vaut n par défaut)
export function tn(key, n, params, code = locale()) {
    const lang = normalize(code);
    let category = 'other';
    try {
        category = new Intl.PluralRules(localeTag(lang)).select(n);
    } catch (error) {
        category = n === 1 ? 'one' : 'other';
    }
    const values = { n, ...params };
    const exact = `${key}.${category}`;
    if (MESSAGES[lang][exact] != null || MESSAGES[DEFAULT_LOCALE][exact] != null) return t(exact, values, lang);
    return t(`${key}.other`, values, lang);
}

// Texte d'une donnée JSON { fr, en, ar } dans la langue de la page
export function localized(value, code = locale()) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value !== 'object') return String(value);
    const text = value[normalize(code)] ?? value[DEFAULT_LOCALE];
    return typeof text === 'string' ? text : '';
}

/*
 * Chemin de la page courante relatif à la racine du site, sans le dossier de
 * langue : "services/", "solutions/fiche/", "" (accueil). La racine est
 * donnée par <html data-root>.
 */
function pagePathFromRoot() {
    const root = document.documentElement.getAttribute('data-root') || '';
    const rootPath = new URL(root || './', window.location.href).pathname;
    let path = window.location.pathname;
    path = path.startsWith(rootPath) ? path.slice(rootPath.length) : path.replace(/^\/+/, '');
    const prefix = localePrefix();
    if (prefix && path.startsWith(prefix)) path = path.slice(prefix.length);
    else if (prefix && path === prefix.slice(0, -1)) path = '';
    return path.replace(/(^|\/)index\.html$/, '$1');
}

// Adresse relative de la page courante dans la langue `code` (paramètres et ancre conservés)
export function alternateUrl(code) {
    const root = document.documentElement.getAttribute('data-root') || '';
    const path = pagePathFromRoot();
    return `${root}${localePrefix(code)}${path || 'index.html'}${window.location.search}${window.location.hash}`;
}
