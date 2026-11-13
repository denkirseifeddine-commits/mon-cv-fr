/*
 * Service du questionnaire « Trouver ma solution ».
 *
 * Version actuelle (sans serveur) : lit assets/data/questionnaire.json avec
 * fetch (adresse construite avec siteRoot(), donc valable à la racine comme
 * sous /mon-cv-fr/) et le garde en cache le temps de la visite.
 *
 * Évolution prévue : getQuestionnaire() pourra appeler l'API (voir
 * docs/API-CONTRACT.md) sans que les pages changent.
 *
 * Les fonctions pures (questionTitle, questionHelp, optionLabel, answerLabel)
 * ne touchent ni au DOM ni au réseau. Un libellé absent renvoie le code :
 * la page reste utilisable même si un texte manque.
 */
import { siteRoot } from '../utils/site-root.js';
import { localized } from './catalog-service.js';

let cache = null;

// Questionnaire (tableau de questions, dans l'ordre d'affichage) ; un échec n'est pas mis en cache
export function getQuestionnaire() {
    if (!cache) {
        cache = fetch(`${siteRoot()}assets/data/questionnaire.json`)
            .then((response) => {
                if (!response.ok) throw new Error(`questionnaire.json : HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => (Array.isArray(data) ? data.filter((q) => q && typeof q.id === 'string') : []))
            .catch((error) => {
                cache = null;
                throw error;
            });
    }
    return cache;
}

export function questionTitle(question, locale) {
    return localized(question?.title, locale) || question?.id || '';
}

export function questionHelp(question, locale) {
    return localized(question?.help, locale);
}

// Libellé d'un code de réponse ; le code lui-même s'il n'a pas de libellé
export function optionLabel(question, code, locale) {
    return localized(question?.labels?.[code], locale) || String(code ?? '');
}

// Libellé d'une réponse (code ou liste de codes, séparés par des virgules)
export function answerLabel(question, value, locale) {
    const codes = Array.isArray(value) ? value : (value == null || value === '' ? [] : [value]);
    return codes.map((code) => optionLabel(question, code, locale)).join(', ');
}

// Question par son id, ou null
export function findQuestion(questionnaire, id) {
    return (Array.isArray(questionnaire) ? questionnaire : []).find((q) => q.id === id) || null;
}
