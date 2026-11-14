/*
 * Page de contact : validation du formulaire de demande de devis, puis
 * envoi par le service de devis (fonction serveur api/quote sur Vercel,
 * e-mail pré-rempli sur GitHub Pages ou en repli) et affichage du résultat.
 *
 * Les textes des champs (erreurs, résumé, retours de copie) sont dans le
 * HTML de la page. Les messages d'envoi (en cours, envoyé, trop de
 * demandes, repli) et le message pré-rempli viennent des dictionnaires i18n
 * (clés contact.*) ; l'e-mail pré-rempli est rédigé dans la langue de la
 * page (quote-service.js). Tout texte est inséré avec textContent.
 * Aucune donnée n'est conservée (ni localStorage, ni cookie).
 *
 * Anti-spam : champ pot de miel `website` (invisible, hors tabulation) et
 * temps passé sur le formulaire (`elapsedMs`), vérifiés par le serveur.
 */
import '../main.js';
import { submitQuote, prepareMailDraft, canSendDirectly } from '../services/quote-service.js';
import { CONTACT } from '../config/navigation.js';
import { getSolutionBySlug, localized } from '../services/catalog-service.js';
import { getQuestionnaire, findQuestion, optionLabel } from '../services/questionnaire-service.js';
import { t } from '../i18n/index.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[0-9 +().-]*$/;
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
// Temps minimal sur le formulaire exigé par le serveur (3 s), avec une marge
const MIN_ELAPSED_MS = 3200;

const length = (value) => [...value.trim()].length;

// Champs validés, dans l'ordre d'affichage (le premier en erreur reçoit le focus).
// Mêmes règles que le serveur (api/_lib/quote-core.mjs). `server` : nom du champ dans la réponse 422.
const RULES = [
    { id: 'q-name', server: 'name', valid: (el) => length(el.value) >= 2 && length(el.value) <= 100 },
    { id: 'q-email', server: 'email', valid: (el) => EMAIL_PATTERN.test(el.value.trim()) && el.value.trim().length <= 254 },
    { id: 'q-phone', server: 'phone', valid: (el) => PHONE_PATTERN.test(el.value.trim()) && length(el.value) <= 40 },
    { id: 'q-need', server: 'need', valid: (el) => el.value !== '' },
    { id: 'q-budget', server: 'budget', valid: (el) => length(el.value) <= 100 },
    { id: 'q-message', server: 'message', valid: (el) => length(el.value) >= 10 && length(el.value) <= 5000 },
    { id: 'q-consent', server: 'consent', valid: (el) => el.checked },
];

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/*
 * Écrit un texte du dictionnaire dans `el` : chaque {nom} est remplacé par
 * le nœud nodes[nom] (lien, <bdi>…), le reste en texte (jamais de HTML).
 */
function fillTemplate(el, template, nodes = {}) {
    el.textContent = '';
    template.split(/(\{\w+\})/).forEach((part) => {
        const name = part.startsWith('{') && part.endsWith('}') ? part.slice(1, -1) : null;
        if (name && nodes[name]) el.append(nodes[name]);
        else if (part) el.append(document.createTextNode(part));
    });
}

const form = document.getElementById('quote-form');
if (form) {
    initQuoteForm(form);
    prefillFromSolution(form);
    prefillFromAnswers(form);
}

/*
 * Arrivée depuis le questionnaire (trouver-ma-solution/) :
 * contact/?besoin=<need>&delai=<deadline>&budget=<budget>, codes de
 * questionnaire.json. Le type de besoin et le délai sont choisis dans leur
 * liste ; le budget est écrit en toutes lettres (libellé du questionnaire).
 * Un code inconnu est ignoré ; un champ déjà rempli n'est jamais remplacé.
 */
async function prefillFromAnswers(quoteForm) {
    const params = new URLSearchParams(window.location.search);
    const selectCode = (select, code) => {
        if (!select || !code || select.value) return;
        if ([...select.options].some((o) => o.value === code)) select.value = code;
    };
    selectCode(quoteForm.elements.need, params.get('besoin'));
    selectCode(quoteForm.elements.deadline, params.get('delai'));

    const budgetCode = params.get('budget');
    const budget = quoteForm.elements.budget;
    if (!budgetCode || !budget || budget.value.trim()) return;
    let question = null;
    try {
        question = findQuestion(await getQuestionnaire(), 'budget');
    } catch (error) {
        return;
    }
    const options = Array.isArray(question?.options) ? question.options : [];
    // Code inconnu, ou saisie du visiteur pendant le chargement : rien n'est écrit
    if (!options.includes(budgetCode) || budget.value.trim()) return;
    budget.value = optionLabel(question, budgetCode);
}

/*
 * Arrivée depuis le catalogue (contact/?solution=<slug>) : pré-remplit le
 * message avec le nom de la solution et, si la fiche ne correspond qu'à un
 * type de besoin, choisit ce type. Slug inconnu : rien n'est pré-rempli.
 * Un champ déjà saisi par le visiteur n'est jamais remplacé.
 */
