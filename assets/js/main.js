/*
 * Point d'entrée commun à toutes les pages : en-tête et pied de page
 * partagés, animation d'entrée, apparitions au défilement et barre de
 * progression. Chaque page charge ce module (directement ou via son
 * propre script) avec <script type="module">.
 */
import { mountHeader } from './components/site-header.js';
import { mountFooter } from './components/site-footer.js';
import { initIntro } from './motion/intro.js';
import { initReveal } from './motion/reveal.js';
import { initProgress } from './motion/scroll.js';

mountHeader();
mountFooter();
initIntro();
initReveal();
initProgress();
