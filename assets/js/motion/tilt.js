import { prefersReducedMotion } from '../utils/reduced-motion.js';

// Inclinaison 3D des maquettes [data-tilt] au survol (souris uniquement)
export function initTilt(scope = document) {
    if (prefersReducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    scope.querySelectorAll('[data-tilt]').forEach((mock) => {
        mock.addEventListener('pointermove', (e) => {
            const r = mock.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            mock.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
            mock.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
            mock.style.setProperty('--px', (x * -14).toFixed(1) + 'px');
            mock.style.setProperty('--py', (y * -10).toFixed(1) + 'px');
        });
        mock.addEventListener('pointerleave', () => {
            ['--rx', '--ry', '--px', '--py'].forEach((p) => mock.style.removeProperty(p));
        });
    });
}
