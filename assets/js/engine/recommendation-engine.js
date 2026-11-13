/*
 * Moteur de recommandation du questionnaire « Trouver ma solution ».
 *
 * Fonctions pures, sans DOM ni réseau : elles se testent sous Node par un
 * simple import de ce module (scripts/test-recommendation.mjs).
 *
 * Évolution prévue : le serveur recalculera le score avec
 * POST /api/v1/recommendations (voir docs/API-CONTRACT.md). Ce module reste
 * la référence côté client : mêmes règles, mêmes arrondis, même ordre.
 *
 * Règles (docs du lot 5) :
 * - candidates : statut « published » ou « exemple » uniquement ;
 * - contrainte bloquante : besoin défini et différent de « unsure » absent
 *   de match.needs → solution exclue ;
 * - score = somme, sur les questions notées (`scored`) et répondues, des
 *   points de chaque question ; maxScore = somme de leurs poids ;
 *   percent = Math.round(score / maxScore × 100), retenue si percent ≥ seuil ;
 * - budget et deadline ne sont jamais notés : ils servent à pré-remplir
 *   la demande de devis.
 */

export const DEFAULT_MAX = 3;
export const DEFAULT_THRESHOLD = 50;

// Statuts qui peuvent être recommandés (jamais draft ni archived)
const CANDIDATE_STATUSES = new Set(['published', 'exemple']);
// Ordre de tri à pourcentage égal : publiées avant exemples
const STATUS_RANK = { published: 0, exemple: 1 };
// Questions notées par défaut, si le questionnaire ne précise pas `scored`
const DEFAULT_SCORED = new Set(['need', 'industry', 'goal', 'complexity', 'customization']);
// Réponse « je ne sais pas encore » : moitié des points pour need et complexity
const UNSURE = 'unsure';

const list = (value) => (Array.isArray(value) ? value : []);

function isScored(question) {
    return typeof question.scored === 'boolean' ? question.scored : DEFAULT_SCORED.has(question.id);
}

