/*
 * Point d'entrée commun à toutes les pages : en-tête et pied de page
 * partagés (dans la langue de la page, voir i18n/), mot géant d'un bloc
 * (arabe), animation d'entrée, apparitions au défilement et barre de
 * progression. Chaque page charge ce module (directement ou via son
 * propre script) avec <script type="module">.
 */
import { mountHeader } from './components/site-header.js';
import { mountFooter } from './components/site-footer.js';
import { initGiant } from './motion/giant.js';
import { initIntro } from './motion/intro.js';
import { initReveal } from './motion/reveal.js';
import { initProgress } from './motion/scroll.js';

mountHeader();
mountFooter();
initGiant();
initIntro();
initReveal();
initProgress();
