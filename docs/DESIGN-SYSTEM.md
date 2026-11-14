# Design system — évolution progressive

## Direction
Faire évoluer l'identité existante sans rupture : conserver les éléments distinctifs, la typographie et les animations qui fonctionnent, puis améliorer la cohérence, la lisibilité et la conversion.

## Principes
- Premium, éditorial, sobre et crédible.
- Hiérarchie typographique nette.
- Contrastes accessibles.
- Espaces généreux et grilles cohérentes.
- Animations discrètes et non essentielles à la compréhension.
- Mobile-first.
- Aucun effet décoratif au détriment de la performance.

## Tokens relevés dans le site actuel
Source unique : `assets/css/tokens.css`.

| Variable | Valeur | Usage |
|---|---|---|
| `--bg` | `#F4EFE6` | Fond de page (crème) |
| `--card` | `#FAF6EE` | Fond des cartes |
| `--ink` | `#171512` | Texte principal, bouton plein |
| `--muted` | `#675F54` | Texte secondaire |
| `--line` | `#D6CCBB` | Filets et bordures |
| `--accent` | `#C5512E` | Terracotta : grands titres, pictogrammes, disque |
| `--accent-deep` | `#A3401F` | Terracotta foncé : petit texte (contraste AA sur crème) |
| `--display` | Anton | Titre géant |
| `--serif` | Cormorant Garamond | Titres, citations, numéros |
| `--sans` | Montserrat | Texte courant, libellés en petites capitales |
| `--gutter` | `clamp(16px, 4vw, 56px)` | Marge latérale |
| `--max` | `1280px` | Largeur maximale du contenu |
| `--ease` | `cubic-bezier(.16, 1, .3, 1)` | Courbe des animations |

Règle de contraste : `--accent` est réservé aux grands textes et aux formes ; pour un texte de petite taille, utiliser `--accent-deep`.

Pages arabes (`ar/`) : sous `:root:lang(ar)`, `--display`, `--serif` et `--sans` pointent vers des polices arabes (voir « Multilingue »). Les valeurs ci-dessus restent celles du français et de l'anglais.

À ajouter quand un composant en a besoin (ne pas les créer par avance) : échelle d'espacements, échelle typographique, états de formulaire (erreur, succès), couleurs des badges de statut.

## Composants
La page `design-system/index.html` les montre tous, dans leurs différents états.

Socle (`assets/css/base.css`) :
- Bouton plein (`.btn-solid`) et lien fléché (`.link-arrow`)
- Titre de section sur deux lignes, la seconde en terracotta
- Conteneur de section (`.section`) et en-tête de section (`.head`)
- Apparition au défilement (`[data-reveal]`)

Partagés (`assets/css/components.css`) :
- En-tête collant : barre horizontale ou menu compact
- Sélecteur de langue FR, EN, ع dans l'en-tête (`.lang-link`, langue courante marquée `aria-current`)
- Pied de page : marque, liens, coordonnées
- Carte bordée (`.card`) et numéro (`.num`)

Formulaires et questionnaire (`assets/css/forms.css`) :
- Champs, liste déroulante, zone de texte, aide, erreur
- Case à cocher
- Cartes de choix (choix unique et choix multiple)
- Progression du questionnaire

Catalogue (`assets/css/catalog.css`) :
- Badge de statut, dont « Exemple, non commercialisé »
- Filtres par catégorie et recherche
- Bandeau d'avertissement du catalogue (`.catalog-notice`) : rappelle que les fiches sont des exemples, avec un lien vers le devis
- Carte solution
- Fiche solution (`.fiche-*`) : en-tête avec badge et mention d'exemple, colonne récapitulatif (prix, délai, démonstration, demande de devis), blocs numérotés (`.fiche-block`), options, captures, état « fiche introuvable » (`.fiche-missing`)
- Résultat de recommandation
- État vide (aucune solution adaptée)

