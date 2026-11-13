/*
 * Page « Trouver ma solution » : questionnaire en sept étapes, puis
 * résultats du moteur de recommandation.
 *
 * - Une question par étape (fieldset + cartes de choix de forms.css),
 *   progression, Précédent / Suivant, validation de l'étape avec
 *   validateAnswers. À chaque changement d'étape, le focus va au titre
 *   de la question.
 * - L'état (étape, réponses) est reflété dans l'adresse
 *   (?etape=3&need=website&goal=sell,leads…) : le bouton Précédent du
 *   navigateur revient à l'étape d'avant. Les valeurs lues dans l'adresse
 *   sont validées contre les codes du questionnaire. Rien n'est stocké
 *   (ni localStorage, ni sessionStorage, ni cookie).
 * - Les libellés des questions viennent de questionnaire.json ; un libellé
 *   absent affiche le code.
 */
import '../main.js';
import { getCategories, getSolutions, localized } from '../services/catalog-service.js';
import {
    getQuestionnaire, questionTitle, questionHelp, optionLabel, answerLabel, findQuestion,
} from '../services/questionnaire-service.js';
import { recommend, validateAnswers } from '../engine/recommendation-engine.js';
import { badgeHtml, solutionName, sheetHref, SOLUTION_TEXT } from '../components/solution-view.js';
import { escapeHtml } from '../utils/html.js';
import { siteRoot } from '../utils/site-root.js';
import { arrowIcon } from '../components/icons.js';

// Libellés d'interface (à déplacer dans assets/i18n/ avec les traductions)
const FINDER_TEXT = {
    // Nom court de chaque question (récapitulatif, liste des étapes) ; repli sur le titre
    names: {
        need: 'Type de besoin',
        industry: 'Secteur',
        goal: 'Objectifs',
        complexity: 'Ampleur du projet',
        budget: 'Budget',
        deadline: 'Délai',
        customization: 'Adaptation',
    },
    stepOf: (n, total) => `Question ${n} sur ${total}`,
    single: 'Choix unique',
    multiple: 'Choix multiple',
    required: 'obligatoire',
    optional: 'facultatif',
    errorSingle: 'Choisissez une réponse pour continuer.',
    errorMultiple: 'Choisissez au moins une réponse pour continuer.',
    resultsLead: (n) => (n === 1
        ? 'Une solution du catalogue correspond à vos réponses.'
        : `${n} solutions du catalogue correspondent à vos réponses.`),
    resultsNone: 'Aucune solution du catalogue ne correspond suffisamment à vos réponses : une demande sur mesure est la meilleure piste.',
    resultsExample: 'Les fiches actuelles sont des exemples, pas encore commercialisés : la demande de devis permet de chiffrer un projet équivalent.',
    rank: (n, total) => `Recommandation ${n} sur ${total}`,
    match: 'Correspondance',
    percent: (n) => `${n} %`,
    why: 'Pourquoi cette solution',
    // Raisons « Pourquoi cette solution » : {label} = libellé de la réponse
    reasons: {
        need: 'Répond à votre besoin : {label}',
        needUnsure: 'Une piste possible pour un besoin encore à préciser',
        industry: 'Adaptée à votre secteur : {label}',
        industryAll: 'Convient à tous les secteurs, dont le vôtre : {label}',
        goal: 'Répond à votre objectif : {label}',
        complexity: 'Adaptée à l\'ampleur de votre projet ({label})',
        complexityUnsure: 'Compatible avec plusieurs niveaux d\'ampleur, à préciser ensemble',
        customization: 'Correspond au niveau d\'adaptation souhaité ({label})',
        other: '{label}',
    },
    custom: {
        kicker: 'Demande sur mesure',
        kickerRecommended: 'Recommandé pour votre projet',
        title: 'Demande',
        titleEm: 'sur mesure',
        reasons: {
            'no-match': 'Aucune solution du catalogue ne correspond suffisamment à vos réponses : un projet conçu pour vous est la meilleure piste.',
            custom: 'Vous attendez une solution entièrement adaptée à votre activité : c\'est le principe d\'un développement sur mesure.',
            advanced: 'Un projet avec des fonctions propres à votre activité se chiffre mieux avec un devis personnalisé.',
        },
        default: 'Aucune piste ne vous convient tout à fait, ou vous préférez un accompagnement personnalisé ? Décrivez votre projet : je vous réponds avec une proposition adaptée.',
        action: 'Demander un devis sur mesure',
    },
};

