/*
 * Tests unitaires du service du catalogue : assets/js/services/catalog-service.js.
 *
 * Lancement, depuis n'importe quel dossier :
 *   node scripts/test-catalog.mjs
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
const SERVICE = new URL('../assets/js/services/catalog-service.js', import.meta.url);
const { filterSolutions, sortSolutions, normalizeText, localized, isListed } = await import(SERVICE.href);

// Lit un JSON de assets/data/ (données réelles du site)
function lireDonnees(fichier) {
    return JSON.parse(fs.readFileSync(path.join(RACINE, 'assets', 'data', fichier), 'utf8'));
}

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

// ---------- Données de test ----------

// Solution de test au statut « exemple » ; les champs passés remplacent les valeurs par défaut
const S = (o) => ({ status: 'exemple', categoryId: 'websites', features: [], technologies: [], ...o });

const data = [
    S({ slug: 'a', name: { fr: 'Prise de rendez-vous' }, categoryId: 'mini-saas', shortDescription: { fr: 'Réservation en ligne' } }),
    S({ slug: 'b', name: { fr: 'Site vitrine' }, features: [{ fr: 'Numéro de Téléphone cliquable' }], technologies: ['WordPress'] }),
    S({ slug: 'c', name: { fr: 'Brouillon' }, status: 'draft' }),
    S({ slug: 'd', name: { fr: 'Archive' }, status: 'archived' }),
    S({ slug: 'e', name: { fr: 'Boutique' }, status: 'published', categoryId: 'ecommerce' }),
    S({ slug: 'f', name: 'Nom simple' }),
];
const cats = [{ id: 'websites', order: 1 }, { id: 'ecommerce', order: 2 }, { id: 'mini-saas', order: 6 }];
const slugs = (liste) => liste.map((s) => s.slug);

// ---------- Fonctions pures ----------

test('normalizeText : minuscules, accents, apostrophes et tirets', () => {
    assert.equal(normalizeText('  Téléphone  ÉTÉ '), 'telephone ete');
    assert.equal(normalizeText("rendez-vous l'agence"), 'rendez vous l agence');
    assert.equal(normalizeText('Paiement (Stripe), « devis » : Node.js'), 'paiement stripe devis node js');
    assert.equal(normalizeText(null), '');
});

test('localized : langue demandée, repli sur le français, valeurs simples', () => {
    assert.equal(localized({ fr: 'a', en: 'b' }, 'en'), 'b');
    assert.equal(localized({ fr: 'a' }, 'ar'), 'a');
    assert.equal(localized('x'), 'x');
    assert.equal(localized(undefined), '');
    assert.equal(localized({ en: 'z' }), 'z');
});

test('filterSolutions exclut les brouillons et les archives', () => {
    assert.deepEqual(slugs(filterSolutions(data)), ['a', 'b', 'e', 'f']);
    assert.equal(isListed({ status: 'draft' }), false);
});

test('filterSolutions filtre par catégorie', () => {
    assert.deepEqual(slugs(filterSolutions(data, { category: 'mini-saas' })), ['a']);
    assert.deepEqual(slugs(filterSolutions(data, { category: '' })).length, 4);
    assert.deepEqual(slugs(filterSolutions(data, { category: 'inconnue' })), []);
});

test('recherche insensible à la casse et aux accents', () => {
    assert.deepEqual(slugs(filterSolutions(data, { query: 'prise' })), ['a']);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'rendez-vous' })), ['a']);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'Telephone' })), ['b']);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'TÉLÉPHONE' })), ['b']);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'reservation' })), ['a']);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'wordpress vitrine' })), ['b']);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'brouillon' })), []);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'zzz' })), []);
});

test('recherche par préfixe de mot', () => {
    assert.deepEqual(slugs(filterSolutions([S({ slug: 'z', name: { fr: 'Entreprise' } })], { query: 'prise' })), []);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'tele' })), ['b']);
    assert.deepEqual(slugs(filterSolutions(data, { query: 'rendez vous' })), ['a']);
    // Un mot entre parenthèses ou guillemets se trouve aussi
    assert.deepEqual(slugs(filterSolutions([S({ slug: 'p', name: { fr: 'Paiement (Stripe)' } })], { query: 'stripe' })), ['p']);
});

test('filtre par catégorie et recherche combinés', () => {
    assert.deepEqual(slugs(filterSolutions(data, { category: 'websites', query: 'prise' })), []);
    assert.deepEqual(slugs(filterSolutions(data, { category: 'mini-saas', query: 'prise' })), ['a']);
});

test('champs absents tolérés', () => {
    assert.deepEqual(slugs(filterSolutions([{ slug: 'x', status: 'exemple' }], { query: 'x' })), []);
    assert.deepEqual(filterSolutions(null), []);
});

test('sortSolutions : publiées d\'abord, puis catégorie, puis nom ; sans modifier le tableau', () => {
    assert.deepEqual(slugs(sortSolutions(filterSolutions(data), cats)), ['e', 'f', 'b', 'a']);
    const copie = [...data];
    sortSolutions(data, cats);
    assert.deepEqual(data, copie);
});

// ---------- Données réelles (assets/data/) ----------

const reelles = lireDonnees('solutions.json');

test('données réelles : recherche avec et sans accent identique', () => {
    assert.deepEqual(
        slugs(filterSolutions(reelles, { query: 'Telephone' })),
        slugs(filterSolutions(reelles, { query: 'Téléphone' })),
    );
});

test('fiches d\'exemple : price.amount et deliveryDays à null', () => {
    const exemples = reelles.filter((s) => s.status === 'exemple');
    assert.ok(exemples.length > 0, 'aucune fiche au statut « exemple » dans solutions.json');
    for (const s of exemples) {
        assert.equal(s.price?.amount, null, `${s.slug} : price.amount doit être null`);
        assert.equal(s.deliveryDays, null, `${s.slug} : deliveryDays doit être null`);
    }
});

// ---------- Résumé ----------

const echecs = resultats.filter((ok) => !ok).length;
console.log('');
console.log(`${resultats.length - echecs} test(s) réussi(s), ${echecs} échec(s) sur ${resultats.length}.`);
process.exitCode = echecs ? 1 : 0;
