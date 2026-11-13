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
index.html              accueil / portfolio
cv.html, mon-cv-fr.css  CV (style autonome, conservé tel quel)
404.html                page d'erreur autonome
assets/css/tokens.css   variables de design (source unique)
assets/portfolio.css    styles du portfolio
assets/portfolio.js     animations du portfolio
assets/data/            données JSON (projets, catégories, solutions, questionnaire)
docs/                   audit, architecture, design system, plan
scripts/check-site.py   vérification des liens internes et des JSON
site.config.json        nom du site, adresse canonique, langues, contact
vercel.json             en-têtes de cache
```

## Travailler sur le site

1. Lire `AGENTS.md` et `docs/`.
2. Ouvrir `index.html` dans un navigateur : aucun serveur ni build n'est nécessaire pour les pages actuelles.
3. Avant chaque commit : `python3 scripts/check-site.py` (liens internes, chemins relatifs, JSON).

Tous les chemins internes sont relatifs : le site est servi à la racine sur Vercel et sous `/mon-cv-fr/` sur GitHub Pages.

## Déploiement

Vercel sert directement les fichiers du dépôt (preset « Other », pas de commande de build, dossier de sortie `.`). Ces réglages sont à confirmer dans le tableau de bord Vercel : ils ne sont pas visibles depuis le dépôt.
