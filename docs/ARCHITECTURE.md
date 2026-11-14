# Architecture technique

## Décision
Rester en HTML/CSS/JavaScript natifs dans la première version. Le site actuel est statique, léger (5 fichiers au départ) et déjà déployé. Une migration Next.js immédiate imposerait une réécriture et la perte de GitHub Pages, sans bénéfice pour le catalogue initial.

À reconsidérer en phase backend : si le catalogue vient d'une API et que chaque fiche doit être indexée, choisir entre un rendu serveur (Next.js) et des pages rendues par Laravel.

## Vue logique
Navigateur
→ pages HTML statiques
→ composants JavaScript partagés
→ services frontend
→ données JSON locales

Évolution future :
Navigateur
→ pages statiques ou rendu serveur
→ API Laravel
→ PostgreSQL / Redis
→ Filament pour l'administration.

## Organisation
Pages :
- `index.html` : accueil du studio (`assets/css/home.css`, `assets/js/pages/home.js`)
- `portfolio/` : portfolio complet, l'ancienne page d'accueil (`assets/portfolio.css`, `assets/portfolio.js`)
- `services/`, `automatisations/`, `contact/` : pages intérieures (`assets/css/pages.css`)
- `solutions/` : catalogue des solutions (`assets/js/pages/catalog.js`), en `noindex` tant qu'aucune solution n'est publiée
- `solutions/fiche/?s=<slug>` : fiche d'une solution, remplie en JavaScript (`assets/js/pages/solution.js`), en `noindex`
- `trouver-ma-solution/` : questionnaire « Trouver ma solution » et résultats (`assets/js/pages/finder.js`), indexable et présent dans `sitemap.xml`
- `cv.html`, `mon-cv-fr.css` : CV autonome
- `design-system/` : démonstration des composants (non indexée, hors navigation)
- `404.html` : page d'erreur autonome

En place depuis le lot 1 « Fondation » :
- `assets/css/tokens.css` : variables de design
- `assets/data/` : `projects.json`, `categories.json`, `solutions.json`, `questionnaire.json`
- `scripts/check-site.py` : vérification des liens, des imports JavaScript, des références CSS et des JSON
- `404.html`, `favicon.svg`, `robots.txt`, `sitemap.xml`, `vercel.json`, `site.config.json`

En place depuis le lot 2 « Navigation et design system » :
- `assets/css/base.css` : socle commun (reset, liens, boutons, titres, sections, apparitions)
- `assets/css/components.css` : en-tête, pied de page, carte bordée, numéro
- `assets/css/forms.css`, `assets/css/catalog.css` : formulaires, questionnaire, catalogue
- `assets/portfolio.css` : styles propres à la page Portfolio
- `assets/js/main.js` : point d'entrée commun à toutes les pages
- `assets/js/config/navigation.js` : source unique des liens, des coordonnées et des libellés d'interface
- `assets/js/components/` : `site-header.js`, `site-footer.js`, `icons.js`
- `assets/js/motion/` : `intro.js`, `reveal.js`, `scroll.js`, `tilt.js`
- `assets/js/utils/` : `site-root.js`, `html.js`, `reduced-motion.js`
- `assets/portfolio.js` : script de la page Portfolio, importe `js/main.js`

En place depuis le lot 3 « Positionnement et pages » :
- `assets/css/editorial.css` : éléments partagés par l'accueil et le portfolio (mot géant, disque, bandeau défilant, citation, appel à l'action final)
- `assets/css/projects.css` : maquettes navigateur et téléphone, carte de projet à la une
- `assets/css/home.css` : accueil du studio
- `assets/css/pages.css` : en-tête de page et mise en page des pages intérieures
- `assets/js/pages/` : scripts de page (`home.js`, `contact.js`)
- `assets/js/services/quote-service.js` : préparation d'une demande de devis
- `assets/projets/` : captures d'écran des projets

