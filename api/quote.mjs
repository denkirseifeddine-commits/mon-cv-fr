/*
 * Point d'entrée provisoire POST /api/quote (fonction serveur Vercel,
 * format « Web handler » : Request → Response, sans dépendance npm).
 *
 * Reçoit la demande de devis du formulaire de contact en JSON, la valide
 * (api/_lib/quote-core.mjs) puis l'envoie par e-mail au propriétaire avec
 * l'API HTTP de Resend. Rien n'est stocké. Les journaux ne contiennent
 * jamais de donnée du visiteur : uniquement un code d'erreur.
 *
 * Variables d'environnement (réglées dans Vercel, jamais dans le dépôt) :
 * - RESEND_API_KEY   (obligatoire) clé de l'API Resend ;
 * - QUOTE_TO_EMAIL   (obligatoire) adresse qui reçoit les demandes ;
 * - QUOTE_FROM_EMAIL (facultatif)  expéditeur, défaut
 *   « Digital Solution Studio <onboarding@resend.dev> » ;
 * - ALLOWED_ORIGINS  (facultatif)  origines autorisées séparées par des
 *   virgules, défaut https://mon-cv-fr.vercel.app.
 * Contrat : docs/API-CONTRACT.md (« Point d'entrée provisoire Vercel »).
 *
 * createHandler({ env, fetchImpl, now, random, rateLimiter }) permet de
 * tester le gestionnaire avec un faux fetch et une horloge simulée.
 */
import {
    DEFAULT_FROM,
    MAX_BODY_BYTES,
    RESEND_ENDPOINT,
    buildResendPayload,
    byteLength,
    clientIp,
    corsHeaders,
    createRateLimiter,
    isAllowedOrigin,
    isJsonContentType,
    isLikelyBot,
    makeReference,
    parseAllowedOrigins,
    validateQuote,
} from './_lib/quote-core.mjs';

const SEND_TIMEOUT_MS = 10000;

function logError(code, detail) {
    // Code d'erreur seulement (et statut HTTP de Resend) : aucune donnée personnelle
    console.error(detail ? `[api/quote] ${code} (${detail})` : `[api/quote] ${code}`);
}

function jsonResponse(status, body, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            ...headers,
        },
    });
}

export function createHandler({
    env = typeof process !== 'undefined' ? process.env : {},
    fetchImpl = (...args) => globalThis.fetch(...args),
    now = () => Date.now(),
    random,
    rateLimiter,
} = {}) {
    const limiter = rateLimiter || createRateLimiter({ now });
    const readEnv = () => (typeof env === 'function' ? env() : env) || {};
    const value = (vars, name) => (typeof vars[name] === 'string' ? vars[name].trim() : '');

    // Origine de la requête et en-têtes CORS correspondants
    function context(request) {
        const vars = readEnv();
        const allowed = parseAllowedOrigins(vars.ALLOWED_ORIGINS);
        const origin = request.headers.get('origin');
        return { vars, origin, allowed, ok: isAllowedOrigin(origin, allowed), cors: corsHeaders(origin, allowed) };
    }

    async function OPTIONS(request) {
        const ctx = context(request);
        if (!ctx.ok) return jsonResponse(403, { error: 'forbidden-origin' });
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', ...ctx.cors } });
    }

    async function POST(request) {
        const ctx = context(request);
        if (!ctx.ok) return jsonResponse(403, { error: 'forbidden-origin' });
        const reply = (status, body, headers) => jsonResponse(status, body, { ...ctx.cors, ...headers });

        if (!isJsonContentType(request.headers.get('content-type'))) {
            return reply(415, { error: 'unsupported-media-type' });
        }
        const declared = Number(request.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
            return reply(413, { error: 'payload-too-large' });
        }
        let raw = '';
        try {
            raw = await request.text();
        } catch (error) {
            return reply(422, { error: 'invalid', fields: [] });
        }
        if (byteLength(raw) > MAX_BODY_BYTES) return reply(413, { error: 'payload-too-large' });

        let body = null;
        try {
            body = JSON.parse(raw);
        } catch (error) {
            return reply(422, { error: 'invalid', fields: [] });
        }

        // Limitation de débit par IP (au mieux, en mémoire de l'instance)
        const ip = clientIp((name) => request.headers.get(name));
        if (ip) {
            const { allowed, retryAfterSeconds } = limiter.hit(ip);
            if (!allowed) return reply(429, { error: 'rate-limited' }, { 'Retry-After': String(retryAfterSeconds) });
        }

        // Pot de miel rempli ou formulaire envoyé trop vite : réponse normale, sans envoi
        if (isLikelyBot(body)) return reply(200, { ok: true });

        const result = validateQuote(body);
        if (!result.ok) return reply(422, { error: 'invalid', fields: result.fields });

        const apiKey = value(ctx.vars, 'RESEND_API_KEY');
        const to = value(ctx.vars, 'QUOTE_TO_EMAIL');
        if (!apiKey || !to) {
            logError('not-configured');
            return reply(503, { error: 'not-configured' });
        }
        const from = value(ctx.vars, 'QUOTE_FROM_EMAIL') || DEFAULT_FROM;

        const reference = makeReference(now(), random);
        const payload = buildResendPayload({ quote: result.quote, reference, from, to });

        let response;
        try {
            const init = {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            };
            if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
                init.signal = AbortSignal.timeout(SEND_TIMEOUT_MS);
            }
            response = await fetchImpl(RESEND_ENDPOINT, init);
        } catch (error) {
            logError('send-failed', 'network');
            return reply(502, { error: 'send-failed' });
        }
        if (!response || !response.ok) {
            logError('send-failed', `resend ${response ? response.status : 'no-response'}`);
            return reply(502, { error: 'send-failed' });
        }
        return reply(200, { ok: true, reference });
    }

    async function methodNotAllowed(request) {
        const ctx = context(request);
        return jsonResponse(405, { error: 'method-not-allowed' }, { Allow: 'POST, OPTIONS', ...ctx.cors });
    }

    return {
        POST,
        OPTIONS,
        GET: methodNotAllowed,
        HEAD: methodNotAllowed,
        PUT: methodNotAllowed,
        DELETE: methodNotAllowed,
        PATCH: methodNotAllowed,
        limiter,
    };
}

// Gestionnaire de production : variables lues dans process.env à chaque requête
const handler = createHandler();

export async function POST(request) { return handler.POST(request); }
export async function OPTIONS(request) { return handler.OPTIONS(request); }
export async function GET(request) { return handler.GET(request); }
export async function PUT(request) { return handler.PUT(request); }
export async function DELETE(request) { return handler.DELETE(request); }
export async function PATCH(request) { return handler.PATCH(request); }
