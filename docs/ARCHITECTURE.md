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

À créer dans les lots suivants :
- `assets/js/services/` : catalogue, préférences
- `assets/js/engine/` : moteur de recommandation
- `assets/js/components/` : sélecteur de langue
- `assets/i18n/` : traductions

## Pages et adresses
Chaque nouvelle page vit dans un dossier (`solutions/index.html`) et se lie aux autres par des chemins relatifs (`../assets/...`). L'adresse est alors la même sur Vercel et sur GitHub Pages, sans réglage.

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
- `catalogService.getSolutions(filters)`
- `catalogService.getSolutionBySlug(slug, locale)`
- `catalogService.getProjects()`
- `quoteService.submitQuote(payload)` (en place : prépare un e-mail dans la messagerie du visiteur ; appellera `POST /api/v1/quotes`)
- `recommendationEngine.recommend(answers, solutions)`

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
- `sitemap.xml` ne liste que des URL qui existent.
- Données structurées et `og:image` à ajouter quand le contenu réel existe.

## Backend futur
Laravel : API REST versionnée `/api/v1`.
PostgreSQL : données métier.
Redis : cache, files de tâches et limitation de débit si nécessaire.
Filament : gestion du catalogue, projets, prospects et demandes.
Ne pas installer ces composants dans la première phase.
