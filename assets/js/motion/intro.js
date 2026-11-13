// Animation d'entrée : la classe is-loaded est posée une fois les polices
// chargées (au plus tard après 1,5 s) pour éviter un saut de texte.
export function initIntro() {
    const root = document.documentElement;
    const start = () => root.classList.add('is-loaded');
    if (document.fonts && document.fonts.ready) {
        Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]).then(start);
    } else {
        start();
    }
}
