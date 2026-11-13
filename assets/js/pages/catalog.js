/*
 * Page Solutions (catalogue) : filtres par catégorie, recherche, compteur,
 * grille de cartes et état vide.
 *
 * L'état (catégorie, recherche) est reflété dans l'adresse
 * (?categorie=crm&q=…) avec history.replaceState et relu au chargement :
 * un lien filtré peut être partagé. Les textes du compteur sont dans le HTML
 * (data-count-one / data-count-many) ; ceux des cartes dans solution-view.js.
 */
import '../main.js';
import { getCategories, getSolutions, localized } from '../services/catalog-service.js';
import { solutionCardHtml } from '../components/solution-view.js';
import { escapeHtml } from '../utils/html.js';

const PARAM_CATEGORY = 'categorie';
const PARAM_QUERY = 'q';

const app = document.getElementById('catalog');
if (app) initCatalog(app);

async function initCatalog(root) {
    const filters = document.getElementById('catalog-filters');
    const search = document.getElementById('catalog-search');
    const count = document.getElementById('catalog-count');
    const listEl = document.getElementById('catalog-list');
    const empty = document.getElementById('catalog-empty');
    const reset = document.getElementById('catalog-reset');
    const catBox = document.getElementById('catalog-category');
    const catLabel = document.getElementById('catalog-category-label');
    const catDesc = document.getElementById('catalog-category-desc');

    let categories;
    try {
        categories = await getCategories();
        await getSolutions();
    } catch (error) {
        count.textContent = root.dataset.error;
        filters.hidden = true;
        search.closest('.search').hidden = true;
        return;
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    const bySlug = new Map(categories.map((c) => [c.slug || c.id, c]));

    // Boutons de catégorie, après « Toutes » (déjà dans le HTML)
    filters.insertAdjacentHTML('beforeend', categories.map((c) =>
        `<button class="filter" type="button" aria-pressed="false" data-category="${escapeHtml(c.id)}">${escapeHtml(localized(c.label) || c.id)}</button>`).join(''));

    // État initial lu dans l'adresse ; une catégorie inconnue revient à « Toutes »
    const params = new URLSearchParams(window.location.search);
    const state = {
        category: bySlug.get(params.get(PARAM_CATEGORY) || '')?.id || 'all',
        query: (params.get(PARAM_QUERY) || '').slice(0, 100),
    };
    search.value = state.query;

    function writeUrl() {
        const url = new URL(window.location.href);
        const category = byId.get(state.category);
        // Ordre stable (categorie puis q) : une même sélection donne toujours la même adresse
        url.searchParams.delete(PARAM_CATEGORY);
        url.searchParams.delete(PARAM_QUERY);
        if (category) url.searchParams.set(PARAM_CATEGORY, category.slug || category.id);
        if (state.query.trim()) url.searchParams.set(PARAM_QUERY, state.query.trim());
        if (url.href !== window.location.href) window.history.replaceState(null, '', url);
    }

    function countText(n) {
        const template = n > 1 ? root.dataset.countMany : root.dataset.countOne;
        return template.replace('{n}', String(n));
    }

    let renderId = 0;
    async function render() {
        const id = ++renderId;
        const solutions = await getSolutions({ category: state.category, query: state.query });
        if (id !== renderId) return; // une saisie plus récente a déjà été affichée

        filters.querySelectorAll('.filter').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.category === state.category));
        });

        const category = byId.get(state.category);
        const description = category ? localized(category.description) : '';
        catBox.hidden = !category;
        catLabel.textContent = category ? localized(category.label) : '';
        catDesc.textContent = description;
        catDesc.hidden = !description;

        listEl.innerHTML = solutions.map((s) => solutionCardHtml(s, localized(byId.get(s.categoryId)?.label))).join('');
        listEl.hidden = !solutions.length;
        empty.hidden = solutions.length > 0;
        count.textContent = countText(solutions.length);
    }

    filters.addEventListener('click', (event) => {
        const button = event.target.closest('.filter');
        if (!button || button.dataset.category === state.category) return;
        state.category = button.dataset.category;
        writeUrl();
        render();
    });

    search.addEventListener('input', () => {
        state.query = search.value;
        writeUrl();
        render();
    });

    reset.addEventListener('click', () => {
        state.category = 'all';
        state.query = '';
        search.value = '';
        writeUrl();
        render();
        search.focus();
    });

    await render();
}
