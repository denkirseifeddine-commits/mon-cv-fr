# Instructions pour les agents de développement

## Règles non négociables
- Auditer le dépôt avant toute modification (`docs/AUDIT.md` décrit l'état de départ).
- Préserver les contenus, coordonnées, références, CV, animations et ressources existants.
- Ne pas réécrire le site en Next.js ou Laravel dans la première phase.
- Ne pas introduire de dépendance npm sans justification.
- Ne pas ajouter de données inventées : prix, témoignages, résultats clients, certifications ou fonctionnalités.
- Toute solution fictive doit porter `status: "exemple"` et être visiblement signalée comme non commercialisée.
- Ne jamais exposer de secrets, tokens ou clés API dans le frontend.
- Garder les chemins relatifs : le site est servi à la racine sur Vercel et sous `/mon-cv-fr/` sur GitHub Pages. Seule exception : `404.html`, qui est autonome.
- Ne pas activer `cleanUrls` ni `trailingSlash` dans `vercel.json` : `cv.html` deviendrait `/cv/` et ses chemins relatifs casseraient. Les nouvelles pages vivent dans des dossiers (`solutions/index.html`).
- Respecter l'accessibilité clavier, les contrastes, `prefers-reduced-motion` et les langues RTL.
- `cv.html` et `mon-cv-fr.css` gardent leur style autonome : n'y toucher que sur demande explicite.

## Workflow
1. Lire `README.md` et les documents dans `docs/`.
2. Inspecter les fichiers actuels et l'historique Git.
3. Proposer les changements avant les modifications structurantes.
4. Travailler par petits lots cohérents, une pull request par lot.
5. Lancer `python3 scripts/check-site.py` et vérifier le rendu (ordinateur et mobile) avant chaque commit.
6. Résumer les fichiers créés/modifiés et les tests réalisés.
7. Ne jamais déclarer un test réussi sans l'avoir exécuté.

## Architecture première version
HTML + CSS + JavaScript natifs, données JSON locales, Vercel pour l'hébergement.
Les services frontend encapsulent l'accès aux données afin de pouvoir les remplacer ensuite par des appels API Laravel (`docs/API-CONTRACT.md`).

## Langues
- `fr` : français, langue par défaut de transition.
- `en` : anglais.
- `ar` : arabe, direction RTL.
- Ne pas mélanger le contenu traduit avec les composants de présentation.
- Utiliser `lang` et `dir` correctement.
- Prévoir un sélecteur de langue accessible et persistant sans dépendance à un compte utilisateur.
