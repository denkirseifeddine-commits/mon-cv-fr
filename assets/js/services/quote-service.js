/*
 * Service de demande de devis.
 *
 * Version actuelle (sans serveur) : la demande est mise en forme puis
 * confiée à la messagerie du visiteur par un lien mailto: adressé à
 * CONTACT.email. Rien n'est envoyé ni enregistré par le site.
 *
 * Évolution prévue : submitQuote(payload) appellera POST /api/v1/quotes
 * (voir docs/API-CONTRACT.md) et renverra la référence de la demande une
 * fois celle-ci enregistrée. La page de contact n'aura pas à changer :
 * elle appelle submitQuote() et affiche ce que le service renvoie selon
 * `status` ('mail-draft' aujourd'hui).
 *
 * payload : {
 *   name, email, phone, budget, message : chaînes (phone et budget facultatifs)
 *   need, deadline : codes de assets/data/questionnaire.json (deadline facultatif)
 *   needLabel, deadlineLabel : libellés affichés des deux listes
 *   consent : booléen
 * }
 */
import { CONTACT } from '../config/navigation.js';
import { t, locale as pageLocale } from '../i18n/index.js';

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
 * Renvoie { status: 'mail-draft', mailto, text } : la demande n'est pas
 * envoyée, c'est au visiteur d'envoyer l'e-mail préparé.
 * `open` peut être remplacé (tests) ; par défaut, navigation vers le lien mailto:.
 * `locale` : langue de l'e-mail, par défaut celle de la page.
 */
export async function submitQuote(payload, { open = (url) => window.location.assign(url), locale = pageLocale() } = {}) {
    const { mailto, text } = buildQuote(payload, { locale });
    open(mailto);
    return { status: 'mail-draft', mailto, text };
}
