// Échappe un texte avant de l'insérer dans un gabarit HTML
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);
}
