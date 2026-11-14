/*
 * Tests unitaires de l'internationalisation : assets/js/i18n/ (dictionnaires,
 * t, tn, localized, localePrefix, dir), e-mail de devis selon la langue, et
 * complétude des textes { fr, en, ar } des données assets/data/*.json.
 *
 * Lancement, depuis n'importe quel dossier :
 *   node scripts/test-i18n.mjs
 *
 * Aucune dépendance : node:assert, node:fs, node:url, node:path.
 * Les chemins sont résolus à partir de ce fichier (import.meta.url).
 * Une ligne par test, puis un résumé. Code de sortie 1 s'il y a au moins un échec.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Racine du dépôt = dossier parent de scripts/
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const I18N = new URL('../assets/js/i18n/index.js', import.meta.url);
const MESSAGES_FR = new URL('../assets/js/i18n/messages/fr.js', import.meta.url);
const MESSAGES_EN = new URL('../assets/js/i18n/messages/en.js', import.meta.url);
const MESSAGES_AR = new URL('../assets/js/i18n/messages/ar.js', import.meta.url);
const QUOTE = new URL('../assets/js/services/quote-service.js', import.meta.url);

const { t, tn, locale, localized, localePrefix, dir, LOCALES } = await import(I18N.href);
const fr = (await import(MESSAGES_FR.href)).default;
const en = (await import(MESSAGES_EN.href)).default;
const ar = (await import(MESSAGES_AR.href)).default;
const { buildQuote } = await import(QUOTE.href);

// Lit un JSON de assets/data/ (données réelles du site)
function lireDonnees(fichier) {
    return JSON.parse(fs.readFileSync(path.join(RACINE, 'assets', 'data', fichier), 'utf8'));
}

// Retourne tous les objets { fr: ... } d'une valeur JSON, avec leur chemin (pour les messages d'erreur)
function objetsTexte(valeur, chemin, sortie = []) {
    if (Array.isArray(valeur)) {
        valeur.forEach((element, i) => objetsTexte(element, `${chemin}[${i}]`, sortie));
    } else if (valeur && typeof valeur === 'object') {
        if (Object.prototype.hasOwnProperty.call(valeur, 'fr')) sortie.push({ chemin, objet: valeur });
        for (const [cle, element] of Object.entries(valeur)) objetsTexte(element, `${chemin}.${cle}`, sortie);
    }
    return sortie;
}

// Nombre de paramètres {nom} d'un texte, trié, pour comparer les traductions
const parametres = (s) => (s.match(/\{\w+\}/g) || []).sort().join();

// ---------- Petit lanceur de tests ----------

const resultats = [];

// Lance un test, affiche « ok » ou « ECHEC » avec le motif, puis passe au suivant
function test(nom, fonction) {
    try {
        fonction();
        resultats.push(true);
        console.log(`ok     ${nom}`);
    } catch (erreur) {
        resultats.push(false);
        console.log(`ECHEC  ${nom}`);
        for (const ligne of String(erreur.message).split('\n').filter((l) => l.trim())) console.log(`         ${ligne}`);
    }
}

// ---------- Dictionnaires ----------

test('dictionnaires : mêmes clés en fr, en et ar', () => {
    const cles = Object.keys(fr).sort();
    assert.deepEqual(Object.keys(en).sort(), cles);
    assert.deepEqual(Object.keys(ar).sort(), cles);
});

test('dictionnaires : valeurs en et ar non vides, mêmes paramètres {nom} que le français', () => {
    for (const cle of Object.keys(fr)) {
        for (const [code, dictionnaire] of [['en', en], ['ar', ar]]) {
            assert.ok(typeof dictionnaire[cle] === 'string' && dictionnaire[cle].trim(), `${code} : ${cle} vide ou absent`);
            // Les formes de pluriel one/two ne reprennent pas toujours {n} : seules les autres clés sont comparées
            if (!/\.(one|two)$/.test(cle)) {
                assert.equal(parametres(dictionnaire[cle]), parametres(fr[cle]), `${code} : paramètres de ${cle}`);
            }
        }
    }
});

// ---------- Langue et direction ----------

test('locale, localePrefix et dir sous Node (repli sur fr)', () => {
    assert.equal(locale(), 'fr');
    assert.equal(localePrefix(), '');
    assert.equal(localePrefix('en'), 'en/');
    assert.equal(localePrefix('ar'), 'ar/');
    assert.equal(dir('ar'), 'rtl');
    assert.equal(dir(), 'ltr');
    assert.equal(LOCALES.length, 3);
});

// ---------- t et tn ----------

test('t : remplacement des paramètres dans la langue demandée', () => {
    assert.equal(t('finder.stepOf', { n: 2, total: 7 }), 'Question 2 sur 7');
    assert.equal(t('finder.stepOf', { n: 2, total: 7 }, 'en'), 'Question 2 of 7');
    assert.equal(t('finder.stepOf', { n: 2, total: 7 }, 'ar'), 'السؤال 2 من 7');
});

test('t : les caractères « $ » du paramètre sont insérés tels quels', () => {
    assert.equal(
        t('contact.solutionMessage', { name: 'A $& $1 $$ {total}' }),
        'Je suis intéressé(e) par la solution : A $& $1 $$ {total}.',
    );
});

test('t : paramètre absent laissé tel quel', () => {
    assert.equal(t('finder.stepOf', { n: 1 }), 'Question 1 sur {total}');
});

test('t : repli sur le français puis sur la clé', () => {
    assert.equal(t('cle.inconnue'), 'cle.inconnue');
    assert.equal(t('nav.home', null, 'de'), 'Accueil');
    assert.equal(t('nav.home', null, 'en-GB'), 'Home');
});

test('tn : formes de pluriel en français, anglais et arabe', () => {
    assert.equal(tn('solution.days', 1), '1 jour');
    assert.equal(tn('solution.days', 5), '5 jours');
    assert.equal(tn('solution.days', 1, null, 'en'), '1 day');
    assert.equal(tn('solution.days', 2, null, 'ar'), 'يومان');
    assert.equal(tn('solution.days', 5, null, 'ar'), '5 أيام');
    assert.equal(tn('solution.days', 15, null, 'ar'), '15 يومًا');
    assert.equal(tn('finder.resultsLead', 3, null, 'en'), '3 solutions from the catalog match your answers.');
});

// ---------- Données { fr, en, ar } ----------

test('localized : langue demandée, repli sur le français, valeurs simples', () => {
    assert.equal(localized({ fr: 'a', en: 'b' }, 'en'), 'b');
    assert.equal(localized({ fr: 'a' }, 'ar'), 'a');
    assert.equal(localized({ en: 'b' }, 'ar'), '');
    assert.equal(localized('x'), 'x');
    assert.equal(localized(null), '');
    assert.equal(localized({ fr: 'a', en: 'b' }), 'a');
});

test('e-mail de devis : objet, texte et destinataire selon la langue', () => {
    const p = { name: 'A', need: 'website', needLabel: 'Website', consent: true };
    assert.equal(buildQuote(p).subject, 'Demande de devis — Website');
    assert.match(buildQuote(p).text, /^Nom : A/);
    assert.equal(buildQuote(p, { locale: 'en' }).subject, 'Quote request — Website');
    assert.match(buildQuote(p, { locale: 'en' }).text, /^Name: A\nType of need: Website\n\nI agree/);
    const arabe = buildQuote(p, { locale: 'ar' });
    assert.match(arabe.text, /^الاسم: A/);
    assert.equal(arabe.to, 'denkirseifeddine@gmail.com');
    assert.ok(arabe.mailto.startsWith('mailto:denkirseifeddine@gmail.com?subject='));
});

test('données JSON : chaque texte { fr } a un en et un ar non vides', () => {
    const dossier = path.join(RACINE, 'assets', 'data');
    const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith('.json')).sort();
    let total = 0;
    const manquants = [];
    for (const fichier of fichiers) {
        for (const { chemin, objet } of objetsTexte(lireDonnees(fichier), fichier)) {
            total++;
            for (const code of ['en', 'ar']) {
                if (typeof objet[code] !== 'string' || !objet[code].trim()) manquants.push(`${chemin}.${code}`);
            }
        }
    }
    assert.ok(total > 0, 'aucun texte { fr } trouvé dans assets/data/*.json');
    assert.equal(manquants.length, 0, `traductions manquantes ou vides :\n${manquants.join('\n')}`);
});

// ---------- Résumé ----------

const echecs = resultats.filter((ok) => !ok).length;
console.log('');
console.log(`${resultats.length - echecs} test(s) réussi(s), ${echecs} échec(s) sur ${resultats.length}.`);
process.exitCode = echecs ? 1 : 0;