function weightOf(question) {
    const weight = Number(question.weight);
    return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

// Codes choisis pour une question à choix multiple (doublons et valeurs vides retirés)
function chosenCodes(value) {
    const codes = Array.isArray(value) ? value : (value == null ? [] : [value]);
    return [...new Set(codes.filter((code) => typeof code === 'string' && code !== ''))];
}

// Réponse à une question à choix unique, ou null si absente
function singleAnswer(value) {
    return typeof value === 'string' && value !== '' ? value : null;
}

// Nom en français, pour le tri alphabétique
function nameOf(solution) {
    const name = solution?.name;
    if (typeof name === 'string') return name;
    if (name && typeof name === 'object') return typeof name.fr === 'string' ? name.fr : (Object.values(name).find((v) => typeof v === 'string') || '');
    return '';
}

/*
 * Points d'une question pour une solution.
 * Renvoie null si la question n'est pas répondue (elle ne compte pas dans maxScore),
 * sinon { points, codes } où codes = codes qui ont rapporté des points (raisons).
 */
function scoreQuestion(question, answers, match) {
    const weight = weightOf(question);
    const value = answers[question.id];

    if (question.type === 'multiple') {
        const codes = chosenCodes(value);
        if (!codes.length) return null; // aucun code choisi = non répondue
        const field = question.id === 'goal' ? 'goals' : question.id;
        const accepted = list(match[field]);
        const matched = codes.filter((code) => accepted.includes(code));
        return { points: weight * (matched.length / codes.length), codes: matched };
    }

    const code = singleAnswer(value);
    if (code === null) return null;

    switch (question.id) {
        case 'need':
            if (list(match.needs).includes(code)) return { points: weight, codes: [code] };
            if (code === UNSURE) return { points: weight * 0.5, codes: [code] };
            return { points: 0, codes: [] };
        case 'industry': {
            const industries = list(match.industries);
            if (!industries.length) return { points: weight * 0.5, codes: [code] };
            if (industries.includes(code)) return { points: weight, codes: [code] };
            return { points: 0, codes: [] };
        }
        case 'complexity':
            if (list(match.complexity).includes(code)) return { points: weight, codes: [code] };
            if (code === UNSURE) return { points: weight * 0.5, codes: [code] };
            return { points: 0, codes: [] };
        case 'customization':
            if (list(match.customization).includes(code)) return { points: weight, codes: [code] };
            return { points: 0, codes: [] };
        default: {
            // Question notée non prévue par les règles : correspondance simple avec match[id]
            if (list(match[question.id]).includes(code)) return { points: weight, codes: [code] };
            return { points: 0, codes: [] };
        }
    }
}

/*
 * Score d'une solution.
 * → { excluded, score, maxScore, percent, reasons: [{ questionId, code }] }
 * Une solution exclue (besoin incompatible) a score 0, percent 0 et aucune raison.
 */
export function scoreSolution(answers, solution, questionnaire) {
    const safeAnswers = answers && typeof answers === 'object' ? answers : {};
    const match = solution?.match && typeof solution.match === 'object' ? solution.match : {};
    const questions = list(questionnaire).filter((q) => q && isScored(q));

    let maxScore = 0;
    let score = 0;
    const reasons = [];
    for (const question of questions) {
        const result = scoreQuestion(question, safeAnswers, match);
        if (result === null) continue;
        maxScore += weightOf(question);
        score += result.points;
        if (result.points > 0) result.codes.forEach((code) => reasons.push({ questionId: question.id, code }));
    }

    const need = singleAnswer(safeAnswers.need);
    const excluded = need !== null && need !== UNSURE && !list(match.needs).includes(need);
    if (excluded) return { excluded: true, score: 0, maxScore, percent: 0, reasons: [] };

    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return { excluded: false, score, maxScore, percent, reasons };
}

/*
 * Questions obligatoires sans réponse valide, dans l'ordre du questionnaire.
 * Choix unique : un code connu. Choix multiple : au moins un code, tous connus.
 */
export function validateAnswers(answers, questionnaire) {
    const safeAnswers = answers && typeof answers === 'object' ? answers : {};
    return list(questionnaire)
        .filter((question) => question && question.required)
        .filter((question) => {
            const options = list(question.options);
            const value = safeAnswers[question.id];
            if (question.type === 'multiple') {
                return !(Array.isArray(value) && value.length > 0 && value.every((code) => options.includes(code)));
            }
            return !(typeof value === 'string' && options.includes(value));
        })
        .map((question) => question.id);
}

/*
 * Recommandation : au plus options.max solutions dont le pourcentage atteint
 * options.threshold, triées, et l'avis sur une demande sur mesure.
 */
export function recommend(answers, solutions, questionnaire, options = {}) {
    const safeAnswers = answers && typeof answers === 'object' ? answers : {};
    const max = Number.isInteger(options.max) && options.max >= 0 ? options.max : DEFAULT_MAX;
    const threshold = typeof options.threshold === 'number' && Number.isFinite(options.threshold) ? options.threshold : DEFAULT_THRESHOLD;

    const results = list(solutions)
        .filter((solution) => solution && CANDIDATE_STATUSES.has(solution.status))
        .map((solution) => ({ solution, ...scoreSolution(safeAnswers, solution, questionnaire) }))
        .filter((entry) => !entry.excluded && entry.percent >= threshold)
        .sort((a, b) =>
            b.percent - a.percent
            || (STATUS_RANK[a.solution.status] ?? 2) - (STATUS_RANK[b.solution.status] ?? 2)
            || Number(b.solution.featured === true) - Number(a.solution.featured === true)
            || nameOf(a.solution).localeCompare(nameOf(b.solution), 'fr'))
        .slice(0, max)
        .map(({ solution, score, maxScore, percent, reasons }) => ({ solution, score, maxScore, percent, reasons }));

    const reasons = [];
    if (!results.length) reasons.push('no-match');
    if (safeAnswers.customization === 'custom') reasons.push('custom');
    if (safeAnswers.complexity === 'advanced') reasons.push('advanced');

    return { results, customQuote: { recommended: reasons.length > 0, reasons } };
}
