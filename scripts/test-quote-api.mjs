/*
 * Tests de la fonction serveur de demande de devis : api/quote.mjs (lot 7, voir SPEC.md).
 *
 * Lancement, depuis n'importe quel dossier :
 *   node scripts/test-quote-api.mjs
 *
 * Aucune dépendance : node:assert, node:fs, node:path, node:url (Node 22 : Request, Response, Headers globaux).
 * Les tests passent de vrais objets Request aux exports POST et OPTIONS. globalThis.fetch est remplacé
 * par une simulation qui enregistre les appels à l'API Resend. Les variables d'environnement sont réglées
 * avant chaque test puis restaurées. Chaque test utilise sa propre adresse IP (limitation de débit).
 * Les chemins sont résolus à partir de ce fichier (import.meta.url).
 * Une ligne par test, puis un résumé. Code de sortie 1 s'il y a au moins un échec.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { POST, OPTIONS } = await import(new URL('../api/quote.mjs', import.meta.url).href);
const QUESTIONNAIRE = JSON.parse(fs.readFileSync(path.join(RACINE, 'assets', 'data', 'questionnaire.json'), 'utf8'));

// ---------- Constantes ----------

const URL_FONCTION = 'https://mon-cv-fr.vercel.app/api/quote';
const ORIGINE_DEFAUT = 'https://mon-cv-fr.vercel.app';
const URL_RESEND = 'https://api.resend.com/emails';
const CLE_TEST = 're_cle_de_test';
const DESTINATAIRE = 'proprietaire@example.test';
const EXPEDITEUR_DEFAUT = 'Digital Solution Studio <onboarding@resend.dev>';
const CLES_ENV = ['RESEND_API_KEY', 'QUOTE_TO_EMAIL', 'QUOTE_FROM_EMAIL', 'ALLOWED_ORIGINS'];
const ENV_INITIALE = Object.fromEntries(CLES_ENV.map((c) => [c, process.env[c]]));
const ENV_BASE = { RESEND_API_KEY: CLE_TEST, QUOTE_TO_EMAIL: DESTINATAIRE };

// Demande valide de référence ; chaque test ne remplace que les champs qu'il étudie
const VALIDE = {
    name: 'Camille Test',
    email: 'camille@example.test',
    phone: '+216 20 000 000',
    need: 'website',
    deadline: '1-month',
    budget: '500-1000',
    message: 'Bonjour, je souhaite un site vitrine pour mon cabinet.',
    consent: true,
    locale: 'fr',
    solution: 'site-vitrine',
    website: '',
    elapsedMs: 5000,
};

// ---------- Environnement et simulation de fetch ----------

// Réglage de process.env : la valeur undefined supprime la variable
function reglerEnv(supplement = {}) {
    for (const c of CLES_ENV) delete process.env[c];
    for (const [c, valeur] of Object.entries({ ...ENV_BASE, ...supplement })) {
        if (valeur !== undefined) process.env[c] = valeur;
    }
}

function texte(corps) {
    if (corps === undefined || corps === null) return '';
    return typeof corps === 'string' ? corps : new TextDecoder().decode(corps);
}

const REPONSE_OK = () => new Response('{"id":"re_test"}', { status: 200, headers: { 'content-type': 'application/json' } });
let reponseResend = REPONSE_OK;
let appels = [];

const FETCH_INITIAL = globalThis.fetch;
globalThis.fetch = async (cible, init = {}) => {
    if (cible instanceof Request) {
        appels.push({ url: cible.url, methode: cible.method, entetes: cible.headers, corps: await cible.text() });
    } else {
        appels.push({ url: String(cible), methode: init.method ?? 'GET', entetes: new Headers(init.headers), corps: texte(init.body) });
    }
    return reponseResend();
};

// Exactement un appel à Resend est attendu ; renvoie cet appel
function envoiResend() {
    assert.equal(appels.length, 1, `${appels.length} appel(s) à fetch au lieu de 1`);
    return appels[0];
}

// ---------- Construction des requêtes ----------

let compteurIp = 0;
function nouvelleIp() {
    compteurIp += 1;
    return `10.0.${Math.floor(compteurIp / 256)}.${compteurIp % 256}`;
}

function requete({ corps = VALIDE, origine = ORIGINE_DEFAUT, type = 'application/json', ip = nouvelleIp(), methode = 'POST' } = {}) {
    const entetes = { 'x-forwarded-for': ip };
    if (origine !== null) entetes.origin = origine;
    if (type !== null) entetes['content-type'] = type;
    const contenu = typeof corps === 'string' ? corps : JSON.stringify(corps);
    return new Request(URL_FONCTION, { method: methode, headers: entetes, body: contenu });
}

// Envoie une demande : les champs passés remplacent ceux de VALIDE (undefined = champ absent)
const demande = (champs = {}, options = {}) => POST(requete({ ...options, corps: { ...VALIDE, ...champs } }));

// Vérifie un 422 : statut, erreur « invalid », champ attendu dans fields, aucun envoi
async function attendre422(champs, champAttendu) {
    const r = await demande(champs);
    assert.equal(r.status, 422, `statut ${r.status} au lieu de 422`);
    const c = await r.json();
    assert.equal(c.error, 'invalid');
    assert.ok(Array.isArray(c.fields) && c.fields.includes(champAttendu), `fields : ${JSON.stringify(c.fields)}`);
    assert.equal(appels.length, 0, 'Resend ne doit pas être appelé');
}

// Vérifie une réponse d'erreur JSON : statut, code, Cache-Control, aucun envoi
async function attendreErreur(r, statut, code) {
    assert.equal(r.status, statut, `statut ${r.status} au lieu de ${statut}`);
    const c = await r.json();
    assert.equal(c.error, code);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(appels.length, 0, 'Resend ne doit pas être appelé');
}

// Date AAAAMMJJ de la référence, à moins de deux jours de maintenant, et date réelle
function verifierDateReference(reference) {
    const m = /^DSS-(\d{4})(\d{2})(\d{2})-/.exec(reference);
    assert.ok(m, `format de référence inattendu : ${reference}`);
    const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    assert.equal(date.getUTCDate(), Number(m[3]), `date invalide dans ${reference}`);
    assert.ok(Math.abs(date.getTime() - Date.now()) < 2 * 86400000, `date trop éloignée dans ${reference}`);
}

// ---------- Petit lanceur de tests ----------

const resultats = [];

// Réinitialise les appels, la réponse de Resend et l'environnement, puis lance le test
async function test(nom, fonction) {
    appels = [];
    reponseResend = REPONSE_OK;
    reglerEnv();
    try {
        await fonction();
        resultats.push(true);
        console.log(`ok     ${nom}`);
    } catch (erreur) {
        resultats.push(false);
        console.log(`ECHEC  ${nom}`);
        for (const ligne of String(erreur?.message ?? erreur).split('\n').filter((l) => l.trim())) console.log(`         ${ligne}`);
    }
}

// ---------- Succès et e-mail envoyé ----------

await test('succès : 200 { ok: true, reference DSS-AAAAMMJJ-XXXX }, JSON, Cache-Control no-store, CORS', async () => {
    const r = await demande();
    assert.equal(r.status, 200);
    const c = await r.json();
    assert.equal(c.ok, true);
    assert.match(c.reference, /^DSS-\d{8}-[A-Za-z0-9]{4}$/);
    verifierDateReference(c.reference);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.match(r.headers.get('content-type') ?? '', /application\/json/);
    assert.equal(r.headers.get('access-control-allow-origin'), ORIGINE_DEFAUT);
});

await test('succès : un seul appel à Resend, POST, Bearer, to = QUOTE_TO_EMAIL, reply_to = e-mail du visiteur', async () => {
    const r = await demande();
    assert.equal(r.status, 200);
    await r.json();
    const a = envoiResend();
    assert.equal(a.url, URL_RESEND);
    assert.equal(a.methode, 'POST');
    assert.equal(a.entetes.get('authorization'), `Bearer ${CLE_TEST}`);
    const envoi = JSON.parse(a.corps);
    assert.deepEqual(envoi.to, [DESTINATAIRE]);
    assert.equal(envoi.reply_to, 'camille@example.test');
});

await test('succès : objet « Demande de devis », libellé français du besoin, nom et référence', async () => {
    const r = await demande();
    const c = await r.json();
    const envoi = JSON.parse(envoiResend().corps);
    assert.match(envoi.subject, /Demande de devis/);
    assert.ok(envoi.subject.includes('Site web'), `objet : « ${envoi.subject} »`);
    assert.ok(envoi.subject.includes('Camille Test'), `objet : « ${envoi.subject} »`);
    assert.ok(envoi.subject.includes(c.reference), `objet : « ${envoi.subject} »`);
});

await test('succès : la référence figure dans le texte brut et dans le html', async () => {
    const r = await demande();
    const c = await r.json();
    const envoi = JSON.parse(envoiResend().corps);
    assert.ok(envoi.text.includes(c.reference), 'référence absente du texte');
    assert.ok(envoi.html.includes(c.reference), 'référence absente du html');
});

await test('expéditeur : QUOTE_FROM_EMAIL absent → défaut « Digital Solution Studio <onboarding@resend.dev> »', async () => {
    const r = await demande();
    await r.json();
    assert.equal(JSON.parse(envoiResend().corps).from, EXPEDITEUR_DEFAUT);
});

await test('expéditeur : QUOTE_FROM_EMAIL présent → utilisé tel quel', async () => {
    reglerEnv({ QUOTE_FROM_EMAIL: 'Devis <devis@example.test>' });
    const r = await demande();
    await r.json();
    assert.equal(JSON.parse(envoiResend().corps).from, 'Devis <devis@example.test>');
});

await test('e-mail HTML : <script> du message échappé dans html, tel quel dans le texte brut', async () => {
    const r = await demande({ message: 'Bonjour <script>alert(1)</script> merci beaucoup.' });
    assert.equal(r.status, 200);
    await r.json();
    const envoi = JSON.parse(envoiResend().corps);
    assert.ok(envoi.html.includes('&lt;script&gt;'), 'balise non échappée dans le html');
    assert.ok(!envoi.html.includes('<script'), 'balise <script> brute dans le html');
    assert.ok(envoi.text.includes('<script>alert(1)</script>'), 'texte brut modifié');
});

await test('message avec retours à la ligne accepté (champ long)', async () => {
    const r = await demande({ message: 'Ligne un\nLigne deux, merci.' });
    assert.equal(r.status, 200);
    await r.json();
    assert.equal(appels.length, 1);
});

await test('bornes du nom : 2 et 100 caractères acceptés', async () => {
    for (const nom of ['Al', 'N'.repeat(100)]) {
        const r = await demande({ name: nom });
        assert.equal(r.status, 200, `nom de ${nom.length} caractères : statut ${r.status}`);
        await r.json();
    }
});

await test('champs facultatifs absents (phone, budget, solution, locale) → 200', async () => {
    const r = await demande({ phone: undefined, budget: undefined, solution: undefined, locale: undefined });
    assert.equal(r.status, 200);
    await r.json();
    assert.equal(appels.length, 1);
});

await test('locale en et ar acceptées', async () => {
    for (const locale of ['en', 'ar']) {
        const r = await demande({ locale });
        assert.equal(r.status, 200, `locale ${locale} : statut ${r.status}`);
        await r.json();
    }
});

await test('elapsedMs = 3000 accepté (seuil strict : moins de 3000 seulement est refusé)', async () => {
    const r = await demande({ elapsedMs: 3000 });
    const c = await r.json();
    assert.equal(r.status, 200);
    assert.ok(c.reference, 'la demande doit être envoyée et référencée');
    assert.equal(appels.length, 1);
});

await test('codes « need » : chaque code du questionnaire accepté, libellé français dans l\'objet', async () => {
    const question = QUESTIONNAIRE.find((q) => q.id === 'need');
    for (const code of question.options) {
        appels = [];
        const r = await demande({ need: code });
        assert.equal(r.status, 200, `need « ${code} » : statut ${r.status}`);
        await r.json();
        const envoi = JSON.parse(envoiResend().corps);
        assert.ok(envoi.subject.includes(question.labels[code].fr), `need « ${code} » : objet « ${envoi.subject} »`);
    }
});

await test('codes « deadline » : chaque code du questionnaire accepté', async () => {
    const question = QUESTIONNAIRE.find((q) => q.id === 'deadline');
    for (const code of question.options) {
        const r = await demande({ deadline: code });
        assert.equal(r.status, 200, `deadline « ${code} » : statut ${r.status}`);
        await r.json();
    }
});

// ---------- Configuration ----------

await test('RESEND_API_KEY absente → 503 not-configured, aucun appel à Resend', async () => {
    reglerEnv({ RESEND_API_KEY: undefined });
    await attendreErreur(await demande(), 503, 'not-configured');
});

await test('QUOTE_TO_EMAIL absente → 503 not-configured, aucun appel à Resend', async () => {
    reglerEnv({ QUOTE_TO_EMAIL: undefined });
    await attendreErreur(await demande(), 503, 'not-configured');
});

// ---------- Origine et CORS ----------

await test('en-tête Origin absent → 403 forbidden-origin, aucun appel', async () => {
    await attendreErreur(await demande({}, { origine: null }), 403, 'forbidden-origin');
});

await test('origine non autorisée → 403 forbidden-origin, aucun appel', async () => {
    await attendreErreur(await demande({}, { origine: 'https://evil.example.test' }), 403, 'forbidden-origin');
});

await test('ALLOWED_ORIGINS personnalisé : origine listée acceptée, origine par défaut refusée', async () => {
    reglerEnv({ ALLOWED_ORIGINS: 'https://a.example.test,https://b.example.test' });
    const ok = await demande({}, { origine: 'https://b.example.test' });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://b.example.test');
    await ok.json();
    assert.equal(appels.length, 1, 'la demande acceptée doit être envoyée une fois');
    appels = [];
    await attendreErreur(await demande({}, { origine: ORIGINE_DEFAUT }), 403, 'forbidden-origin');
});

await test('ALLOWED_ORIGINS absent : origine locale (localhost) refusée', async () => {
    await attendreErreur(await demande({}, { origine: 'http://localhost:8080' }), 403, 'forbidden-origin');
});

await test('OPTIONS origine autorisée : en-têtes CORS (Allow-Origin, Allow-Methods POST, Allow-Headers Content-Type, Vary)', async () => {
    const r = await OPTIONS(new Request(URL_FONCTION, { method: 'OPTIONS', headers: { origin: ORIGINE_DEFAUT } }));
    assert.ok(r.status >= 200 && r.status < 300, `statut ${r.status}`);
    assert.equal(r.headers.get('access-control-allow-origin'), ORIGINE_DEFAUT);
    assert.match(r.headers.get('access-control-allow-methods') ?? '', /POST/);
    assert.match(r.headers.get('access-control-allow-headers') ?? '', /content-type/i);
    assert.match(r.headers.get('vary') ?? '', /origin/i);
    assert.equal(appels.length, 0);
});

await test('OPTIONS origine non autorisée : aucun en-tête Access-Control-Allow-Origin', async () => {
    const r = await OPTIONS(new Request(URL_FONCTION, { method: 'OPTIONS', headers: { origin: 'https://evil.example.test' } }));
    assert.equal(r.headers.get('access-control-allow-origin'), null);
});

// ---------- Type de contenu et taille ----------

await test('Content-Type non JSON (text/plain) → 415, aucun appel', async () => {
    const r = await POST(requete({ corps: JSON.stringify(VALIDE), type: 'text/plain;charset=UTF-8' }));
    assert.equal(r.status, 415, `statut ${r.status}`);
    assert.equal(appels.length, 0);
});

await test('corps au-delà de 20 Ko → 413, aucun appel', async () => {
    const corps = JSON.stringify({ ...VALIDE, remplissage: 'x'.repeat(21 * 1024) });
    const r = await POST(requete({ corps }));
    assert.equal(r.status, 413, `statut ${r.status}`);
    assert.equal(appels.length, 0);
});

// ---------- Validation (422) ----------

await test('nom trop court (1 caractère) → 422 name', async () => {
    await attendre422({ name: 'A' }, 'name');
});

await test('nom trop long (101 caractères) → 422 name', async () => {
    await attendre422({ name: 'x'.repeat(101) }, 'name');
});

await test('nom avec retour à la ligne → 422 name', async () => {
    await attendre422({ name: 'Camille\nTest' }, 'name');
});

await test('e-mail invalide → 422 email', async () => {
    await attendre422({ email: 'pas-un-email' }, 'email');
});

await test('e-mail trop long (plus de 254 caractères) → 422 email', async () => {
    await attendre422({ email: `${'a'.repeat(250)}@example.test` }, 'email');
});

await test('e-mail avec injection d\'en-tête (CRLF) → 422 email', async () => {
    await attendre422({ email: 'camille@example.test\r\nBcc: autre@example.test' }, 'email');
});

await test('téléphone avec lettres → 422 phone', async () => {
    await attendre422({ phone: '06 12 ab cd' }, 'phone');
});

await test('téléphone trop long (41 caractères) → 422 phone', async () => {
    await attendre422({ phone: '1'.repeat(41) }, 'phone');
});

await test('need inconnu → 422 need', async () => {
    await attendre422({ need: 'blockchain' }, 'need');
});

await test('deadline inconnu → 422 deadline', async () => {
    await attendre422({ deadline: 'demain' }, 'deadline');
});

await test('budget trop long (101 caractères) → 422 budget', async () => {
    await attendre422({ budget: 'x'.repeat(101) }, 'budget');
});

await test('message trop court (7 caractères) → 422 message', async () => {
    await attendre422({ message: 'Bonjour' }, 'message');
});

await test('message trop long (5001 caractères) → 422 message', async () => {
    await attendre422({ message: 'a'.repeat(5001) }, 'message');
});

await test('consent absent → 422 consent', async () => {
    await attendre422({ consent: undefined }, 'consent');
});

await test('consent false → 422 consent', async () => {
    await attendre422({ consent: false }, 'consent');
});

await test('consent sous forme de chaîne « true » refusé (il faut le booléen true)', async () => {
    await attendre422({ consent: 'true' }, 'consent');
});

await test('locale inconnue → 422 locale', async () => {
    await attendre422({ locale: 'de' }, 'locale');
});

await test('slug de solution invalide → 422 solution', async () => {
    await attendre422({ solution: 'Site Vitrine!' }, 'solution');
});

await test('slug de solution trop long (81 caractères) → 422 solution', async () => {
    await attendre422({ solution: 'a'.repeat(81) }, 'solution');
});

await test('plusieurs erreurs : fields liste tous les champs fautifs, et seulement eux', async () => {
    const r = await demande({ name: 'A', email: 'pas-un-email', need: 'blockchain', consent: false });
    assert.equal(r.status, 422);
    const c = await r.json();
    assert.equal(c.error, 'invalid');
    for (const champ of ['name', 'email', 'need', 'consent']) {
        assert.ok(c.fields.includes(champ), `${champ} absent de fields : ${JSON.stringify(c.fields)}`);
    }
    assert.ok(!c.fields.includes('message'), `message valide signalé : ${JSON.stringify(c.fields)}`);
    assert.equal(appels.length, 0);
});

await test('422 : Cache-Control no-store et réponse JSON', async () => {
    const r = await demande({ name: 'A' });
    assert.equal(r.status, 422);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.match(r.headers.get('content-type') ?? '', /application\/json/);
    await r.json();
});

// ---------- Pot de miel et délai minimal ----------

await test('pot de miel website rempli → 200 { ok: true } exactement, aucun appel à Resend', async () => {
    const r = await demande({ website: 'http://spam.example.test' });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
    assert.equal(appels.length, 0);
});

await test('elapsedMs inférieur à 3000 → 200 { ok: true } exactement, aucun appel à Resend', async () => {
    const r = await demande({ elapsedMs: 100 });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
    assert.equal(appels.length, 0);
});

// ---------- Limitation de débit ----------

await test('limitation de débit : 5 demandes valides acceptées, la 6e de la même IP → 429 rate-limited', async () => {
    const ip = nouvelleIp();
    for (let i = 1; i <= 5; i++) {
        const r = await demande({}, { ip });
        assert.equal(r.status, 200, `demande ${i} : statut ${r.status}`);
        await r.json();
    }
    const r = await demande({}, { ip });
    assert.equal(r.status, 429, `6e demande : statut ${r.status}`);
    assert.equal((await r.json()).error, 'rate-limited');
    assert.equal(appels.length, 5, 'la 6e demande ne doit pas être envoyée à Resend');
});

await test('limitation de débit par IP : une autre adresse IP n\'est pas bloquée', async () => {
    const ip = nouvelleIp();
    for (let i = 1; i <= 6; i++) await (await demande({}, { ip })).json();
    const autre = await demande({}, { ip: nouvelleIp() });
    assert.equal(autre.status, 200, `autre IP : statut ${autre.status}`);
    await autre.json();
});

// ---------- Échec d'envoi ----------

// Vérifie un 502 send-failed après un appel à Resend (qui a bien été tenté)
async function attendreEchecEnvoi(r) {
    assert.equal(r.status, 502, `statut ${r.status} au lieu de 502`);
    const c = await r.json();
    assert.equal(c.error, 'send-failed');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.ok(appels.length >= 1, 'Resend doit avoir été appelé');
    assert.equal(appels[0].url, URL_RESEND);
}

await test('Resend répond 500 → 502 send-failed', async () => {
    reponseResend = () => new Response('{"message":"erreur interne"}', { status: 500, headers: { 'content-type': 'application/json' } });
    await attendreEchecEnvoi(await demande());
});

await test('Resend répond 403 (non 2xx) → 502 send-failed', async () => {
    reponseResend = () => new Response('{"message":"clé refusée"}', { status: 403, headers: { 'content-type': 'application/json' } });
    await attendreEchecEnvoi(await demande());
});

await test('erreur réseau (fetch lève une exception) → 502 send-failed', async () => {
    reponseResend = () => { throw new TypeError('fetch failed'); };
    const r = await demande();
    assert.equal(r.status, 502, `statut ${r.status}`);
    assert.equal((await r.json()).error, 'send-failed');
    assert.equal(r.headers.get('cache-control'), 'no-store');
});

// ---------- Durcissement (relecture de sécurité) ----------

await test('origine : préfixe, suffixe, autre schéma, « null » → 403 (comparaison exacte)', async () => {
    for (const origine of [`${ORIGINE_DEFAUT}.evil.example.test`, `${ORIGINE_DEFAUT}@evil.example.test`, `https://evil.example.test/?${ORIGINE_DEFAUT}`,
        'http://mon-cv-fr.vercel.app', `${ORIGINE_DEFAUT}:8443`, 'https://xmon-cv-fr.vercel.app', 'null']) {
        const r = await demande({}, { origine });
        assert.equal(r.status, 403, `${origine} : statut ${r.status}`);
        assert.equal(r.headers.get('access-control-allow-origin'), null, `${origine} : en-tête CORS présent`);
    }
    assert.equal(appels.length, 0);
});

await test('champs courts : U+2028, U+2029, U+0085, NUL et tabulation refusés (nom, e-mail, budget)', async () => {
    for (const champ of ['name', 'email', 'budget']) {
        for (const c of [' ', ' ', '\u0085', '\u0000', '\t']) {
            await attendre422({ [champ]: `${VALIDE[champ]}${c}x` }, champ);
        }
    }
});

await test('caractères bidi (U+202A à U+202E, U+2066 à U+2069) retirés du nom et du budget : absents de l\'objet et du corps', async () => {
    const r = await demande({ name: 'Ali‮gpj.exe⁦⁩', budget: '‪500‬' });
    assert.equal(r.status, 200, `statut ${r.status}`);
    const envoi = JSON.parse(envoiResend().corps);
    for (const partie of [envoi.subject, envoi.text, envoi.html]) {
        assert.doesNotMatch(partie, /[‪-‮⁦-⁩]/);
    }
    assert.ok(envoi.subject.includes('Aligpj.exe'), envoi.subject);
});

await test('reply_to impossible à détourner : listes d\'adresses, nom affiché, chevrons → 422 email', async () => {
    for (const email of ['a@example.test, evil@example.test', 'a@example.test;evil@example.test', 'A <a@example.test>', '<a@example.test>',
        'a@example.test evil@example.test', 'a@example.test?bcc=evil@example.test']) {
        await attendre422({ email }, 'email');
    }
});

await test('champs to, cc, bcc, from, subject, html fournis par le client : ignorés', async () => {
    const r = await demande({ to: 'evil@example.test', cc: 'evil@example.test', bcc: 'evil@example.test', from: 'evil@example.test', reply_to: 'evil@example.test', subject: 'spam', html: '<b>spam</b>' });
    assert.equal(r.status, 200);
    const envoi = JSON.parse(envoiResend().corps);
    assert.deepEqual(Object.keys(envoi).sort(), ['from', 'html', 'reply_to', 'subject', 'text', 'to']);
    assert.deepEqual(envoi.to, [DESTINATAIRE]);
    assert.equal(envoi.reply_to, VALIDE.email);
    assert.equal(envoi.from, EXPEDITEUR_DEFAUT);
    assert.doesNotMatch(JSON.stringify(envoi), /evil@example\.test|spam/);
});

await test('e-mail HTML : nom et budget échappés (guillemets, apostrophes, chevrons)', async () => {
    const r = await demande({ name: '"><img src=x onerror=alert(1)>', budget: '\' onmouseover=\'x\' <svg/onload=1>' });
    assert.equal(r.status, 200);
    const { html } = JSON.parse(envoiResend().corps);
    assert.doesNotMatch(html, /<img|<svg/);
    assert.ok(html.includes('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'), 'nom non échappé');
    assert.ok(html.includes('&#39; onmouseover=&#39;x&#39; &lt;svg/onload=1&gt;'), 'budget non échappé');
});

await test('types inattendus (tableau, objet, nombre) à la place d\'une chaîne → 422 sur le champ', async () => {
    for (const champ of ['name', 'email', 'phone', 'need', 'deadline', 'budget', 'message', 'solution', 'locale']) {
        for (const valeur of [['Camille Test'], { toString: 'x' }, 1234567890]) {
            await attendre422({ [champ]: valeur }, champ);
        }
    }
});

await test('corps JSON qui n\'est pas un objet, ou malformé → 422 ou 200 sans référence, jamais d\'envoi ni de 5xx', async () => {
    for (const corps of ['{', '', 'null', '[]', '"texte"', '42', '[{"name":"x"}]']) {
        const r = await POST(requete({ corps }));
        assert.ok(r.status === 422 || r.status === 200, `${corps} : statut ${r.status}`);
        assert.equal((await r.json()).reference, undefined);
    }
    assert.equal(appels.length, 0);
});

await test('__proto__ et constructor dans le corps : aucune pollution, champs hérités non pris en compte', async () => {
    const corps = '{"__proto__":{"name":"Nom Pollué","email":"a@example.test","need":"website","message":"un message assez long","consent":true,"pollue":1},'
        + '"constructor":{"prototype":{"pollue":1}},"elapsedMs":5000}';
    const r = await POST(requete({ corps }));
    assert.equal(r.status, 422, `statut ${r.status}`);
    const { fields } = await r.json();
    for (const champ of ['name', 'email', 'need', 'message', 'consent']) assert.ok(fields.includes(champ), `fields : ${JSON.stringify(fields)}`);
    assert.equal({}.pollue, undefined);
    assert.equal(appels.length, 0);
    for (const code of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
        await attendre422({ need: code }, 'need');
        await attendre422({ deadline: code }, 'deadline');
    }
});

await test('taille : la lecture du corps s\'arrête à la limite (flux sans Content-Length) → 413', async () => {
    let octets = 0;
    const bloc = new Uint8Array(4096).fill(97);
    const flux = new ReadableStream({
        pull(c) {
            octets += bloc.length;
            if (octets > 8 * 1024 * 1024) c.close();
            else c.enqueue(bloc);
        },
    });
    const r = await POST(new Request(URL_FONCTION, {
        method: 'POST', duplex: 'half', body: flux,
        headers: { origin: ORIGINE_DEFAUT, 'content-type': 'application/json', 'x-forwarded-for': nouvelleIp() },
    }));
    assert.equal(r.status, 413, `statut ${r.status}`);
    assert.ok(octets < 256 * 1024, `${octets} octets lus : la lecture n'est pas bornée`);
    assert.equal(appels.length, 0);
});

await test('taille : limite en octets (caractères multi-octets) et Content-Length mensonger → 413', async () => {
    const corps = JSON.stringify({ ...VALIDE, message: 'é'.repeat(4000), remplissage: '€'.repeat(5000) });
    assert.ok(corps.length < 20 * 1024, 'le corps doit compter moins de 20 480 caractères');
    const r = await POST(new Request(URL_FONCTION, {
        method: 'POST', body: corps,
        headers: { origin: ORIGINE_DEFAUT, 'content-type': 'application/json', 'content-length': '10', 'x-forwarded-for': nouvelleIp() },
    }));
    assert.equal(r.status, 413, `statut ${r.status}`);
});

await test('limitation de débit : x-forwarded-for « client, proxy » → la première adresse sert de clé', async () => {
    const ip = nouvelleIp();
    let r;
    for (let i = 1; i <= 6; i++) {
        r = await demande({}, { ip: `${ip}, 172.16.0.${i}` });
        await r.json();
    }
    assert.equal(r.status, 429, `6e demande : statut ${r.status}`);
});

await test('limitation de débit : x-real-ip (posé par la plateforme) prime sur un x-forwarded-for variable', async () => {
    const reelle = nouvelleIp();
    let r;
    for (let i = 1; i <= 6; i++) {
        r = await POST(new Request(URL_FONCTION, {
            method: 'POST', body: JSON.stringify(VALIDE),
            headers: { origin: ORIGINE_DEFAUT, 'content-type': 'application/json', 'x-real-ip': reelle, 'x-forwarded-for': `198.51.100.${i}` },
        }));
        await r.json();
    }
    assert.equal(r.status, 429, `6e demande : statut ${r.status}`);
});

await test('limitation de débit : les demandes ignorées (pot de miel) comptent aussi → 429 à la 6e', async () => {
    const ip = nouvelleIp();
    let r;
    for (let i = 1; i <= 6; i++) {
        r = await demande({ website: 'https://spam.example.test' }, { ip });
        await r.json();
    }
    assert.equal(r.status, 429, `6e demande : statut ${r.status}`);
    assert.equal(appels.length, 0);
});

await test('limitation de débit : mémoire bornée (20 000 adresses distinctes) et clé d\'IP tronquée', async () => {
    const { createRateLimiter, clientIp } = await import(new URL('../api/_lib/quote-core.mjs', import.meta.url).href);
    const limiteur = createRateLimiter({ now: () => 1000 });
    for (let i = 0; i < 20000; i++) limiteur.hit(`ip-${i}`);
    assert.ok(limiteur.size <= 5000, `${limiteur.size} clés en mémoire`);
    assert.ok(clientIp((nom) => (nom === 'x-forwarded-for' ? '9'.repeat(5000) : null)).length <= 64);
});

await test('Resend lent : l\'appel sortant porte un signal d\'abandon (délai borné)', async () => {
    let signal = null;
    const fetchSimule = globalThis.fetch;
    globalThis.fetch = async (cible, init = {}) => { signal = init.signal ?? null; return fetchSimule(cible, init); };
    try {
        const r = await demande();
        assert.equal(r.status, 200);
        assert.ok(signal instanceof AbortSignal, 'aucun signal passé à fetch');
    } finally {
        globalThis.fetch = fetchSimule;
    }
});

await test('aucune fuite : clé, destinataire et détail de Resend absents des réponses et des journaux', async () => {
    const journaux = [];
    const consoleInitiale = console.error;
    console.error = (...args) => journaux.push(args.join(' '));
    try {
        const corps = [];
        reponseResend = () => new Response(`{"message":"clé ${CLE_TEST} refusée pour ${DESTINATAIRE}"}`, { status: 401 });
        corps.push(await (await demande()).text());
        reponseResend = () => { throw new Error(`échec Bearer ${CLE_TEST} vers ${DESTINATAIRE}`); };
        corps.push(await (await demande()).text());
        reglerEnv({ RESEND_API_KEY: undefined });
        corps.push(await (await demande()).text());
        const tout = corps.concat(journaux).join('\n');
        for (const secret of [CLE_TEST, DESTINATAIRE, VALIDE.email, VALIDE.name, VALIDE.message]) {
            assert.ok(!tout.includes(secret), `fuite : ${secret}`);
        }
        assert.doesNotMatch(tout, /\n\s+at /);
        assert.deepEqual(corps.slice(0, 2), ['{"error":"send-failed"}', '{"error":"send-failed"}']);
    } finally {
        console.error = consoleInitiale;
    }
});

// ---------- Résumé ----------

globalThis.fetch = FETCH_INITIAL;
for (const c of CLES_ENV) {
    if (ENV_INITIALE[c] === undefined) delete process.env[c];
    else process.env[c] = ENV_INITIALE[c];
}

const echecs = resultats.filter((ok) => !ok).length;
console.log('');
console.log(`${resultats.length - echecs} test(s) réussi(s), ${echecs} échec(s) sur ${resultats.length}.`);
process.exitCode = echecs ? 1 : 0;