async function prefillFromSolution(quoteForm) {
    const slug = new URLSearchParams(window.location.search).get('solution');
    if (!slug) return;
    let solution = null;
    try {
        solution = await getSolutionBySlug(slug);
    } catch (error) {
        return;
    }
    const name = solution ? localized(solution.name) : '';
    if (!name) return;

    const message = quoteForm.elements.message;
    if (message && !message.value.trim()) message.value = t('contact.solutionMessage', { name });

    const needs = Array.isArray(solution.match?.needs) ? solution.match.needs : [];
    const need = quoteForm.elements.need;
    if (need && !need.value && needs.length === 1 && [...need.options].some((o) => o.value === needs[0])) {
        need.value = needs[0];
    }
}

function initQuoteForm(form) {
    const summary = document.getElementById('quote-summary');
    const result = document.getElementById('quote-result');
    const resultMsg = document.getElementById('quote-result-msg');
    const quoteText = document.getElementById('quote-text');
    const reopen = document.getElementById('quote-reopen');
    const copyButton = document.getElementById('quote-copy');
    const copyStatus = document.getElementById('quote-copy-status');
    const editButton = document.getElementById('quote-edit');
    const resultNotice = document.getElementById('quote-result-notice');
    const notice = document.getElementById('quote-notice');
    const status = document.getElementById('quote-status');
    const sent = document.getElementById('quote-sent');
    const sentMsg = document.getElementById('quote-sent-msg');
    const submitButton = form.querySelector('button[type="submit"]');
    const submitLabel = submitButton.querySelector('[data-submit-label]');
    const privacy = document.getElementById('quote-privacy');
    const trap = form.elements.website;

    // Copie statique (GitHub Pages) : la demande part de la messagerie du visiteur
    const direct = canSendDirectly();
    if (!direct) {
        submitLabel.textContent = t('contact.submitMail');
        privacy.textContent = t('contact.privacyMail');
    }
    const idleLabel = submitLabel.textContent;
    // Début de la mesure du temps passé sur le formulaire
    const startedAt = performance.now();
    let pending = false;

    const fields = RULES.map((rule) => {
        const el = document.getElementById(rule.id);
        const error = document.getElementById(`${rule.id}-error`);
        // aria-describedby d'origine (aide éventuelle), complété par l'erreur si besoin
        const describedBy = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        return { ...rule, el, error, describedBy };
    });

    let submitted = false;
    let lastText = '';

    function setInvalid(field, invalid) {
        field.error.hidden = !invalid;
        const ids = invalid ? [...field.describedBy, field.error.id] : field.describedBy;
        if (invalid) field.el.setAttribute('aria-invalid', 'true');
        else field.el.removeAttribute('aria-invalid');
        if (ids.length) field.el.setAttribute('aria-describedby', ids.join(' '));
        else field.el.removeAttribute('aria-describedby');
    }

    function check(field) {
        const ok = field.valid(field.el);
        setInvalid(field, !ok);
        return ok;
    }

    function summaryTitle(count) {
        const template = count === 1 ? summary.dataset.titleOne : summary.dataset.titleMany;
        return template.replace('{n}', String(count));
    }

    // Résumé annoncé (role="alert") : vidé puis rempli pour être relu à chaque soumission
    function renderSummary(invalid) {
        summary.textContent = '';
        if (!invalid.length) return;
        requestAnimationFrame(() => {
            const title = document.createElement('p');
            title.className = 'form-summary-title';
            title.textContent = summaryTitle(invalid.length);
            const list = document.createElement('ul');
            list.setAttribute('role', 'list');
            invalid.forEach((field) => {
                const item = document.createElement('li');
                item.dataset.field = field.id;
                const link = document.createElement('a');
                link.href = `#${field.id}`;
                link.textContent = field.error.textContent;
                item.append(link);
                list.append(item);
            });
            summary.append(title, list);
        });
    }

    // Après correction d'un champ : retiré du résumé, compteur mis à jour
    function updateSummary() {
        const list = summary.querySelector('ul');
        if (!list) return;
        const remaining = fields.filter((f) => f.el.getAttribute('aria-invalid') === 'true');
        list.querySelectorAll('li').forEach((item) => {
            if (!remaining.some((f) => f.id === item.dataset.field)) item.remove();
        });
        if (!list.children.length) { summary.textContent = ''; return; }
        const title = summary.querySelector('.form-summary-title');
        const text = summaryTitle(list.children.length);
        if (title && title.textContent !== text) title.textContent = text;
    }

    summary.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (target) { event.preventDefault(); target.focus(); }
    });

    // Validation à la correction, une fois le formulaire soumis
    fields.forEach((field) => {
        const revalidate = () => {
            if (!submitted && field.el.getAttribute('aria-invalid') !== 'true') return;
            check(field);
            updateSummary();
        };
        field.el.addEventListener('input', revalidate);
        field.el.addEventListener('change', revalidate);
    });

    function selectedLabel(select) {
        return select.value ? select.options[select.selectedIndex].text.trim() : '';
    }

    function setPending(on) {
        pending = on;
        submitButton.disabled = on;
        submitLabel.textContent = on ? t('contact.sending') : idleLabel;
        if (on) form.setAttribute('aria-busy', 'true');
        else form.removeAttribute('aria-busy');
        status.textContent = on ? t('contact.sending') : '';
    }

    // Message « trop de demandes » (role="alert"), avec le lien vers l'adresse du studio
    function showNotice(template) {
        notice.textContent = '';
        if (!template) return;
        const link = document.createElement('a');
        link.href = `mailto:${CONTACT.email}`;
        const address = document.createElement('bdi');
        address.textContent = CONTACT.email;
        link.append(address);
        requestAnimationFrame(() => {
            const text = document.createElement('p');
            fillTemplate(text, template, { email: link });
            notice.append(text);
        });
    }

    function payloadFrom() {
        const data = new FormData(form);
        const need = form.elements.need;
        const deadline = form.elements.deadline;
        return {
            name: String(data.get('name') || ''),
            email: String(data.get('email') || ''),
            phone: String(data.get('phone') || ''),
            need: need.value,
            needLabel: selectedLabel(need),
            deadline: deadline.value,
            deadlineLabel: selectedLabel(deadline),
            budget: String(data.get('budget') || ''),
            message: String(data.get('message') || ''),
            consent: form.elements.consent.checked,
            solution: solutionSlug(),
            website: trap ? trap.value : '',
            elapsedMs: Math.round(performance.now() - startedAt),
        };
    }

    function solutionSlug() {
        const slug = new URLSearchParams(window.location.search).get('solution') || '';
        return SLUG_PATTERN.test(slug) ? slug : '';
    }

    // Erreurs renvoyées par le serveur (422) : rattachées aux champs du formulaire
    function showServerErrors(names) {
        const invalid = fields.filter((field) => names.includes(field.server));
        fields.forEach((field) => setInvalid(field, invalid.includes(field)));
        renderSummary(invalid);
        invalid[0].el.focus();
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (pending) return;
        submitted = true;
        showNotice('');
        const invalid = fields.filter((field) => !check(field));
        renderSummary(invalid);
        if (invalid.length) {
            invalid[0].el.focus();
            return;
        }

        setPending(true);
        let payload = payloadFrom();
        let response;
        try {
            // Envoi trop rapide (formulaire pré-rempli) : la demande attend la fin du délai minimal
            if (direct && payload.elapsedMs < MIN_ELAPSED_MS) {
                await wait(MIN_ELAPSED_MS - payload.elapsedMs);
                payload = payloadFrom();
            }
            response = await submitQuote(payload);
        } catch (error) {
            response = prepareMailDraft(payload, { fallback: true });
        }
        setPending(false);

        if (response.status === 'sent') {
            showSent(response.reference);
        } else if (response.status === 'invalid') {
            const known = response.fields.filter((name) => fields.some((field) => field.server === name));
            // Erreur sur un champ non modifiable (liste, langue, solution) : repli sur l'e-mail pré-rempli
            if (known.length && known.length === response.fields.length) showServerErrors(known);
            else showResult(prepareMailDraft(payload, { fallback: true }));
        } else if (response.status === 'rate-limited') {
            showNotice(t('contact.rateLimited'));
            submitButton.focus();
        } else {
            showResult(response);
        }
    });

    function showSent(reference) {
        if (reference) {
            const ref = document.createElement('bdi');
            ref.textContent = reference;
            fillTemplate(sentMsg, t('contact.sent'), { reference: ref });
        } else {
            sentMsg.textContent = t('contact.sentNoReference');
        }
        renderSummary([]);
        form.hidden = true;
        result.hidden = true;
        sent.hidden = false;
        sentMsg.focus();
    }

    function showResult({ mailto, text, fallback }) {
        resultNotice.textContent = fallback ? `${t('contact.fallbackNotice')} ` : '';
        resultNotice.hidden = !fallback;
        lastText = text;
        quoteText.textContent = text;
        reopen.href = mailto;
        copyStatus.textContent = '';
        form.hidden = true;
        result.hidden = false;
        resultMsg.focus();
    }

    editButton.addEventListener('click', () => {
        result.hidden = true;
        form.hidden = false;
        copyStatus.textContent = '';
        fields[0].el.focus();
    });

    function selectQuoteText() {
        const range = document.createRange();
        range.selectNodeContents(quoteText);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Copie : API Clipboard si disponible, sinon sélection du texte (+ tentative execCommand)
    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return 'copied';
            } catch (error) {
                // Permission refusée : on passe au repli
            }
        }
        selectQuoteText();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
        return copied ? 'copied' : 'selected';
    }

    copyButton.addEventListener('click', async () => {
        copyStatus.textContent = '';
        const outcome = await copyText(lastText);
        // Petit délai : la région role="status" annonce le nouveau texte même s'il est identique
        setTimeout(() => {
            copyStatus.textContent = outcome === 'copied' ? copyButton.dataset.copied : copyButton.dataset.selected;
        }, 60);
    });
}
