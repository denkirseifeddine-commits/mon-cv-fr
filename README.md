# Digital Solution Studio — Seif Eddine Denkir

Site statique : portfolio professionnel en cours d'évolution vers un studio de solutions digitales (projets sur mesure, solutions prêtes à installer, automatisations).

- Adresse principale : https://mon-cv-fr.vercel.app/
- Miroir GitHub Pages : https://denkirseifeddine-commits.github.io/mon-cv-fr/

## Décisions retenues

- Hébergement principal : Vercel. La compatibilité GitHub Pages est conservée pendant la transition.
- Frontend : HTML, CSS et JavaScript natifs, sans étape de build ni dépendance npm.
- Langues visées : français (par défaut), anglais, arabe (RTL). Seul le français existe aujourd'hui.
- Direction artistique : évolution progressive de l'identité actuelle (crème, encre, terracotta).
- Backend futur : Laravel + PostgreSQL + Redis + Filament (non installé).

## Structure

```
index.html              accueil du studio
portfolio/              portfolio complet
services/               prestations
automatisations/        cas d'usage et déroulement
contact/                coordonnées et demande de devis
solutions/              catalogue et fiches (non indexés tant qu'aucune solution n'est publiée)
trouver-ma-solution/    questionnaire « Trouver ma solution » et résultats (indexable)
cv.html, mon-cv-fr.css  CV (style autonome, conservé tel quel)
404.html                page d'erreur autonome
assets/css/             tokens (variables), base, composants, formulaires, catalogue, pages
assets/js/              modules partagés : navigation, en-tête, pied de page, animations, services
assets/portfolio.css    styles propres à la page Portfolio
assets/portfolio.js     script de la page Portfolio
assets/projets/         captures d'écran des projets
design-system/          page de démonstration des composants (non indexée)
assets/data/            données JSON (projets, catégories, solutions, questionnaire)
docs/                   audit, architecture, design system, plan
scripts/check-site.py   vérification des liens internes et des JSON
scripts/test-catalog.mjs tests unitaires du service du catalogue
scripts/test-recommendation.mjs tests unitaires du moteur de recommandation
site.config.json        nom du site, adresse canonique, langues, contact
vercel.json             en-têtes de cache
```

## Travailler sur le site

1. Lire `AGENTS.md` et `docs/`.
2. Servir le dossier en local, par exemple `python3 -m http.server`, puis ouvrir `http://localhost:8000/`. Les scripts sont des modules ES : ils ne se chargent pas en ouvrant `index.html` directement. Aucun build n'est nécessaire.
3. Avant chaque commit : `python3 scripts/check-site.py` (liens internes, chemins relatifs, imports JavaScript, références CSS, JSON), puis `node scripts/test-catalog.mjs` (tests unitaires du service du catalogue, sans dépendance) et `node scripts/test-recommendation.mjs` (tests unitaires du moteur de recommandation du questionnaire, sans dépendance).

Tous les chemins internes sont relatifs : le site est servi à la racine sur Vercel et sous `/mon-cv-fr/` sur GitHub Pages.

## Déploiement

Vercel sert directement les fichiers du dépôt (preset « Other », pas de commande de build, dossier de sortie `.`). Ces réglages sont à confirmer dans le tableau de bord Vercel : ils ne sont pas visibles depuis le dépôt.
