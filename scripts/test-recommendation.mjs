/*
 * Tests unitaires du moteur de recommandation : assets/js/engine/recommendation-engine.js.
 *
 * Lancement, depuis n'importe quel dossier :
 *   node scripts/test-recommendation.mjs
 *
 * Les tests sont écrits à partir de la spécification (lot 5 : recommend, scoreSolution,
 * validateAnswers), pas à partir de l'implémentation. Les poids (need 10, industry 5,
 * goal 10, complexity 4, customization 4 ; budget et deadline non notés) viennent de
 * assets/data/questionnaire.json.
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
const MOTEUR = new URL('../assets/js/engine/recommendation-engine.js', import.meta.url);
const { recommend, scoreSolution, validateAnswers } = await import(MOTEUR.href);

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

const Q = lireDonnees('questionnaire.json');
const REELLES = lireDonnees('solutions.json');

// Solution construite pour le test. Les listes de match absentes valent [] ; extra remplace les champs voulus.
const S = (slug, match = {}, extra = {}) => ({
    id: slug,
    slug,
    status: 'published',
    featured: false,
    categoryId: 'websites',
    name: { fr: slug },
    match: { needs: [], goals: [], industries: [], complexity: [], customization: [], ...match },
    ...extra,
});

// Réponses typiques : site vitrine, secteur commerce, objectifs « sell » et « leads »
const REP_SITE = {
    need: 'website',
    industry: 'commerce',
    goal: ['sell', 'leads'],
    complexity: 'simple',
    customization: 'ready',
    budget: '500-1000',
    deadline: '1-month',
};

const slugs = (resultats) => resultats.map((r) => r.solution.slug);
const raison = (questionId, code) => ({ questionId, code });

// ---------- Contrainte bloquante sur le besoin ----------

test('need : une solution dont match.needs ne contient pas le besoin est exclue', () => {
    const crm = S('crm', { needs: ['crm'] });
    assert.deepEqual(slugs(recommend({ need: 'website' }, [crm], Q).results), []);
    assert.equal(scoreSolution({ need: 'website' }, crm, Q).excluded, true);
    assert.equal(scoreSolution({ need: 'website' }, S('site', { needs: ['website'] }), Q).excluded, false);
});

test('need absent : aucune solution exclue par le besoin', () => {
    const crm = S('crm', { needs: ['crm'], goals: ['sell'] });
    assert.equal(scoreSolution({ goal: ['sell'] }, crm, Q).excluded, false);
});

test('need "unsure" n\'exclut aucune solution et vaut la moitié du poids', () => {
    const reponses = { need: 'unsure', industry: 'commerce', goal: ['sell'], complexity: 'simple', customization: 'ready' };
    const sol = S('crm', {
        needs: ['crm'], industries: ['commerce'], goals: ['sell'], complexity: ['simple'], customization: ['ready'],
    });
    // need : 10 × 0,5 = 5 ; industry 5 ; goal 10 × 1/1 = 10 ; complexity 4 ; customization 4
    // score = 28 ; maxScore = 10 + 5 + 10 + 4 + 4 = 33 ; 28 / 33 = 84,8 % → 85
    const r = scoreSolution(reponses, sol, Q);
    assert.equal(r.excluded, false);
    assert.equal(r.score, 28);
    assert.equal(r.maxScore, 33);
    assert.equal(r.percent, 85);
    assert.deepEqual(slugs(recommend(reponses, [sol], Q).results), ['crm']);
});

// ---------- Calcul du score ----------

test('score exact sur un cas construit à la main, avec les raisons dans l\'ordre', () => {
    const sol = S('a', {
        needs: ['website'], industries: ['commerce'], goals: ['sell'], complexity: ['simple'], customization: ['ready'],
    });
    // need 10 + industry 5 + goal 10 × (1 sur 2 = 0,5) = 5 + complexity 4 + customization 4 = 28
    // maxScore = 10 + 5 + 10 + 4 + 4 = 33 (budget et deadline non notés)
    const r = scoreSolution(REP_SITE, sol, Q);
    assert.equal(r.excluded, false);
    assert.equal(r.score, 28);
    assert.equal(r.maxScore, 33);
    assert.equal(r.percent, 85);
    assert.deepEqual(r.reasons, [
        raison('need', 'website'),
        raison('industry', 'commerce'),
        raison('goal', 'sell'),
        raison('complexity', 'simple'),
        raison('customization', 'ready'),
    ]);
});

test('percent arrondi à l\'entier le plus proche', () => {
    const sol = S('b', {
        needs: ['website'], industries: ['commerce'], goals: ['sell'], complexity: [], customization: ['ready'],
    });
    // score = 10 + 5 + 5 + 0 + 4 = 24 ; 24 / 33 = 72,7 % → 73
    const r = scoreSolution(REP_SITE, sol, Q);
    assert.equal(r.score, 24);
    assert.equal(r.percent, 73);
    assert.ok(Number.isInteger(r.percent));
});

test('goal multiple : proportion des codes choisis présents dans match.goals', () => {
    const reponses = { need: 'website', goal: ['showcase', 'leads', 'sell', 'centralize'] };
    const sol = S('g', { needs: ['website'], goals: ['sell', 'leads', 'automate'] });
    // goal : 10 × (2 sur 4) = 5 ; need 10 ; score 15 ; maxScore 10 + 10 = 20 ; 75 %
    const r = scoreSolution(reponses, sol, Q);
    assert.equal(r.score, 15);
    assert.equal(r.maxScore, 20);
    assert.equal(r.percent, 75);
    const codesGoal = r.reasons.filter((x) => x.questionId === 'goal').map((x) => x.code).sort();
    assert.deepEqual(codesGoal, ['leads', 'sell']);
});

test('goal : tableau vide = question non répondue (maxScore réduit)', () => {
    const reponses = { need: 'website', goal: [] };
    const sol = S('g', { needs: ['website'], goals: ['sell'] });
    // seul need compte : 10 sur 10
    const r = scoreSolution(reponses, sol, Q);
    assert.equal(r.score, 10);
    assert.equal(r.maxScore, 10);
    assert.equal(r.percent, 100);
    assert.ok(validateAnswers(reponses, Q).includes('goal'));
});

test('industry : match.industries vide vaut la moitié du poids', () => {
    const reponses = { need: 'website', industry: 'commerce' };
    const sol = S('i', { needs: ['website'], industries: [] });
    // need 10 + industry 5 × 0,5 = 2,5 → 12,5 ; maxScore 15 ; 83,3 % → 83
    const r = scoreSolution(reponses, sol, Q);
    assert.equal(r.score, 12.5);
    assert.equal(r.maxScore, 15);
    assert.equal(r.percent, 83);
});

test('industry : code absent de match.industries ne rapporte rien', () => {
    const reponses = { need: 'website', industry: 'commerce' };
    const sol = S('i', { needs: ['website'], industries: ['restaurant'] });
    const r = scoreSolution(reponses, sol, Q);
    assert.equal(r.score, 10);
    assert.equal(r.maxScore, 15);
});

test('complexity "unsure" vaut la moitié du poids', () => {
    const reponses = { need: 'website', complexity: 'unsure' };
    const sol = S('c', { needs: ['website'], complexity: ['simple'] });
    // need 10 + complexity 4 × 0,5 = 2 → 12 ; maxScore 14 ; 85,7 % → 86
    const r = scoreSolution(reponses, sol, Q);
    assert.equal(r.score, 12);
    assert.equal(r.maxScore, 14);
    assert.equal(r.percent, 86);
});

test('budget et deadline ne changent jamais le score ni le maximum', () => {
    const base = { need: 'website', industry: 'commerce', goal: ['sell'], complexity: 'simple', customization: 'ready' };
    const sol = S('c', {
        needs: ['website'], industries: ['commerce'], goals: ['sell'], complexity: ['simple'], customization: ['ready'],
    });
    const ref = scoreSolution(base, sol, Q);
    for (const budget of ['under-500', 'over-5000', 'undefined']) {
        for (const deadline of ['urgent', 'flexible']) {
            const r = scoreSolution({ ...base, budget, deadline }, sol, Q);
            assert.equal(r.score, ref.score, `budget ${budget}, deadline ${deadline}`);
            assert.equal(r.maxScore, ref.maxScore, `budget ${budget}, deadline ${deadline}`);
            assert.equal(r.percent, ref.percent, `budget ${budget}, deadline ${deadline}`);
            assert.ok(r.reasons.every((x) => x.questionId !== 'budget' && x.questionId !== 'deadline'));
        }
    }
});

test('aucune question répondue : maxScore 0, percent 0, aucun résultat', () => {
    const sol = S('a', { needs: ['website'] });
    const r = scoreSolution({}, sol, Q);
    assert.equal(r.score, 0);
    assert.equal(r.maxScore, 0);
    assert.equal(r.percent, 0);
    assert.deepEqual(slugs(recommend({}, [sol], Q).results), []);
});

// ---------- Seuil, nombre de résultats, candidats ----------

// Réponses : besoin « unsure » (5 pour toute solution) et objectifs showcase + leads (maxScore 20)
//   X : goals [showcase]           → 5 + 5 = 10  → 50 %
//   Y : aucun objectif             → 5           → 25 %
//   Z : goals [showcase, leads]    → 5 + 10 = 15 → 75 %
const SEUIL_REP = { need: 'unsure', goal: ['showcase', 'leads'] };
const SEUIL_X = S('x', { goals: ['showcase'] });
const SEUIL_Y = S('y', {});
const SEUIL_Z = S('z', { goals: ['showcase', 'leads'] });

test('seuil par défaut 50 : 50 % retenue, 25 % écartée', () => {
    assert.equal(scoreSolution(SEUIL_REP, SEUIL_X, Q).percent, 50);
    assert.equal(scoreSolution(SEUIL_REP, SEUIL_Y, Q).percent, 25);
    assert.equal(scoreSolution(SEUIL_REP, SEUIL_Z, Q).percent, 75);
    assert.deepEqual(slugs(recommend(SEUIL_REP, [SEUIL_Y, SEUIL_X, SEUIL_Z], Q).results), ['z', 'x']);
});

test('options.threshold respecté', () => {
    assert.deepEqual(slugs(recommend(SEUIL_REP, [SEUIL_Y, SEUIL_X, SEUIL_Z], Q, { threshold: 75 }).results), ['z']);
    assert.deepEqual(slugs(recommend(SEUIL_REP, [SEUIL_Y, SEUIL_X, SEUIL_Z], Q, { threshold: 25 }).results), ['z', 'x', 'y']);
});

test('au plus 3 résultats par défaut, options.max respecté', () => {
    const cinq = ['s1', 's2', 's3', 's4', 's5'].map((slug) => S(slug, { needs: ['website'] }));
    const reponses = { need: 'website' };
    assert.equal(recommend(reponses, cinq, Q).results.length, 3);
    assert.equal(recommend(reponses, cinq, Q, { max: 2 }).results.length, 2);
    assert.equal(recommend(reponses, cinq, Q, { max: 5 }).results.length, 5);
});

test('draft et archived ne sont jamais recommandés', () => {
    const reponses = { need: 'website' };
    const solutions = [
        S('brouillon', { needs: ['website'] }, { status: 'draft' }),
        S('archivee', { needs: ['website'] }, { status: 'archived' }),
        S('publiee', { needs: ['website'] }, { status: 'published' }),
    ];
    assert.deepEqual(slugs(recommend(reponses, solutions, Q, { max: 10, threshold: 0 }).results), ['publiee']);
});

// ---------- Tri ----------

test('tri : pourcentage décroissant, quel que soit l\'ordre d\'entrée', () => {
    const reponses = { need: 'website', goal: ['showcase', 'leads'] };
    const p = S('p', { needs: ['website'], goals: ['showcase', 'leads'] }, { name: { fr: 'Zeta' } }); // 100 %
    const q = S('q', { needs: ['website'], goals: ['showcase'] }, { name: { fr: 'Alpha' } }); // 75 %
    assert.deepEqual(slugs(recommend(reponses, [q, p], Q).results), ['p', 'q']);
});

test('tri à égalité : published avant exemple, puis featured, puis nom', () => {
    const reponses = { need: 'website', goal: ['showcase', 'leads'] };
    const m = { needs: ['website'], goals: ['showcase', 'leads'] }; // 100 % pour toutes
    const zeta = S('zeta', m, { name: { fr: 'Zeta' }, status: 'published', featured: false });
    const alpha = S('alpha', m, { name: { fr: 'Alpha' }, status: 'exemple', featured: true });
    const beta = S('beta', m, { name: { fr: 'Beta' }, status: 'published', featured: false });
    const gamma = S('gamma', m, { name: { fr: 'Gamma' }, status: 'published', featured: true });
    // published d'abord : gamma (featured) puis beta et zeta (par nom) ; alpha (exemple, featured) en dernier
    assert.deepEqual(slugs(recommend(reponses, [alpha, zeta, beta, gamma], Q, { max: 10 }).results), ['gamma', 'beta', 'zeta', 'alpha']);
});

// ---------- Raisons ----------

test('raisons : une entrée par question qui rapporte des points, dans l\'ordre du questionnaire', () => {
    const reponses = { ...REP_SITE, goal: ['sell', 'leads'] };
    const complete = S('complete', {
        needs: ['website'], industries: ['commerce'], goals: ['sell', 'leads'], complexity: ['simple'], customization: ['ready'],
    });
    const r = recommend(reponses, [complete], Q).results[0];
    assert.deepEqual(r.reasons.map((x) => x.questionId), ['need', 'industry', 'goal', 'goal', 'complexity', 'customization']);
    assert.equal(r.reasons[0].code, 'website');
    assert.equal(r.reasons[1].code, 'commerce');
    assert.deepEqual(r.reasons.filter((x) => x.questionId === 'goal').map((x) => x.code).sort(), ['leads', 'sell']);
    assert.equal(r.reasons[4].code, 'simple');
    assert.equal(r.reasons[5].code, 'ready');
});

test('raisons : pas d\'entrée pour une question sans points', () => {
    const reponses = { ...REP_SITE, goal: ['sell', 'leads'] };
    const sansSecteur = S('sans-secteur', {
        needs: ['website'], industries: ['restaurant'], goals: ['sell', 'leads'], complexity: ['simple'], customization: ['ready'],
    });
    const r = recommend(reponses, [sansSecteur], Q).results[0];
    assert.equal(r.score, 28);
    assert.equal(r.reasons.some((x) => x.questionId === 'industry'), false);
});

// ---------- Devis sur mesure ----------

test('customQuote : "no-match" quand aucun résultat, recommandée', () => {
    const crm = S('crm', { needs: ['crm'] });
    assert.deepEqual(recommend({ need: 'website' }, [crm], Q).customQuote, { recommended: true, reasons: ['no-match'] });
});

test('customQuote : "custom" et "advanced" dans cet ordre, avec un résultat', () => {
    const reponses = { need: 'website', customization: 'custom', complexity: 'advanced' };
    const ok = S('ok', { needs: ['website'] }); // 10 / (10 + 4 + 4) = 55,6 % : retenue
    const r = recommend(reponses, [ok], Q);
    assert.equal(r.results.length, 1);
    assert.deepEqual(r.customQuote, { recommended: true, reasons: ['custom', 'advanced'] });
});

test('customQuote : "no-match", "custom", "advanced" dans cet ordre, sans doublon', () => {
    const reponses = { need: 'website', customization: 'custom', complexity: 'advanced' };
    const crm = S('crm', { needs: ['crm'] });
    assert.deepEqual(recommend(reponses, [crm], Q).customQuote, {
        recommended: true,
        reasons: ['no-match', 'custom', 'advanced'],
    });
});

test('customQuote : non recommandée pour une demande standard avec un résultat', () => {
    const reponses = { need: 'website', customization: 'ready', complexity: 'simple' };
    const ok = S('ok', { needs: ['website'] });
    const r = recommend(reponses, [ok], Q);
    assert.equal(r.results.length, 1);
    assert.deepEqual(r.customQuote, { recommended: false, reasons: [] });
});

// ---------- Validation des réponses ----------

test('validateAnswers : réponses complètes → aucune question à reprendre', () => {
    assert.deepEqual(validateAnswers(REP_SITE, Q), []);
});

test('validateAnswers : question obligatoire absente', () => {
    const { need, ...sansBesoin } = REP_SITE;
    assert.deepEqual(validateAnswers(sansBesoin, Q), ['need']);
    const { budget, ...sansBudget } = REP_SITE;
    assert.deepEqual(validateAnswers(sansBudget, Q), ['budget']);
});

test('validateAnswers : code inconnu invalide', () => {
    assert.deepEqual(validateAnswers({ ...REP_SITE, need: 'voiture' }, Q), ['need']);
    assert.deepEqual(validateAnswers({ ...REP_SITE, complexity: 'expert' }, Q), ['complexity']);
});

test('validateAnswers : question multiple vide ou contenant un code inconnu', () => {
    assert.deepEqual(validateAnswers({ ...REP_SITE, goal: [] }, Q), ['goal']);
    assert.deepEqual(validateAnswers({ ...REP_SITE, goal: ['sell', 'inconnu'] }, Q), ['goal']);
    assert.deepEqual(validateAnswers({ ...REP_SITE, goal: ['sell', 'leads'] }, Q), []);
});

test('validateAnswers : sans aucune réponse, toutes les questions obligatoires sont listées', () => {
    const attendues = ['need', 'industry', 'goal', 'complexity', 'budget', 'deadline', 'customization'];
    assert.deepEqual([...validateAnswers({}, Q)].sort(), [...attendues].sort());
});

// ---------- Déterminisme et absence de modification des entrées ----------

test('déterminisme : deux appels identiques donnent le même résultat', () => {
    assert.deepEqual(recommend(REP_SITE, REELLES, Q), recommend(REP_SITE, REELLES, Q));
});

test('les tableaux et objets passés en entrée ne sont pas modifiés', () => {
    const reponses = { ...REP_SITE, goal: ['sell', 'leads'] };
    const solutions = [
        S('a', { needs: ['website'], goals: ['sell'] }),
        S('b', { needs: ['website'], goals: ['leads', 'sell'] }),
    ];
    const avant = JSON.stringify([reponses, solutions, Q]);
    recommend(reponses, solutions, Q, { max: 2, threshold: 10 });
    validateAnswers(reponses, Q);
    assert.equal(JSON.stringify([reponses, solutions, Q]), avant);
});

// ---------- Entrées anormales ----------

test('entrées anormales : réponses, solutions ou questionnaire absents ne lèvent pas d\'erreur', () => {
    const vide = { results: [], customQuote: { recommended: true, reasons: ['no-match'] } };
    assert.deepEqual(recommend(null, null, null), vide);
    assert.deepEqual(recommend(undefined, [], Q), vide);
    assert.deepEqual(recommend({ need: 'website' }, [null, undefined, {}, S('a', { needs: ['website'] })], []), vide);
    assert.deepEqual(validateAnswers(null, Q).length, Q.length);
    assert.deepEqual(validateAnswers({}, null), []);
});

test('entrées anormales : solution sans bloc match', () => {
    const sansMatch = { id: 'x', slug: 'x', status: 'published', name: { fr: 'x' } };
    // besoin précis : exclue (match.needs absent = ne contient pas le besoin)
    assert.equal(scoreSolution({ need: 'website' }, sansMatch, Q).excluded, true);
    assert.deepEqual(slugs(recommend({ need: 'website' }, [sansMatch], Q).results), []);
    // besoin « unsure » : 5 sur 10, secteur tous secteurs 2,5 sur 5 → 7,5 / 15 = 50 %
    const r = scoreSolution({ need: 'unsure', industry: 'commerce' }, sansMatch, Q);
    assert.equal(r.excluded, false);
    assert.equal(r.score, 7.5);
    assert.equal(r.percent, 50);
});

test('entrées anormales : code de besoin inconnu → aucune solution, devis sur mesure', () => {
    const r = recommend({ ...REP_SITE, need: 'voiture' }, REELLES, Q);
    assert.deepEqual(r.results, []);
    assert.deepEqual(r.customQuote, { recommended: true, reasons: ['no-match'] });
});

test('entrées anormales : un objectif inconnu compte dans les codes choisis, sans raison associée', () => {
    const sol = S('g', { needs: ['website'], goals: ['sell'] });
    // goal : 10 × (1 sur 2) = 5 ; need 10 ; 15 / 20 = 75 %
    const r = scoreSolution({ need: 'website', goal: ['sell', 'inconnu'] }, sol, Q);
    assert.equal(r.score, 15);
    assert.equal(r.percent, 75);
    assert.deepEqual(r.reasons, [raison('need', 'website'), raison('goal', 'sell')]);
});

test('seuil : le pourcentage arrondi fait foi (49,5 % → 50 retenue ; 49,4 % écartée)', () => {
    // Questionnaire réduit : need 99 + complexity 101 = 200 ; besoin trouvé, ampleur non → 99 / 200 = 49,5 % → 50
    const q1 = [{ id: 'need', type: 'single', weight: 99, scored: true }, { id: 'complexity', type: 'single', weight: 101, scored: true }];
    const sol = S('s', { needs: ['website'], complexity: ['advanced'] });
    const rep = { need: 'website', complexity: 'simple' };
    assert.equal(scoreSolution(rep, sol, q1).percent, 50);
    assert.deepEqual(slugs(recommend(rep, [sol], q1).results), ['s']);
    // need 247 sur 500 = 49,4 % → 49 : écartée
    const q2 = [{ id: 'need', type: 'single', weight: 247, scored: true }, { id: 'complexity', type: 'single', weight: 253, scored: true }];
    assert.equal(scoreSolution(rep, sol, q2).percent, 49);
    assert.deepEqual(slugs(recommend(rep, [sol], q2).results), []);
});

test('raisons : "unsure" (besoin, ampleur) et secteur « tous secteurs » donnent une raison', () => {
    const sol = S('u', { needs: ['crm'], complexity: ['simple'] });
    const r = scoreSolution({ need: 'unsure', industry: 'commerce', complexity: 'unsure' }, sol, Q);
    assert.deepEqual(r.reasons, [raison('need', 'unsure'), raison('industry', 'commerce'), raison('complexity', 'unsure')]);
});

// ---------- Données réelles (assets/data/) ----------

test('données réelles : site vitrine pour un consultant arrive en premier', () => {
    const reponses = {
        need: 'website',
        industry: 'consultant',
        goal: ['showcase', 'leads'],
        complexity: 'simple',
        budget: '500-1000',
        deadline: '1-month',
        customization: 'ready',
    };
    const r = recommend(reponses, REELLES, Q);
    assert.equal(r.results[0].solution.slug, 'exemple-site-vitrine');
    // 10 + 5 × 0,5 + 10 + 4 + 4 = 30,5 sur 33 → 92 %
    assert.equal(r.results[0].percent, 92);
    assert.equal(slugs(r.results).includes('exemple-boutique-en-ligne'), false);
    assert.deepEqual(r.customQuote, { recommended: false, reasons: [] });
});

test('données réelles : boutique en ligne pour un commerce arrive en premier', () => {
    const reponses = {
        need: 'ecommerce',
        industry: 'commerce',
        goal: ['sell', 'manage-customers'],
        complexity: 'intermediate',
        budget: '1000-2500',
        deadline: '1-2-weeks',
        customization: 'some-changes',
    };
    const r = recommend(reponses, REELLES, Q);
    assert.equal(r.results[0].solution.slug, 'exemple-boutique-en-ligne');
    assert.equal(r.results[0].percent, 92);
});

// ---------- Résumé ----------

const echecs = resultats.filter((ok) => !ok).length;
console.log('');
console.log(`${resultats.length - echecs} test(s) réussi(s), ${echecs} échec(s) sur ${resultats.length}.`);
process.exitCode = echecs ? 1 : 0;