const PARAM_STEP = 'etape';
const STEP_RESULTS = 'resultats';

const app = document.getElementById('finder');
if (app) initFinder(app);

async function initFinder(root) {
    const status = document.getElementById('finder-status');
    const quiz = document.getElementById('finder-quiz');
    const form = document.getElementById('finder-form');
    const stepBox = document.getElementById('finder-step');
    const stepsList = document.getElementById('finder-steps');
    const progressN = document.getElementById('finder-progress-n');
    const progressTotal = document.getElementById('finder-progress-total');
    const progressType = document.getElementById('finder-progress-type');
    const progressBar = document.getElementById('finder-progress-bar');
    const prev = document.getElementById('finder-prev');
    const next = document.getElementById('finder-next');
    const nextLabel = document.getElementById('finder-next-label');
    const results = document.getElementById('finder-results');
    const resultsTitle = document.getElementById('finder-results-title');
    const resultsLead = document.getElementById('finder-results-lead');
    const recapList = document.getElementById('finder-recap-list');
    const edit = document.getElementById('finder-edit');
    const recoList = document.getElementById('finder-reco-list');

    let questionnaire;
    let solutions;
    let categories;
    try {
        [questionnaire, solutions, categories] = await Promise.all([getQuestionnaire(), getSolutions(), getCategories()]);
        if (!questionnaire.length) throw new Error('questionnaire vide');
    } catch (error) {
        status.textContent = root.dataset.error + ' ';
        const link = document.createElement('a');
        link.className = 'text-link';
        link.href = `${siteRoot()}contact/`;
        link.textContent = SOLUTION_TEXT.askQuote;
        status.append(link);
        return;
    }
    status.hidden = true;

    const total = questionnaire.length;
    const categoryLabel = new Map(categories.map((c) => [c.id, localized(c.label)]));
    const state = { step: 0, results: false, answers: {} };

    // ---------- Adresse ----------

    // Réponses lues dans l'adresse : seuls les codes connus sont gardés
    function readUrl() {
        const params = new URLSearchParams(window.location.search);
        const answers = {};
        questionnaire.forEach((question) => {
            const raw = params.get(question.id);
            if (raw == null) return;
            const options = Array.isArray(question.options) ? question.options : [];
            if (question.type === 'multiple') {
                const codes = [...new Set(raw.split(',').filter((code) => options.includes(code)))];
                if (codes.length) answers[question.id] = codes;
            } else if (options.includes(raw)) {
                answers[question.id] = raw;
            }
        });
        const invalid = validateAnswers(answers, questionnaire);
        const firstInvalid = invalid.length ? questionnaire.findIndex((q) => q.id === invalid[0]) : total;
        const wanted = params.get(PARAM_STEP);
        state.answers = answers;
        if (wanted === STEP_RESULTS && !invalid.length) {
            state.results = true;
            state.step = total - 1;
        } else {
            // « resultats » avec des réponses incomplètes : première question à reprendre
            const n = wanted === STEP_RESULTS ? total : (/^\d+$/.test(wanted || '') ? Number(wanted) - 1 : 0);
            // Une étape n'est accessible que si les précédentes ont une réponse valide
            state.results = false;
            state.step = Math.max(0, Math.min(n, firstInvalid, total - 1));
        }
    }

    function urlFor() {
        const url = new URL(window.location.href);
        [PARAM_STEP, ...questionnaire.map((q) => q.id)].forEach((key) => url.searchParams.delete(key));
        const isFirst = !state.results && state.step === 0;
        if (!isFirst) url.searchParams.set(PARAM_STEP, state.results ? STEP_RESULTS : String(state.step + 1));
        questionnaire.forEach((question) => {
            const value = state.answers[question.id];
            if (Array.isArray(value) ? value.length : value) url.searchParams.set(question.id, Array.isArray(value) ? value.join(',') : value);
        });
        return url;
    }

    // push : nouvelle entrée d'historique (changement d'étape) ; sinon remplacement (réponse modifiée)
    function writeUrl(push) {
        const url = urlFor();
        if (url.href === window.location.href) return;
        if (push) window.history.pushState(null, '', url);
        else window.history.replaceState(null, '', url);
    }

    // ---------- Étapes ----------

    const shortName = (question) => FINDER_TEXT.names[question.id] || questionTitle(question);

    function stepsHtml() {
        return questionnaire.map((question, index) => {
            const done = validateAnswers(state.answers, [question]).length === 0;
            const current = !state.results && index === state.step;
            const classes = [current ? 'is-current' : '', done && !current ? 'is-done' : ''].filter(Boolean).join(' ');
            return `<li${classes ? ` class="${classes}"` : ''}><span class="finder-steps-num">${String(index + 1).padStart(2, '0')}</span><span class="finder-steps-name">${escapeHtml(shortName(question))}</span></li>`;
        }).join('');
    }

    function choiceHtml(question, code, index) {
        const value = state.answers[question.id];
        const checked = Array.isArray(value) ? value.includes(code) : value === code;
        const type = question.type === 'multiple' ? 'checkbox' : 'radio';
        const id = `finder-${question.id}-${index}`.replace(/[^a-z0-9-]/gi, '');
        return `<label class="choice" for="${id}"><input class="choice-input" type="${type}" id="${id}" name="${escapeHtml(question.id)}" value="${escapeHtml(code)}"${checked ? ' checked' : ''}><span class="choice-label">${escapeHtml(optionLabel(question, code))}</span></label>`;
    }

    function stepHtml(question, index) {
        const help = questionHelp(question);
        const multiple = question.type === 'multiple';
        const options = Array.isArray(question.options) ? question.options : [];
        return `
            <fieldset class="choices finder-choices" id="finder-fieldset"${help ? ' aria-describedby="finder-help"' : ''}>
                <legend class="choices-legend" id="finder-legend" tabindex="-1">
                    <span class="visually-hidden">${escapeHtml(FINDER_TEXT.stepOf(index + 1, total))}.</span>
                    <span>${escapeHtml(shortName(question))}</span>
                    <span class="${question.required ? 'field-req' : 'field-opt'}">${escapeHtml(question.required ? FINDER_TEXT.required : FINDER_TEXT.optional)}</span>
                    <span class="choices-title">${escapeHtml(questionTitle(question))}</span>
                </legend>
                ${help ? `<p class="field-help" id="finder-help">${escapeHtml(help)}</p>` : ''}
                <p class="field-error finder-error" id="finder-error" role="alert" hidden>${escapeHtml(multiple ? FINDER_TEXT.errorMultiple : FINDER_TEXT.errorSingle)}</p>
                <div class="choices-grid">${options.map((code, i) => choiceHtml(question, code, i)).join('')}</div>
            </fieldset>`;
    }

    // Réponse de l'étape affichée, lue dans le formulaire
    function readStep(question) {
        const inputs = [...stepBox.querySelectorAll('.choice-input')];
        const checked = inputs.filter((input) => input.checked).map((input) => input.value);
        if (question.type === 'multiple') {
            if (checked.length) state.answers[question.id] = checked;
            else delete state.answers[question.id];
        } else if (checked.length) {
            state.answers[question.id] = checked[0];
        } else {
            delete state.answers[question.id];
        }
    }

    function setError(visible) {
        const fieldset = document.getElementById('finder-fieldset');
        const error = document.getElementById('finder-error');
        if (!fieldset || !error) return;
        error.hidden = !visible;
        fieldset.classList.toggle('is-invalid', visible);
        // L'erreur n'est décrite que lorsqu'elle est affichée (un texte masqué référencé serait lu quand même)
        const ids = [visible ? 'finder-error' : '', document.getElementById('finder-help') ? 'finder-help' : ''].filter(Boolean);
        if (ids.length) fieldset.setAttribute('aria-describedby', ids.join(' '));
        else fieldset.removeAttribute('aria-describedby');
    }

    // Animation discrète d'entrée (coupée par prefers-reduced-motion dans le CSS)
    function animate(el) {
        el.classList.remove('is-entering');
        void el.offsetWidth; // relance l'animation
        el.classList.add('is-entering');
    }

    // Focus sans saut brusque : le bloc est ramené en haut de l'écran s'il n'y est pas déjà
    function focusAt(target, block) {
        target.focus({ preventScroll: true });
        const top = block.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.5) block.scrollIntoView({ block: 'start' });
    }

    function renderStep(focus) {
        const question = questionnaire[state.step];
        quiz.hidden = false;
        results.hidden = true;
        stepsList.innerHTML = stepsHtml();
        stepBox.innerHTML = stepHtml(question, state.step);
        progressN.textContent = String(state.step + 1);
        progressTotal.textContent = String(total);
        progressType.textContent = question.type === 'multiple' ? FINDER_TEXT.multiple : FINDER_TEXT.single;
        progressBar.max = total;
        progressBar.value = state.step + 1;
        progressBar.textContent = `${state.step + 1} / ${total}`;
        prev.hidden = state.step === 0;
        const last = state.step === total - 1;
        nextLabel.textContent = last ? next.dataset.last : next.dataset.next;
        animate(stepBox);
        if (focus) focusAt(document.getElementById('finder-legend'), form);
    }

    // ---------- Résultats ----------

    function reasonText(reason, solution) {
        const question = findQuestion(questionnaire, reason.questionId);
        const label = optionLabel(question, reason.code);
        const t = FINDER_TEXT.reasons;
        let template;
        switch (reason.questionId) {
            case 'need': template = reason.code === 'unsure' ? t.needUnsure : t.need; break;
            case 'industry': template = (solution.match?.industries || []).length ? t.industry : t.industryAll; break;
            case 'goal': template = t.goal; break;
            case 'complexity': template = reason.code === 'unsure' ? t.complexityUnsure : t.complexity; break;
            case 'customization': template = t.customization; break;
            default: template = t.other;
        }
        // Fonction de remplacement : un libellé contenant « $ » est inséré tel quel
        return template.replace('{label}', () => label);
    }

    // Lien de devis : réponses utiles transmises à la page Contact (codes connus seulement)
    function contactHref(params) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, value); });
        const text = query.toString();
        return `${siteRoot()}contact/${text ? `?${text}` : ''}`;
    }

    function recoHtml(entry, index, count) {
        const { solution, percent, reasons } = entry;
        const name = solutionName(solution);
        const id = `finder-reco-${index + 1}`;
        const category = categoryLabel.get(solution.categoryId) || '';
        const desc = localized(solution.shortDescription);
        const hidden = `<span class="visually-hidden">${escapeHtml(SOLUTION_TEXT.forSolution(name))}</span>`;
        const quote = contactHref({ solution: solution.slug, delai: state.answers.deadline, budget: state.answers.budget });
        const why = reasons.map((reason) => `<li>${escapeHtml(reasonText(reason, solution))}</li>`).join('');
        const value = Math.max(0, Math.min(100, Number(percent) || 0));
        return `
            <li class="reco finder-reco" aria-labelledby="${id}">
                <span class="num" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
                <div class="reco-head">
                    <p class="reco-rank">${escapeHtml(FINDER_TEXT.rank(index + 1, count))}</p>
                    <h3 class="reco-name" id="${id}">${escapeHtml(name)}</h3>
                    ${desc ? `<p class="reco-desc">${escapeHtml(desc)}</p>` : ''}
                    ${category ? `<span class="solution-cat">${escapeHtml(category)}</span>` : ''}
                    ${badgeHtml(solution)}
                    <div class="reco-match">
                        <p class="reco-match-text">${escapeHtml(FINDER_TEXT.match)} : <strong>${escapeHtml(FINDER_TEXT.percent(value))}</strong></p>
                        <span class="reco-match-bar" aria-hidden="true"><span style="--p: ${value}%"></span></span>
                    </div>
                </div>
                <div class="reco-why">
                    <h4 class="reco-why-title">${escapeHtml(FINDER_TEXT.why)}</h4>
                    ${why ? `<ul>${why}</ul>` : ''}
                    <div class="reco-actions">
                        <a class="link-arrow" href="${escapeHtml(sheetHref(solution))}">${escapeHtml(SOLUTION_TEXT.viewSheet)}${hidden} ${arrowIcon()}</a>
                        <a class="link-arrow" href="${escapeHtml(quote)}">${escapeHtml(SOLUTION_TEXT.askQuote)}${hidden} ${arrowIcon()}</a>
                    </div>
                </div>
            </li>`;
    }

    function customHtml(customQuote) {
        const t = FINDER_TEXT.custom;
        const recommended = customQuote.recommended;
        const sentences = customQuote.reasons.map((reason) => t.reasons[reason]).filter(Boolean);
        const text = sentences.length ? sentences : [t.default];
        const href = contactHref({ besoin: state.answers.need, delai: state.answers.deadline, budget: state.answers.budget });
        return `
            <article class="finder-custom${recommended ? ' is-recommended' : ''}" aria-labelledby="finder-custom-title">
                <div class="finder-custom-body">
                    <p class="finder-custom-kicker">${escapeHtml(recommended ? t.kickerRecommended : t.kicker)}</p>
                    <h3 class="finder-custom-title" id="finder-custom-title">${escapeHtml(t.title)} <em>${escapeHtml(t.titleEm)}</em></h3>
                    ${text.map((sentence) => `<p>${escapeHtml(sentence)}</p>`).join('')}
                </div>
                <div class="finder-custom-actions">
                    <a class="btn btn-solid" href="${escapeHtml(href)}">${escapeHtml(t.action)} ${arrowIcon()}</a>
                </div>
            </article>`;
    }

    function recapHtml() {
        return questionnaire.map((question) => `
            <div>
                <dt>${escapeHtml(shortName(question))}</dt>
                <dd>${escapeHtml(answerLabel(question, state.answers[question.id]))}</dd>
            </div>`).join('');
    }

    function renderResults(focus) {
        const { results: found, customQuote } = recommend(state.answers, solutions, questionnaire);
        quiz.hidden = true;
        results.hidden = false;

        const lead = [found.length ? FINDER_TEXT.resultsLead(found.length) : FINDER_TEXT.resultsNone];
        if (found.some((entry) => entry.solution.status === 'exemple')) lead.push(FINDER_TEXT.resultsExample);
        resultsLead.textContent = lead.join(' ');
        recapList.innerHTML = recapHtml();

        const recos = found.length
            ? `<ol class="recos finder-recos" role="list">${found.map((entry, i) => recoHtml(entry, i, found.length)).join('')}</ol>`
            : '';
        const custom = customHtml(customQuote);
        recoList.innerHTML = customQuote.recommended ? custom + recos : recos + custom;
        animate(results);
        if (focus) focusAt(resultsTitle, results);
    }

    function render(focus) {
        if (state.results) renderResults(focus);
        else renderStep(focus);
    }

    // ---------- Interactions ----------

    stepBox.addEventListener('change', () => {
        const question = questionnaire[state.step];
        readStep(question);
        if (!validateAnswers(state.answers, [question]).length) setError(false);
        stepsList.innerHTML = stepsHtml();
        writeUrl(false);
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const question = questionnaire[state.step];
        readStep(question);
        if (validateAnswers(state.answers, [question]).length) {
            setError(true);
            const first = stepBox.querySelector('.choice-input');
            if (first) first.focus();
            return;
        }
        if (state.step < total - 1) {
            state.step += 1;
        } else {
            // Dernière étape : toute question encore sans réponse valide est reprise
            const invalid = validateAnswers(state.answers, questionnaire);
            if (invalid.length) {
                state.step = questionnaire.findIndex((q) => q.id === invalid[0]);
                writeUrl(true);
                renderStep(true);
                setError(true);
                return;
            }
            state.results = true;
        }
        writeUrl(true);
        render(true);
    });

    prev.addEventListener('click', () => {
        if (state.step === 0) return;
        readStep(questionnaire[state.step]);
        state.step -= 1;
        writeUrl(true);
        render(true);
    });

    edit.addEventListener('click', () => {
        state.results = false;
        state.step = 0;
        writeUrl(true);
        render(true);
    });

    // Bouton Précédent / Suivant du navigateur : l'adresse fait foi
    window.addEventListener('popstate', () => {
        readUrl();
        render(true);
    });

    readUrl();
    writeUrl(false); // adresse normalisée (codes inconnus retirés, étape inaccessible corrigée)
    render(false);
}
