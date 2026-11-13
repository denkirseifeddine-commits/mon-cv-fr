/*
 * Script de la page d'accueil (module ES). Le socle commun (en-tête,
 * pied de page, entrée, apparitions, progression) vient de js/main.js ;
 * on ajoute ici ce qui est propre à l'accueil.
 */
import './js/main.js';
import { initParallax } from './js/motion/scroll.js';
import { initTilt } from './js/motion/tilt.js';

// Parallaxe du hero ([data-speed]) et inclinaison des maquettes ([data-tilt])
initParallax();
initTilt();
