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
Existant (conservé) :
- `index.html`, `assets/portfolio.css`, `assets/portfolio.js` : accueil et portfolio
- `cv.html`, `mon-cv-fr.css` : CV autonome

En place depuis le lot « Fondation » :
- `assets/css/tokens.css` : variables de design
- `assets/data/` : `projects.json`, `categories.json`, `solutions.json`, `questionnaire.json`
- `scripts/check-site.py` : vérification des liens et des JSON
- `404.html`, `favicon.svg`, `robots.txt`, `sitemap.xml`, `vercel.json`, `site.config.json`

À créer dans les lots suivants :
- `assets/css/` : `base.css`, `components.css`, styles de pages
- `assets/js/components/` : en-tête, pied de page, sélecteur de langue
- `assets/js/services/` : catalogue, devis, préférences
- `assets/js/engine/` : moteur de recommandation
- `assets/i18n/` : traductions

## Pages et adresses
Chaque nouvelle page vit dans un dossier (`solutions/index.html`) et se lie aux autres par des chemins relatifs (`../assets/...`). L'adresse est alors la même sur Vercel et sur GitHub Pages, sans réglage.

`vercel.json` n'active ni `cleanUrls` ni `trailingSlash` : avec ces options, `cv.html` serait servi sous `/cv/` et ses liens relatifs (`mon-cv-fr.css`, `index.html`) ne fonctionneraient plus.

Chaque page déclare sa profondeur avec `<html data-root="../">` (vide à la racine) pour que les composants partagés construisent leurs liens.

## En-tête et pied de page communs
Proposition pour le lot suivant : un module par composant dans `assets/js/components/`, qui génère le balisage à partir d'une seule liste de liens. Chaque page garde dans son HTML un lien de secours vers l'accueil, pour rester utilisable sans JavaScript.

## Contrat des services
Les pages ne chargent pas les JSON directement. Elles appellent des fonctions dédiées :
- `catalogService.getSolutions(filters)`
- `catalogService.getSolutionBySlug(slug, locale)`
- `catalogService.getProjects()`
- `quoteService.submitQuote(payload)`
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
