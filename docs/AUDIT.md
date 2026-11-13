# Audit du dépôt — état de départ

Relevé effectué sur la branche `main` avant le lot « Fondation ».

## Fichiers
| Fichier | Lignes | Rôle |
|---|---|---|
| `index.html` | 276 | Page unique : hero, `#projets`, `#expertise`, `#parcours`, `#contact` |
| `assets/portfolio.css` | 462 | Variables, styles par section, animations, responsive |
| `assets/portfolio.js` | 80 | Apparition au défilement, parallaxe, barre de progression, inclinaison des maquettes |
| `cv.html` | 122 | CV, style autonome |
| `mon-cv-fr.css` | 205 | Styles du CV uniquement |

Aucun `package.json`, `vercel.json`, README ni intégration continue. Seule ressource externe : Google Fonts (Anton, Cormorant Garamond, Montserrat ; Inter pour le CV).

## Contenu réel à préserver
- Coordonnées : e-mail, téléphone, Tunis.
- 8 projets : ATTDS, Meuble Chabbouc, Rybsen, Boutiques Sylius, Audit SEO, ESVS Library, Musée de l'Île d'Oléron, OrbitAI et TSI.
- Compétences, parcours (Kwantic, indépendant, CODE EPIC), formation.

## Points ouverts
Cette liste décrit l'état de départ. Voir `IMPLEMENTATION-PLAN.md` pour ce qui a été traité depuis.

- Les maquettes d'ATTDS et de Meuble Chabbouc affichent « Capture d'écran à venir » : captures, rôle et résumé à fournir.
- Le lien LinkedIn de `cv.html` pointe vers `#`.
- Contact limité à `mailto:` : pas de formulaire de devis.
- Pas d'image de partage (`og:image`).
- Site en français uniquement.

## Non vérifié
La comparaison avec les sites déployés (Vercel et GitHub Pages) n'a pas pu être faite depuis l'environnement de développement : ces domaines n'y étaient pas accessibles. Les réglages du projet Vercel ne sont pas visibles dans le dépôt.