Questionnaire et résultats « Trouver ma solution » (lot 5, `assets/css/catalog.css`, `assets/css/forms.css`) :
- Cartes de choix par étape, à choix unique ou multiple (`.choice`, `.choices-grid`), avec légende, aide et erreur
- Sommaire des étapes (`.finder-steps`) et progression (`.q-progress`)
- Carte de résultat avec pourcentage de correspondance (`.reco-match`, barre `.reco-match-bar`) et bloc « Pourquoi cette solution » (`.reco-why`)
- Carte « Demande sur mesure » (`.finder-custom`) et sa variante mise en avant (`.finder-custom.is-recommended`), utilisée quand le moteur conseille un devis
- Récapitulatif des réponses (`.finder-recap`) et note sous les résultats (`.finder-note`)

Accueil et portfolio (`assets/css/editorial.css`, `assets/css/projects.css`) :
- Hero à mot géant, disque et macaron tournant
- Bandeau défilant (`.marquee`)
- Citation et points d'expertise avec pictogramme rond (`.points`)
- Appel à l'action final
- Carte projet avec maquette navigateur + téléphone (`.feat`, `.mock`)

Pages intérieures (`assets/css/pages.css`) :
- En-tête de page : mot géant, titre, introduction

Propres à une page :
- Accueil (`assets/css/home.css`) : trois offres, méthode en quatre étapes
- Portfolio (`assets/portfolio.css`) : ligne de projet numérotée (`.row`), compétences, parcours

## Composants à créer
- FAQ

## Multilingue
- Français (racine), anglais (`en/`) et arabe (`ar/`). Les pages `cv.html` et `design-system/` restent en français seulement.
- L'arabe utilise `dir="rtl"` ; une vérification visuelle dédiée reste à faire (lot 6, non cochée).
- Ne pas simplement inverser tout le layout : vérifier icônes, alignements, espacements et composants. Préférer les propriétés logiques (`margin-inline`, `padding-inline`, `inset-inline`, `border-inline-start`, `text-align: start`). Les rares règles physiques restantes sont inversées sous `[dir="rtl"]` (par exemple `.side-l` dans `editorial.css`).
- Flèches : sous `[dir="rtl"]`, la flèche `.arrow` (« suivant ») est retournée (`scale: -1 1`) et pointe vers la gauche ; `.arrow-back` (« précédent ») est retournée en français et redressée en arabe, si bien qu'elle pointe toujours vers l'arrière.
- Polices arabes, chargées seulement sur les pages `ar/` (balise Google Fonts placée après celle des polices latines), définies dans `tokens.css` sous `:root:lang(ar)` :
  - `--display` : Noto Kufi Arabic (700 à 900), pour le mot géant ;
  - `--serif` : Amiri (400, 700), pour les titres et citations ;
  - `--sans` : IBM Plex Sans Arabic (400 à 600), pour le texte courant.
  Anton, Cormorant Garamond et Montserrat restent utilisées en français et en anglais, et en repli pour les mots en caractères latins.
- Texte arabe : pas de capitales (`text-transform: none`), pas d'espacement des lettres (`letter-spacing: normal`) ni d'italique (`:lang(ar)` dans `tokens.css`). Les titres arabes ont une hauteur de ligne de 1,4 (`base.css`), pour que les signes au-dessus et au-dessous de la ligne ne se chevauchent pas.
- Mot géant arabe : écrit en un seul bloc, sans une lettre par `<span>` (voir `assets/js/motion/giant.js` dans `ARCHITECTURE.md`).
- Chiffres : occidentaux (0-9) en arabe.
- Les contenus doivent être séparés des templates : les textes d'interface sont dans `assets/js/i18n/messages/`, les données dans `assets/data/` avec `{ fr, en, ar }`.
- Prévoir les textes plus longs en français et en arabe.

## Mouvement et accessibilité
- Respecter `prefers-reduced-motion` (déjà en place).
- Les animations ne doivent pas masquer le contenu : sans JavaScript, tout reste visible (déjà en place).
- Focus clavier visible.
- Labels explicites.
- Contrastes WCAG AA visés.
