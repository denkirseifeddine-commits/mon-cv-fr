/*
 * Service de demande de devis.
 *
 * Deux modes :
 * - envoi direct (Vercel) : la demande est envoyée en JSON à la fonction
 *   serveur api/quote (POST, voir docs/API-CONTRACT.md, « Point d'entrée
 *   provisoire Vercel »), qui l'envoie par e-mail au studio. Rien n'est
 *   enregistré par le site ;
 * - e-mail pré-rempli : la demande est mise en forme puis confiée à la
 *   messagerie du visiteur par un lien mailto: adressé à CONTACT.email.
 *   C'est le mode des copies statiques (GitHub Pages, fichier local) et le
 *   repli quand l'envoi direct échoue (service non configuré, erreur
 *   réseau, délai dépassé…).
 *
 * Évolution prévue : POST /api/v1/quotes (Laravel). La page de contact
 * n'aura pas à changer : elle appelle submitQuote() et affiche ce que le
 * service renvoie selon `status` :
 * - 'sent'         { reference } : demande reçue par le serveur ;
 * - 'invalid'      { fields }     : champs refusés par le serveur ;
 * - 'rate-limited'                : trop de demandes en peu de temps ;
 * - 'mail-draft'   { mailto, text, fallback } : e-mail pré-rempli
 *   (`fallback` vaut true quand l'envoi direct a échoué).
 *
 * payload : {
 *   name, email, phone, budget, message : chaînes (phone et budget facultatifs)
 *   need, deadline : codes de assets/data/questionnaire.json (deadline facultatif)
 *   needLabel, deadlineLabel : libellés affichés des deux listes
 *   consent : booléen
 *   solution : slug de la solution du catalogue (facultatif)
 *   website : pot de miel (toujours vide pour un visiteur)
 *   elapsedMs : temps passé sur le formulaire, en millisecondes
 * }
 */
import { CONTACT } from '../config/navigation.js';
import { t, locale as pageLocale } from '../i18n/index.js';
import { siteRoot } from '../utils/site-root.js';

const FIELDS = ['name', 'email', 'phone', 'need', 'deadline', 'budget', 'message'];

/*
 * Textes de l'e-mail préparé dans une langue ("fr", "en", "ar") : objet,
 * libellés des champs et phrase de consentement (dictionnaires i18n).
 */
export function quoteText(locale = pageLocale()) {
    return {
        subject: t('quote.subject', null, locale),
        labels: Object.fromEntries(FIELDS.map((key) => [key, t(`quote.label.${key}`, null, locale)])),
        consent: t('quote.consent', null, locale),
        line: (label, value) => t('quote.line', { label, value }, locale),
        heading: (label) => t('quote.heading', { label }, locale),
        subjectWithNeed: (subject, need) => t('quote.subjectWithNeed', { subject, need }, locale),
    };
}

function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
}

/*
 * Fonction pure : construit l'objet, le texte et le lien mailto: de la demande.
 * Seuls les champs remplis apparaissent dans le texte.
 * `locale` : langue de l'e-mail (par défaut celle de la page, "fr" sous Node).
 * Le texte utilise des fins de ligne \n ; le lien mailto: les encode en
 * %0D%0A (RFC 6068), et l'objet comme le corps sont encodés en UTF-8.
 */
export function buildQuote(payload, { to = CONTACT.email, locale = pageLocale() } = {}) {
    const p = payload || {};
    const txt = quoteText(locale);
    const needLabel = clean(p.needLabel) || clean(p.need);
    const subject = needLabel ? txt.subjectWithNeed(txt.subject, needLabel) : txt.subject;

    const rows = [
        ['name', clean(p.name)],
        ['email', clean(p.email)],
        ['phone', clean(p.phone)],
        ['need', needLabel],
        ['deadline', clean(p.deadlineLabel) || clean(p.deadline)],
        ['budget', clean(p.budget)],
    ].filter(([, value]) => value !== '');

    const lines = rows.map(([key, value]) => txt.line(txt.labels[key], value));
    const message = clean(p.message).replace(/\r\n?/g, '\n');
    if (message) lines.push('', txt.heading(txt.labels.message), message);
    if (p.consent) lines.push('', txt.consent);

    const text = lines.join('\n');
    const body = text.replace(/\n/g, '\r\n');
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return { to, subject, text, mailto };
}

