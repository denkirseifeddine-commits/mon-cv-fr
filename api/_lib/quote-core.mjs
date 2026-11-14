/*
 * Logique pure de la demande de devis (lot 7) : validation, contrôles
 * d'origine, pot de miel et délai, limitation de débit, référence,
 * construction de l'e-mail (texte brut et HTML échappé), en-têtes CORS.
 *
 * Aucun accès réseau, aucune variable d'environnement, aucune lecture de
 * fichier : tout est passé en paramètre (horloge et tirage aléatoire
 * compris), pour être testé sous Node sans dépendance.
 * Le gestionnaire Vercel est api/quote.mjs. Les fichiers dont le nom
 * commence par « _ » ne sont pas exposés comme routes par Vercel.
 */

export const DEFAULT_ALLOWED_ORIGINS = ['https://mon-cv-fr.vercel.app'];
export const DEFAULT_FROM = 'Digital Solution Studio <onboarding@resend.dev>';
export const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// Corps de requête limité à 20 Ko (20 × 1 024 octets)
export const MAX_BODY_BYTES = 20 * 1024;
// Temps minimal passé sur le formulaire avant l'envoi (ms)
export const MIN_ELAPSED_MS = 3000;
// Limitation de débit : 5 demandes par IP et par fenêtre de 10 minutes
export const RATE_LIMIT = 5;
export const RATE_WINDOW_MS = 10 * 60 * 1000;

export const LOCALES = ['fr', 'en', 'ar'];

// Codes de assets/data/questionnaire.json, avec le libellé français (e-mail destiné au propriétaire)
export const NEED_LABELS = Object.freeze({
    website: 'Site web',
    ecommerce: 'E-commerce',
    automation: 'Automatisation',
    crm: 'CRM',
    application: 'Application',
    ai: 'Assistant IA',
    unsure: 'Je ne sais pas encore',
});

export const DEADLINE_LABELS = Object.freeze({
    urgent: 'Urgent',
    '1-2-weeks': '1 à 2 semaines',
    '1-month': '1 mois',
    flexible: 'Flexible',
});

const LOCALE_LABELS = { fr: 'français', en: 'anglais', ar: 'arabe' };

// ---------- Utilitaires ----------

// Nombre de caractères (points de code, un émoji compte pour un)
function charCount(value) {
    return [...value].length;
}

// Retours à la ligne et caractères de contrôle interdits dans les champs courts (injection d'en-têtes)
const CONTROL_CHARS = /[\u0000-\u001f\u007f\u0085\u2028\u2029]/;
// Le message accepte les retours à la ligne et les tabulations, pas les autres caractères de contrôle
const MESSAGE_CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;
const PHONE_PATTERN = /^[0-9 +().-]+$/;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ---------- Origine et CORS ----------

// "https://a.fr, https://b.fr/" → ["https://a.fr", "https://b.fr"] ; vide → défaut
export function parseAllowedOrigins(value) {
    const list = String(value ?? '')
        .split(',')
        .map((item) => item.trim().replace(/\/+$/, ''))
        .filter(Boolean);
    return list.length ? list : [...DEFAULT_ALLOWED_ORIGINS];
}

export function isAllowedOrigin(origin, allowed = DEFAULT_ALLOWED_ORIGINS) {
    if (typeof origin !== 'string' || !origin || origin === 'null') return false;
    return allowed.includes(origin.trim().replace(/\/+$/, ''));
}

// En-têtes CORS, uniquement pour une origine autorisée (objet vide sinon)
export function corsHeaders(origin, allowed = DEFAULT_ALLOWED_ORIGINS) {
    if (!isAllowedOrigin(origin, allowed)) return {};
    return {
        'Access-Control-Allow-Origin': origin.trim().replace(/\/+$/, ''),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
    };
}

// ---------- Requête ----------

export function isJsonContentType(value) {
    return typeof value === 'string' && value.split(';')[0].trim().toLowerCase() === 'application/json';
}

export function byteLength(text) {
    return new TextEncoder().encode(text).length;
}

// IP du visiteur : premier élément de x-forwarded-for, sinon x-real-ip ; '' si inconnue
export function clientIp(getHeader) {
    const forwarded = getHeader('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0].trim();
        if (first) return first;
    }
    const real = getHeader('x-real-ip');
    return real ? real.trim() : '';
}

