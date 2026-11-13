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

## Composants existants (dans `assets/portfolio.css`)
- En-tête collant avec navigation et lien fléché
- Bouton plein (`.btn-solid`) et lien fléché (`.link-arrow`)
- Titre de section sur deux lignes, la seconde en terracotta
- Carte projet avec maquette navigateur + téléphone (`.feat`, `.mock`)
- Ligne de projet numérotée (`.row`)
- Carte bordée (`.card`)
- Point d'expertise avec pictogramme rond (`.points`)
- Bandeau défilant (`.marquee`)

## Composants à créer
- Pied de page complet
- Carte solution et badge de statut (« Exemple, non commercialisé »)
- Filtres et recherche du catalogue
- Champs de formulaire
- Progression du questionnaire et résultat de recommandation
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
