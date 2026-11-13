import { prefersReducedMotion } from '../utils/reduced-motion.js';

// Apparition au défilement des éléments [data-reveal], avec un décalage
// progressif (--i) pour les éléments d'un même groupe [data-stagger].
export function initReveal(scope = document) {
    scope.querySelectorAll('[data-stagger]').forEach((group) => {
        group.querySelectorAll('[data-reveal]').forEach((el, i) => {
            el.style.setProperty('--i', i);
        });
    });

    const reveals = scope.querySelectorAll('[data-reveal]');
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        reveals.forEach((el) => el.classList.add('is-in'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach((el) => io.observe(el));
}