/*
 * Pot de miel et délai minimal : true si la demande doit être ignorée
 * sans envoi (le serveur répond quand même 200 { ok: true }).
 * - `website` rempli (champ invisible pour un visiteur) ;
 * - `elapsedMs` absent, non numérique ou inférieur à 3 000 ms.
 */
export function isLikelyBot(body, minElapsedMs = MIN_ELAPSED_MS) {
    if (!body || typeof body !== 'object') return false;
    const trap = body.website;
    if (trap != null && String(trap).trim() !== '') return true;
    const elapsed = typeof body.elapsedMs === 'string' && body.elapsedMs.trim() !== ''
        ? Number(body.elapsedMs)
        : body.elapsedMs;
    if (typeof elapsed !== 'number' || !Number.isFinite(elapsed)) return true;
    return elapsed < minElapsedMs;
}

// ---------- Validation ----------

/*
 * Valide le corps JSON d'une demande. Ne fait jamais confiance au client.
 * Renvoie { ok: true, quote } (valeurs nettoyées) ou { ok: false, fields }
 * (noms des champs en erreur, dans l'ordre du formulaire).
 */
export function validateQuote(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { ok: false, fields: ['name', 'email', 'need', 'message', 'consent'] };
    }
    const fields = [];
    const quote = {};

    // Champ texte court : chaîne sans retour à la ligne, longueur bornée après nettoyage
    const short = (key, { required = false, min = 0, max, test } = {}) => {
        const raw = has(body, key) ? body[key] : undefined;
        if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
            if (required) fields.push(key);
            else quote[key] = '';
            return;
        }
        if (typeof raw !== 'string' || CONTROL_CHARS.test(raw)) { fields.push(key); return; }
        const value = raw.trim();
        const length = charCount(value);
        if (length < min || length > max || (test && !test(value))) { fields.push(key); return; }
        quote[key] = value;
    };

    short('name', { required: true, min: 2, max: 100 });
    short('email', { required: true, min: 3, max: 254, test: (v) => EMAIL_PATTERN.test(v) && v.length <= 254 });
    short('phone', { max: 40, test: (v) => PHONE_PATTERN.test(v) });
    short('need', { required: true, max: 40, test: (v) => has(NEED_LABELS, v) });
    short('deadline', { max: 40, test: (v) => has(DEADLINE_LABELS, v) });
    short('budget', { max: 100 });

    // Message : retours à la ligne autorisés, normalisés en \n
    const message = body.message;
    if (typeof message !== 'string' || MESSAGE_CONTROL_CHARS.test(message)) {
        fields.push('message');
    } else {
        const value = message.replace(/\r\n?/g, '\n').trim();
        const length = charCount(value);
        if (length < 10 || length > 5000) fields.push('message');
        else quote.message = value;
    }

    if (body.consent !== true) fields.push('consent');
    else quote.consent = true;

    // Langue du visiteur : fr par défaut
    const locale = body.locale;
    if (locale == null || locale === '') quote.locale = 'fr';
    else if (typeof locale === 'string' && LOCALES.includes(locale)) quote.locale = locale;
    else fields.push('locale');

    short('solution', { max: 80, test: (v) => SLUG_PATTERN.test(v) });

    return fields.length ? { ok: false, fields } : { ok: true, quote };
}

// ---------- Limitation de débit ----------

/*
 * Limitation au mieux, en mémoire de l'instance : elle n'est pas partagée
 * entre les instances de la fonction ni conservée après leur arrêt
 * (une limitation globale viendra avec Laravel et Redis).
 * `now` : horloge injectable (ms). hit(key) enregistre une demande et
 * renvoie { allowed, retryAfterSeconds }.
 */
