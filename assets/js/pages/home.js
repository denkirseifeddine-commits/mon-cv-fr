/*
 * Script de la page d'accueil (index.html), module ES. Le socle commun
 * (en-tête, pied de page, entrée, apparitions, progression) vient de
 * ../main.js ; on ajoute ici ce qui est propre à l'accueil.
 */
import '../main.js';
import { initParallax } from '../motion/scroll.js';
import { initTilt } from '../motion/tilt.js';

// Parallaxe du hero ([data-speed]) et inclinaison des maquettes ([data-tilt])
initParallax();
initTilt();
