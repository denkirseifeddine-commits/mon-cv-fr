/*
 * Icônes en SVG en ligne pour l'en-tête et le pied de page, afin de ne pas
 * dépendre du sprite <symbol> présent seulement dans index.html.
 * Décoratives : aria-hidden, non focalisables. La taille vient du CSS.
 */
function svg(className, viewBox, body) {
    return `<svg class="${className}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function starIcon(className = 'star') {
    return svg(className, '0 0 24 24', '<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" stroke-width="1.6"/>');
}

export function arrowIcon(className = 'arrow') {
    return svg(className, '0 0 48 12', '<path d="M0 6h46M40 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.2"/>');
}

export function mailIcon(className = 'icon') {
    return svg(className, '0 0 24 24', '<path d="M3 6h18v12H3zM3 7l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>');
}

export function phoneIcon(className = 'icon') {
    return svg(className, '0 0 24 24', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>');
}

export function linkedinIcon(className = 'icon') {
    return svg(className, '0 0 24 24', '<rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="8.5" r="0.9" fill="currentColor"/><path d="M8 11v6M11.5 17v-6M11.5 13a2.5 2.5 0 0 1 5 0v4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>');
}

export function pinIcon(className = 'icon') {
    return svg(className, '0 0 24 24', '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.5"/>');
}
