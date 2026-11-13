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
- Carte solution
- Résultat de recommandation
- État vide (aucune solution adaptée)

Propres à l'accueil (`assets/portfolio.css`) :
- Carte projet avec maquette navigateur + téléphone (`.feat`, `.mock`)
- Ligne de projet numérotée (`.row`)
- Point d'expertise avec pictogramme rond (`.points`)
- Bandeau défilant (`.marquee`)

## Composants à créer
- FAQ
- Sélecteur de langue

## Multilingue
- Français, anglais et arabe.
- L'arabe utilise `dir="rtl"` et une vérification visuelle dédiée.
- Ne pas simplement inverser tout le layout : vérifier icônes, alignements, espacements et composants. Préférer les propriétés logiques (`margin-inline`, `padding-inline`, `inset-inline`).
- Anton et Cormorant Garamond ne couvrent pas l'arabe : une police arabe est à choisir pour cette langue.
- Les contenus doivent être séparés des templates.
- Prévoir les textes plus longs en français et en arabe.

## Mouvement et accessibilité
- Respecter `prefers-reduced-motion` (déjà en place).
- Les animations ne doivent pas masquer le contenu : sans JavaScript, tout reste visible (déjà en place).
- Focus clavier visible.
- Labels explicites.
- Contrastes WCAG AA visés.