/*
 * Ouvre la messagerie du visiteur avec la demande pré-remplie.
 * Renvoie { status: 'mail-draft', mailto, text, fallback } : la demande
 * n'est pas envoyée, c'est au visiteur d'envoyer l'e-mail préparé.
 */
export function prepareMailDraft(payload, { open = (url) => window.location.assign(url), locale = pageLocale(), fallback = false } = {}) {
    const { mailto, text } = buildQuote(payload, { locale });
    open(mailto);
    return { status: 'mail-draft', mailto, text, fallback };
}

/*
 * Envoi direct possible ? Non sur une copie statique : hôte GitHub Pages
 * (*.github.io) ou fichier ouvert directement (file:).
 */
export function canSendDirectly(where = typeof window !== 'undefined' ? window.location : null) {
    if (!where) return false;
    const host = String(where.hostname || '').toLowerCase();
    if (where.protocol === 'file:') return false;
    return !(host === 'github.io' || host.endsWith('.github.io'));
}

const SLUG = /^[a-z0-9-]{1,80}$/;
const LOCALES = ['fr', 'en', 'ar'];

// Corps JSON envoyé au serveur : uniquement les champs du contrat
export function serverPayload(payload, locale = pageLocale()) {
    const p = payload || {};
    const body = {
        name: clean(p.name),
        email: clean(p.email),
        phone: clean(p.phone),
        need: clean(p.need),
        deadline: clean(p.deadline),
        budget: clean(p.budget),
        message: typeof p.message === 'string' ? p.message.trim() : '',
        consent: p.consent === true,
        locale: LOCALES.includes(locale) ? locale : 'fr',
        website: typeof p.website === 'string' ? p.website : '',
        elapsedMs: Number.isFinite(p.elapsedMs) ? Math.round(p.elapsedMs) : 0,
    };
    const solution = clean(p.solution);
    if (SLUG.test(solution)) body.solution = solution;
    return body;
}

/*
 * Envoie la demande. Options (remplaçables dans les tests) :
 * - open : ouverture du lien mailto: (navigation par défaut) ;
 * - locale : langue de la page ;
 * - fetchImpl, endpoint : appel au serveur (siteRoot() + 'api/quote') ;
 * - direct : envoi direct possible (canSendDirectly() par défaut) ;
 * - timeoutMs : délai maximal de la requête (15 s).
 * Toute autre réponse que 200, 422 et 429 (503, 502, 404, 405, 403…),
 * une erreur réseau ou un délai dépassé basculent sur l'e-mail pré-rempli.
 */
export async function submitQuote(payload, {
    open = (url) => window.location.assign(url),
    locale = pageLocale(),
    fetchImpl = typeof fetch === 'function' ? (...args) => fetch(...args) : null,
    endpoint = null,
    direct = canSendDirectly(),
    timeoutMs = 15000,
} = {}) {
    const draft = (fallback) => prepareMailDraft(payload, { open, locale, fallback });
    if (!direct || !fetchImpl) return draft(false);

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let response;
    let data = null;
    try {
        response = await fetchImpl(endpoint || `${siteRoot()}api/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(serverPayload(payload, locale)),
            credentials: 'same-origin',
            signal: controller ? controller.signal : undefined,
        });
        try { data = await response.json(); } catch (error) { data = null; }
    } catch (error) {
        return draft(true);
    } finally {
        if (timer) clearTimeout(timer);
    }

    if (response.status === 200 && data && data.ok === true) {
        return { status: 'sent', reference: typeof data.reference === 'string' ? data.reference : '' };
    }
    if (response.status === 422 && data && Array.isArray(data.fields)) {
        return { status: 'invalid', fields: data.fields.filter((f) => typeof f === 'string') };
    }
    if (response.status === 429) return { status: 'rate-limited' };
    return draft(true);
}