export function createRateLimiter({ limit = RATE_LIMIT, windowMs = RATE_WINDOW_MS, now = () => Date.now(), maxKeys = 5000 } = {}) {
    const hits = new Map();

    function prune(time) {
        for (const [key, list] of hits) {
            const recent = list.filter((t) => time - t < windowMs);
            if (recent.length) hits.set(key, recent);
            else hits.delete(key);
        }
    }

    return {
        hit(key) {
            const time = now();
            if (hits.size > maxKeys) prune(time);
            const recent = (hits.get(key) || []).filter((t) => time - t < windowMs);
            if (recent.length >= limit) {
                hits.set(key, recent);
                const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - time) / 1000));
                return { allowed: false, retryAfterSeconds };
            }
            recent.push(time);
            hits.set(key, recent);
            return { allowed: true, retryAfterSeconds: 0 };
        },
        reset() { hits.clear(); },
        get size() { return hits.size; },
    };
}

// ---------- Référence ----------

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function defaultRandomInts(count) {
    const values = new Uint32Array(count);
    globalThis.crypto.getRandomValues(values);
    return [...values];
}

// « DSS-AAAAMMJJ-XXXX » : date UTC de `nowMs` et 4 caractères aléatoires (A-Z, 2-9)
export function makeReference(nowMs = Date.now(), randomInts = defaultRandomInts) {
    const d = new Date(nowMs);
    const date = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    const suffix = randomInts(4).map((n) => REFERENCE_ALPHABET[n % REFERENCE_ALPHABET.length]).join('');
    return `DSS-${date}-${suffix}`;
}

// ---------- E-mail ----------

/*
 * E-mail destiné au propriétaire (en français), indiquant la langue du
 * visiteur. Renvoie { subject, text, html }. Le HTML n'interprète jamais
 * les valeurs du visiteur : tout passe par escapeHtml.
 */
export function buildEmail(quote, reference) {
    const needLabel = NEED_LABELS[quote.need] || quote.need;
    const subject = `Demande de devis — ${needLabel} — ${quote.name} [${reference}]`;
    const language = `${LOCALE_LABELS[quote.locale] || quote.locale} (${quote.locale})`;

    const rows = [
        ['Référence', reference],
        ['Langue du visiteur', language],
        ['Nom', quote.name],
        ['E-mail', quote.email],
        ['Téléphone', quote.phone],
        ['Type de besoin', needLabel],
        ['Délai souhaité', quote.deadline ? DEADLINE_LABELS[quote.deadline] : ''],
        ['Budget indicatif', quote.budget],
        ['Solution du catalogue', quote.solution],
        ['Consentement', 'le visiteur accepte d\'être recontacté au sujet de sa demande'],
    ].filter(([, value]) => value);

    const text = [
        'Nouvelle demande de devis reçue depuis le site Digital Solution Studio.',
        '',
        ...rows.map(([label, value]) => `${label} : ${value}`),
        '',
        'Message :',
        quote.message,
        '',
        '—',
        'Répondez directement à cet e-mail pour écrire au visiteur.',
        'Cette demande n\'est enregistrée nulle part ailleurs que dans cette boîte de réception.',
    ].join('\n');

    const cell = 'padding:6px 12px 6px 0;vertical-align:top;';
    const html = [
        '<!DOCTYPE html>',
        '<html lang="fr"><head><meta charset="utf-8"><title>' + escapeHtml(subject) + '</title></head>',
        '<body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;">',
        '<p>Nouvelle demande de devis reçue depuis le site Digital Solution Studio.</p>',
        '<table role="presentation" style="border-collapse:collapse;">',
        ...rows.map(([label, value]) => `<tr><th scope="row" style="${cell}text-align:left;font-weight:600;">${escapeHtml(label)}</th><td style="${cell}">${escapeHtml(value)}</td></tr>`),
        '</table>',
        '<p style="margin-top:20px;font-weight:600;">Message :</p>',
        `<div style="white-space:pre-wrap;border-left:3px solid #c9a227;padding-left:12px;">${escapeHtml(quote.message).replace(/\n/g, '<br>')}</div>`,
        '<p style="margin-top:24px;color:#555;font-size:13px;">Répondez directement à cet e-mail pour écrire au visiteur. Cette demande n\'est enregistrée nulle part ailleurs que dans cette boîte de réception.</p>',
        '</body></html>',
    ].join('\n');

    return { subject, text, html };
}

// Corps JSON de l'appel à l'API Resend
export function buildResendPayload({ quote, reference, from = DEFAULT_FROM, to }) {
    const { subject, text, html } = buildEmail(quote, reference);
    return { from, to: [to], reply_to: quote.email, subject, text, html };
}
