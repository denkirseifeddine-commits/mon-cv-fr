import { prefersReducedMotion } from '../utils/reduced-motion.js';

// Une seule écoute du défilement, limitée à une mise à jour par image,
// partagée par la barre de progression et la parallaxe.
const tasks = [];
let ticking = false;

function frame() {
    const y = window.scrollY;
    tasks.forEach((task) => task(y));
    ticking = false;
}

function requestFrame() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
}

function onScrollFrame(task) {
    if (!tasks.length) window.addEventListener('scroll', requestFrame, { passive: true });
    tasks.push(task);
    requestFrame();
}

// Barre de progression de lecture (.progress, via la variable --scroll)
export function initProgress() {
    if (prefersReducedMotion) return;
    const root = document.documentElement;
    onScrollFrame((y) => {
        const max = root.scrollHeight - window.innerHeight;
        root.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : 0);
    });
}

// Parallaxe des éléments [data-speed] (variable --shift), en haut de page
export function initParallax(scope = document) {
    if (prefersReducedMotion) return;
    const movers = Array.from(scope.querySelectorAll('[data-speed]'));
    if (!movers.length) return;
    onScrollFrame((y) => {
        if (y >= window.innerHeight * 1.5) return;
        movers.forEach((el) => {
            el.style.setProperty('--shift', (y * parseFloat(el.dataset.speed)).toFixed(1) + 'px');
        });
    });
}