En place depuis le lot 4 « Catalogue » :
- `assets/js/services/catalog-service.js` : accès aux solutions et aux catégories. Fonctions pures, sans DOM ni réseau : `localized`, `normalizeText`, `isListed` (exclut `draft` et `archived`), `filterSolutions` (catégorie et recherche), `sortSolutions` (publiées d'abord, puis ordre de catégorie, puis nom). Fonctions de chargement : `getCategories`, `getSolutions`, `getSolutionBySlug`, qui lisent `assets/data/` avec `fetch` et gardent le résultat en cache.
- `assets/js/components/solution-view.js` : présentation d'une solution (badge, prix, délai, carte, liens vers la fiche et le devis). Tout texte injecté passe par `escapeHtml`.
- `assets/js/pages/catalog.js` : page du catalogue (filtres, recherche, compteur). L'état est écrit dans l'adresse (`?categorie=<slug>&q=<texte>`) et relu au chargement.
- `assets/js/pages/solution.js` : fiche d'une solution. Slug absent ou inconnu : message et lien vers le catalogue.
- `scripts/test-catalog.mjs` : tests unitaires des fonctions du service, sous Node, sans dépendance.

En place depuis le lot 5 « Questionnaire » :
- `trouver-ma-solution/` : page du questionnaire (sept questions, une par étape) et des résultats. Aucune donnée n'est stockée dans le navigateur (pas de `localStorage`) ni envoyée ; seuls les JSON locaux sont lus.
- `assets/js/engine/recommendation-engine.js` : moteur de recommandation, fonctions pures sans DOM ni réseau :
  - `recommend(answers, solutions, questionnaire, options)` : au plus `options.max` solutions (3 par défaut) dont le pourcentage atteint `options.threshold` (50 par défaut), triées, avec l'avis sur une demande sur mesure (`customQuote`) ;
  - `scoreSolution(answers, solution, questionnaire)` : score, pourcentage, raisons, exclusion par le besoin ;
  - `validateAnswers(answers, questionnaire)` : identifiants des questions obligatoires sans réponse valide.
- `assets/js/services/questionnaire-service.js` : lecture de `assets/data/questionnaire.json` (`getQuestionnaire`, gardé en cache le temps de la visite) et libellés (`findQuestion`, `questionTitle`, `questionHelp`, `optionLabel`, `answerLabel`). Un libellé absent renvoie le code.
- `assets/js/pages/finder.js` : script de la page `trouver-ma-solution/` (étapes, progression, Précédent / Suivant, résultats, liens vers la fiche et le devis).
- `scripts/test-recommendation.mjs` : tests unitaires du moteur, sous Node, sans dépendance. Lancé par l'intégration continue, comme `test-catalog.mjs`.

Paramètres de la page Contact (lot 5, lus dans `assets/js/pages/contact.js`) :
- `contact/?besoin=<need>&delai=<deadline>&budget=<budget>` : le type de besoin et le délai sont choisis dans leur liste, le budget est écrit en toutes lettres (libellé de `questionnaire.json`). La carte « Demande sur mesure » transmet ces trois paramètres.
- Le résultat d'une solution transmet `contact/?solution=<slug>&delai=<deadline>&budget=<budget>`.
- Un code inconnu est ignoré. Un champ déjà rempli n'est jamais remplacé.

En place depuis le lot 6 « Internationalisation » :
- Arborescence : le français est à la racine ; `en/` et `ar/` reprennent les mêmes dossiers et les mêmes noms (`en/services/`, `ar/trouver-ma-solution/`…), chacun avec son `index.html`. Sont traduits : accueil, portfolio, services, automatisations, contact, trouver-ma-solution, solutions et solutions/fiche. `cv.html` et `design-system/` restent en français.
- Chaque page traduite déclare `<html lang="en|ar" dir="ltr|rtl" data-root="…">`. La langue se déduit du dossier ; `data-root` donne la profondeur de la racine (`../` dans `en/`, `../../` dans `en/services/`). Les ressources (CSS, JavaScript, JSON, images) restent dans `assets/` à la racine : aucune copie. Les liens internes vont vers la page de même langue, sauf le CV, toujours `cv.html`.
- Module `assets/js/i18n/index.js` :
  - `LOCALES` : fr, en, ar, avec le sens d'écriture (`dir`), le préfixe d'adresse et l'étiquette BCP 47 utilisée par `Intl` (`ar-TN-u-nu-latn` : chiffres occidentaux en arabe) ;
  - `locale()` et `dir()` : langue de la page (`<html lang>`, repli sur fr) ; `localePrefix()` : `""`, `"en/"` ou `"ar/"` ;
  - `t(clé, paramètres)` : texte du dictionnaire, repli sur le français puis sur la clé ; `{nom}` est remplacé sans interprétation de `$` ;
  - `tn(clé, n, paramètres)` : forme `.one`, `.two`, `.few`, `.many` ou `.other` choisie par `Intl.PluralRules` ;
  - `localized(objet)` : texte `{ fr, en, ar }` dans la langue de la page, repli sur le français ;
  - `alternateUrl(code)` : adresse relative de la page courante dans une autre langue, paramètres d'adresse et ancre conservés.
- Dictionnaires `assets/js/i18n/messages/fr.js`, `en.js` et `ar.js` : objets plats « clé pointée » → texte, mêmes clés dans les trois fichiers. `scripts/test-i18n.mjs` vérifie les clés, les paramètres `{nom}`, la présence des textes en et ar, et la complétude des textes JSON `{ fr, en, ar }`.
- Textes générés en JavaScript : passés par `t()` dans la navigation (`config/navigation.js`), l'en-tête et le pied de page, la fiche et les cartes de solution (`solution-view.js`, `solution.js`), le questionnaire (`finder.js`), la page Contact et l'e-mail de devis (`quote-service.js`). Le compteur du catalogue lit ses deux formes dans le HTML (`data-count-one`, `data-count-many`) ; le singulier est choisi par `Intl.PluralRules` selon la langue (0 et 1 en français, 1 seulement en anglais).
- Données : `localized` de `catalog-service.js` ; `filterSolutions` et `sortSolutions` prennent une langue facultative (langue de la page par défaut) ; les libellés de `questionnaire-service.js` suivent la langue de la page. `getSolutionBySlug` n'a pas encore de paramètre de langue.
- Sélecteur de langue (`components/site-header.js`) : liens FR, EN et ع dans la barre et dans le menu compact. Chaque lien porte `lang`, `hreflang` et un `aria-label` au nom de la langue (Français, English, العربية) ; la langue de la page est marquée `aria-current="true"`. Chaque lien mène à la même page dans l'autre langue (`alternateUrl`), avec les paramètres `?s=`, `?categorie=` et `?q=` conservés. Aucune redirection selon le navigateur et aucun `localStorage` : la langue est portée par l'adresse, donc tous les liens d'une page restent dans sa langue.
- Mot géant (`assets/js/motion/giant.js`, appelé par `main.js`) : en arabe, le mot n'est pas découpé en lettres, l'écriture étant liée. Le module l'enveloppe dans un seul `<span class="giant-whole">`, mesure sa largeur dans la police chargée et écrit `--fit` (avec `--fit-col` ou `--fit-part` selon la page) pour qu'il remplisse la largeur. La mesure est refaite une fois les polices chargées. Les mots découpés en lettres (français, anglais) ne sont pas modifiés.
- RTL (`dir="rtl"`) : propriétés logiques (`margin-inline`, `padding-inline`, `inset-inline`, `border-inline-start`, `text-align: start`). Sous `[dir="rtl"]`, la flèche « suivant » (`.arrow`) est retournée et les rares règles physiques restantes sont inversées (par exemple `.side-l` dans `editorial.css`). Les polices arabes sont définies sous `:root:lang(ar)` dans `tokens.css` et chargées seulement sur les pages `ar/` ; `:lang(ar)` retire capitales, espacement des lettres et italique.
- hreflang, canonical et sitemap : voir « SEO ».

À créer dans les lots suivants :
- `assets/js/services/` : préférences

## Pages et adresses
Chaque nouvelle page vit dans un dossier (`solutions/index.html`) et se lie aux autres par des chemins relatifs (`../assets/...`). L'adresse est alors la même sur Vercel et sur GitHub Pages, sans réglage.

La page Contact accepte `contact/?solution=<slug>` (lot 4) : le message est pré-rempli avec le nom de la solution, et le type de besoin est choisi si la fiche ne correspond qu'à un seul type (`match.needs`). Un champ déjà rempli n'est jamais remplacé. Un slug inconnu ne pré-remplit rien. Lecture dans `assets/js/pages/contact.js`.

Depuis le lot 5, la page Contact accepte aussi `contact/?besoin=<need>&delai=<deadline>&budget=<budget>` (voir « En place depuis le lot 5 »). Le questionnaire `trouver-ma-solution/` y envoie les réponses.

`vercel.json` n'active ni `cleanUrls` ni `trailingSlash` : avec ces options, `cv.html` serait servi sous `/cv/` et ses liens relatifs (`mon-cv-fr.css`, `index.html`) ne fonctionneraient plus.

Chaque page déclare sa profondeur avec `<html data-root="../">` (vide à la racine) pour que les composants partagés construisent leurs liens.

## En-tête et pied de page communs
`site-header.js` et `site-footer.js` génèrent le balisage à partir de `config/navigation.js` (`NAV`, `CTA`, `BRAND`, `CONTACT`, `LABELS`). Pour ajouter une page au menu, il suffit d'ajouter une entrée à `NAV`.

Chaque page fournit :
- `<html data-root="…">` : vide à la racine, `../` dans un dossier ;
- `<header class="top" data-site-header>` avec, en secours statique, le lien de marque et le lien de contact ;
- `<footer class="footer" data-site-footer>` avec, en secours, la ligne © ;
- `<script type="module" src="…/assets/js/main.js">` (ou un script de page qui l'importe).

Sans JavaScript, le contenu de secours reste affiché et tout le contenu de la page est visible.

L'en-tête a deux modes. La barre horizontale s'affiche tant qu'elle tient en largeur. Le mode compact (bouton « Menu » et panneau) s'active toujours sous 820 px, et au-delà dès que la barre ne tient plus : il s'adapte donc seul quand le menu passera à 7 pages ou sera traduit.

## Modules ES et test local
Les scripts sont des modules ES : ils ne se chargent pas en ouvrant un fichier directement (`file://`). Pour tester en local, servir le dossier, par exemple avec `python3 -m http.server`, puis ouvrir `http://localhost:8000/`.

## Contrat des services
Les pages ne chargent pas les JSON directement. Elles appellent des fonctions dédiées :
- `catalogService.getCategories()`, `catalogService.getSolutions(filters)` et `catalogService.getSolutionBySlug(slug)` : en place depuis le lot 4 (`assets/js/services/catalog-service.js`), sous forme de fonctions exportées. Le paramètre `locale` de `getSolutionBySlug` n'est pas encore pris en compte.
- `catalogService.getProjects()`
- `quoteService.submitQuote(payload)` (en place : prépare un e-mail dans la messagerie du visiteur ; appellera `POST /api/v1/quotes`)
- `recommendationEngine.recommend(answers, solutions, questionnaire, options)` : en place depuis le lot 5 (`assets/js/engine/recommendation-engine.js`, fonction pure, côté navigateur). La cible est `POST /api/v1/recommendations` (voir `API-CONTRACT.md`) : le serveur recalculera le score, le navigateur ne lui envoie jamais de score.

Les services masquent la source des données. Plus tard, leur implémentation appellera `/api/v1/...` (voir `API-CONTRACT.md`) sans réécrire les pages.

Les JSON sont lus avec `fetch` : ces pages fonctionnent sur Vercel, GitHub Pages ou un serveur local (`python3 -m http.server`), pas en ouvrant le fichier directement.

## Hébergement Vercel
- Déploiement depuis GitHub.
- Framework preset : Other. Build command : vide. Output directory : `.` (à confirmer dans le tableau de bord).
- Domaine canonique : `https://mon-cv-fr.vercel.app`.
- Cache des fichiers de `assets/` : une heure, car leurs noms ne changent pas entre deux versions.
- Ajouter des redirections uniquement après inventaire des URL existantes.

## Compatibilité GitHub Pages
Le dépôt est servi sous `/mon-cv-fr/` sur GitHub Pages et à la racine sur Vercel. Aucun chemin interne ne commence par `/`. `scripts/check-site.py` le vérifie. Seule exception : `404.html`, autonome, qui adapte son lien d'accueil selon l'hôte.

## SEO
- `index.html` et `cv.html` portent une URL canonique vers le domaine Vercel : le miroir GitHub Pages n'est donc pas vu comme un doublon.
- Pour les solutions publiées, des fichiers HTML statiques individuels, plus robustes pour l'indexation qu'une page remplie par JavaScript.
- `sitemap.xml` ne liste que des URL qui existent. Les pages indexables existent en français, en anglais et en arabe : chaque `<url>` porte ses alternatives `xhtml:link` (fr, en, ar, x-default). `cv.html`, qui n'existe qu'en français, n'en porte pas.
- Chaque page traduite déclare `<link rel="alternate" hreflang>` pour fr, en, ar et x-default (x-default pointe vers la version française), et sa canonical dans sa propre langue. Les déclarations sont réciproques.
- `scripts/check-site.py` vérifie ces règles : `lang` (fr, en ou ar) et `dir` cohérents, langue conforme au dossier, URL hreflang du domaine public existantes, réciprocité, présence et cible du x-default.
- Tant qu'aucune solution n'est publiée, `solutions/` et `solutions/fiche/` sont en `noindex` (dans les trois langues) et absents de `sitemap.xml`.
- Données structurées et `og:image` à ajouter quand le contenu réel existe.

## Backend futur
Laravel : API REST versionnée `/api/v1`.
PostgreSQL : données métier.
Redis : cache, files de tâches et limitation de débit si nécessaire.
Filament : gestion du catalogue, projets, prospects et demandes.
Ne pas installer ces composants dans la première phase.
