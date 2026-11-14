/*
 * Fiche d'une solution (solutions/fiche/?s=<slug>) : lit le slug dans
 * l'adresse, charge la solution par le service et remplit la page.
 *
 * Slug absent ou inconnu : message « Cette solution n'existe pas ou n'est
 * plus proposée. » et lien vers le catalogue. Une section dont la liste
 * est vide n'est pas affichée. Une solution « exemple » n'a jamais de
 * bouton d'achat : l'action est « Demander un devis ».
 */
import '../main.js';
import { getCategories, getSolutionBySlug, localized } from '../services/catalog-service.js';
import {
    badgeHtml, solutionName, priceLabel, delayLabel, quoteHref, rootUrl, localHref,
} from '../components/solution-view.js';
import { t } from '../i18n/index.js';
import { escapeHtml } from '../utils/html.js';
import { arrowIcon } from '../components/icons.js';

// Titre de chaque section (clés des dictionnaires i18n)
const SECTION_KEYS = {
    problem: 'fiche.section.problem',
    description: 'fiche.section.description',
    features: 'solution.features',
    technologies: 'solution.technologies',
    requirements: 'fiche.section.requirements',
    deliverables: 'fiche.section.deliverables',
    options: 'fiche.section.options',
};

const root = document.getElementById('fiche');
if (root) initSheet(root);

const list = (value) => (Array.isArray(value) ? value : []);

async function initSheet(container) {
    const slug = new URLSearchParams(window.location.search).get('s') || '';
    let solution = null;
    let categories = [];
    try {
        [solution, categories] = await Promise.all([getSolutionBySlug(slug), getCategories()]);
    } catch (error) {
        renderMessage(container, t('fiche.errorKicker'), container.dataset.error);
        return;
    }
    if (!solution) {
        renderMessage(container, t('fiche.notFoundKicker'), container.dataset.notFound);
        document.title = container.dataset.titleNotFound + container.dataset.titleSuffix;
        return;
    }
    const category = categories.find((c) => c.id === solution.categoryId);
    container.innerHTML = sheetHtml(solution, category ? localized(category.label) : '');
    document.title = solutionName(solution) + container.dataset.titleSuffix;
}

// Slug absent ou inconnu, ou données indisponibles : état vide avec retour au catalogue
function renderMessage(container, kicker, text) {
    container.innerHTML = `
        <div class="empty fiche-missing">
            <div>
                <p class="empty-kicker">${escapeHtml(kicker)}</p>
                <h1 class="empty-title">${escapeHtml(text)}</h1>
            </div>
            <div class="empty-actions">
                <a class="btn btn-solid" href="${escapeHtml(localHref('solutions/'))}">${escapeHtml(t('fiche.backToCatalog'))} ${arrowIcon()}</a>
                <a class="link-arrow" href="${escapeHtml(localHref('contact/'))}">${escapeHtml(t('solution.askQuote'))} ${arrowIcon()}</a>
            </div>
        </div>`;
}

function texts(values) {
    return list(values).map((v) => localized(v)).filter(Boolean);
}

// Une section numérotée ; rien si le contenu est vide
function block(key, index, body) {
    if (!body) return '';
    const id = `fiche-${key}`;
    return `
        <section class="fiche-block" aria-labelledby="${id}">
            <h2 class="fiche-block-title" id="${id}"><span class="fiche-num" aria-hidden="true">${String(index).padStart(2, '0')}</span>${escapeHtml(t(SECTION_KEYS[key]))}</h2>
            <div class="fiche-block-body">${body}</div>
        </section>`;
}

function paragraph(value) {
    const text = localized(value);
    return text ? `<p class="fiche-text">${escapeHtml(text)}</p>` : '';
}

function bulletList(values) {
    const items = texts(values);
    return items.length ? `<ul class="fiche-list" role="list">${items.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>` : '';
}

