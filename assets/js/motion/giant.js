/*
 * Mot géant écrit d'un seul bloc, sans une lettre par <span>.
 *
 * Les pages françaises et anglaises découpent le mot géant en lettres
 * (<span>D</span><span>I</span>…) : chaque lettre monte à son tour et la
 * taille est fixée par la page (--fit mesuré pour Anton). L'arabe est une
 * écriture liée : découper les lettres casserait les ligatures, le mot est
 * donc écrit tel quel dans .giant, .giant-word ou .page-giant-part.
 *
 * Pour ces mots entiers, ce module :
 * 1. enveloppe le texte dans un seul <span class="giant-whole"> : les règles
 *    d'animation existantes (.giant span, .page-giant-part > span) font alors
 *    monter le mot d'un bloc ;
 * 2. mesure sa largeur dans la police réellement chargée et écrit --fit
 *    (largeur en em) sur le mot géant, pour qu'il remplisse la largeur
 *    (règles .is-whole d'editorial.css, home.css et pages.css). La mesure est
 *    refaite une fois les polices chargées.
 * Les mots découpés en lettres ne sont pas touchés.
 */

// Conteneurs d'un mot (ou d'une partie de mot) dans un mot géant
const PARTS = '.giant, .giant-word, .page-giant-part';

// Texte non vide sans élément enfant : mot entier à envelopper
function isBareText(el) {
    return el.children.length === 0 && el.textContent.trim() !== '';
}

function wrap(el) {
    const span = document.createElement('span');
    span.className = 'giant-whole';
    span.textContent = el.textContent.trim();
    el.replaceChildren(span);
    return span;
}

// Largeur d'un mot enveloppé, en em de sa police
function widthEm(span) {
    const size = parseFloat(getComputedStyle(span).fontSize) || 0;
    const width = span.getBoundingClientRect().width;
    return size > 0 && width > 0 ? width / size : 0;
}

function setFit(el, name, value) {
    if (value > 0) el.style.setProperty(name, value.toFixed(3));
}

// .giant (accueil, portfolio) : --fit = mots côte à côte (avec une espace
// de 0,3 em entre eux), --fit-col = mot le plus large (mots empilés sur mobile)
function fitGiant(giant) {
    const widths = [...giant.querySelectorAll('.giant-whole')].map(widthEm).filter((w) => w > 0);
    if (!widths.length) return;
    setFit(giant, '--fit', widths.reduce((a, b) => a + b, 0) + 0.3 * (widths.length - 1));
    setFit(giant, '--fit-col', Math.max(...widths));
}

// .page-giant (pages intérieures) : --fit = toutes les parties sur une ligne,
// --fit-part = largeur de chaque partie (mot coupé en deux lignes, data-split)
function fitPageGiant(giant) {
    let total = 0;
    giant.querySelectorAll('.page-giant-part').forEach((part) => {
        const span = part.querySelector('.giant-whole');
        const w = span ? widthEm(span) : 0;
        setFit(part, '--fit-part', w);
        total += w;
    });
    setFit(giant, '--fit', total);
}

export function initGiant() {
    const giants = [...document.querySelectorAll('.giant, .page-giant')].filter((giant) => {
        const parts = [giant, ...giant.querySelectorAll(PARTS)].filter(isBareText);
        parts.forEach(wrap);
        return parts.length > 0;
    });
    if (!giants.length) return;

    const fit = () => giants.forEach((giant) => {
        if (giant.classList.contains('page-giant')) fitPageGiant(giant);
        else fitGiant(giant);
    });
    giants.forEach((giant) => giant.classList.add('is-whole'));
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
}