function techList(values) {
    const items = texts(values);
    return items.length ? `<ul class="tech-list fiche-tech" role="list">${items.map((v) => `<li>${escapeHtml(v)}</li>`).join('')}</ul>` : '';
}

function optionList(values) {
    const items = list(values)
        .map((o) => ({ name: localized(o && o.name), description: localized(o && o.description) }))
        .filter((o) => o.name);
    if (!items.length) return '';
    return `<dl class="fiche-options">${items.map((o) => `
        <div><dt>${escapeHtml(o.name)}</dt>${o.description ? `<dd>${escapeHtml(o.description)}</dd>` : ''}</div>`).join('')}
    </dl>`;
}

function shotsHtml(solution) {
    const shots = list(solution.screenshots).filter((s) => s && rootUrl(s.src));
    if (!shots.length) return '';
    return `
        <section class="fiche-shots" aria-label="${escapeHtml(t('fiche.screenshots'))}">
            ${shots.map((s) => `<figure class="fiche-shot"><img src="${escapeHtml(rootUrl(s.src))}" alt="${escapeHtml(localized(s.alt))}" loading="lazy" decoding="async"></figure>`).join('')}
        </section>`;
}

// Démonstration : lien seulement pour une solution publiée avec une adresse https
function demoHtml(solution) {
    const url = typeof solution.demoUrl === 'string' ? solution.demoUrl : '';
    if (solution.status !== 'published' || !/^https:\/\//i.test(url)) return escapeHtml(t('solution.noDemo'));
    return `<a class="text-link" href="${escapeHtml(url)}" rel="noopener">${escapeHtml(t('solution.viewDemo'))}</a>`;
}

function sheetHtml(solution, categoryLabel) {
    const isExample = solution.status === 'exemple';
    const sections = [
        ['problem', paragraph(solution.problem)],
        ['description', paragraph(solution.description)],
        ['features', bulletList(solution.features)],
        ['technologies', techList(solution.technologies)],
        ['requirements', bulletList(solution.requirements)],
        ['deliverables', bulletList(solution.deliverables)],
        ['options', optionList(solution.options)],
    ].filter(([, body]) => body);

    return `
        <header class="fiche-head">
            <div class="fiche-flag">
                ${badgeHtml(solution)}
                ${isExample ? `<p class="fiche-flag-text">${escapeHtml(t('fiche.exampleNote'))}</p>` : ''}
            </div>
            ${categoryLabel ? `<p class="solution-cat fiche-cat">${escapeHtml(categoryLabel)}</p>` : ''}
            <h1 class="fiche-title">${escapeHtml(solutionName(solution))}</h1>
            ${localized(solution.shortDescription) ? `<p class="fiche-lead">${escapeHtml(localized(solution.shortDescription))}</p>` : ''}
        </header>

        <div class="fiche-layout">
            <aside class="fiche-recap" aria-labelledby="fiche-recap-title">
                <h2 class="fiche-recap-title" id="fiche-recap-title">${escapeHtml(t('fiche.recap'))}</h2>
                <dl>
                    <div><dt>${escapeHtml(t('solution.price'))}</dt><dd>${escapeHtml(priceLabel(solution))}</dd></div>
                    <div><dt>${escapeHtml(t('solution.delay'))}</dt><dd>${escapeHtml(delayLabel(solution))}</dd></div>
                    <div><dt>${escapeHtml(t('solution.demo'))}</dt><dd>${demoHtml(solution)}</dd></div>
                </dl>
                <a class="btn btn-solid fiche-quote" href="${escapeHtml(quoteHref(solution))}">${escapeHtml(t('solution.askQuote'))} ${arrowIcon()}</a>
                ${isExample ? `<p class="fiche-recap-note">${escapeHtml(t('fiche.exampleQuote'))}</p>` : ''}
            </aside>

            <div class="fiche-body">
                ${shotsHtml(solution)}
                ${sections.map(([key, body], i) => block(key, i + 1, body)).join('')}
            </div>
        </div>`;
}
