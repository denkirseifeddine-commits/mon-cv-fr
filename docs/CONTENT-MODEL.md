# Modèle de contenu

## Solution (`assets/data/solutions.json`)
Tableau d'objets. Tous les textes sont en français, dans un objet `{ "fr": "..." }` (les autres langues viendront avec les traductions).

Schéma (commenté pour la lecture : le fichier, lui, est du JSON sans commentaires) :

```
{
  "id": "exemple-site-vitrine",          // = slug, préfixé « exemple- » pour toute fiche d'exemple
  "slug": "exemple-site-vitrine",
  "status": "exemple",                   // draft | exemple | published | archived
  "categoryId": "websites",              // id d'assets/data/categories.json
  "featured": false,
  "updatedAt": "2026-11-13",
  "name": { "fr": "Site vitrine" },
  "shortDescription": { "fr": "une phrase" },
  "problem": { "fr": "le besoin auquel la solution répond, une ou deux phrases" },
  "description": { "fr": "deux ou trois phrases" },
  "features": [ { "fr": "..." } ],        // 4 à 6
  "technologies": [ "WordPress" ],        // noms d'outils, sans version
  "requirements": [ { "fr": "..." } ],    // prérequis côté client, 1 à 3
  "deliverables": [ { "fr": "..." } ],    // ce qui est livré, 2 à 4
  "options": [ { "name": { "fr": "..." }, "description": { "fr": "..." } } ],  // 0 à 3
  "deliveryDays": null,                   // toujours null pour un exemple
  "price": { "amount": null, "currency": null, "model": "quote" },   // toujours ainsi pour un exemple
  "demoUrl": null,
  "screenshots": [],                      // [{ "src": "assets/solutions/x.jpg", "alt": { "fr": "..." } }]
  "license": { "name": null, "url": null, "verified": false },
  "match": {                              // utilisé par le moteur de recommandation (lot 5)
    "needs": ["website"],                 // codes de la question « need » d'assets/data/questionnaire.json
    "goals": ["showcase", "leads"],       // codes de la question « goal »
    "industries": [],                     // codes de « industry » ; tableau vide = tous secteurs
    "complexity": ["simple"],             // codes de « complexity »
    "customization": ["ready", "some-changes"]   // codes de « customization »
  },
  "notice": { "fr": "Exemple, non commercialisé" }
}
```

Valeurs de `status` :
- `draft` : brouillon. Jamais affiché dans le catalogue.
- `exemple` : fiche d'exemple, non commercialisée. Affichée avec la mention « Exemple, non commercialisé ».
- `published` : solution disponible. Le prix n'est affiché que s'il a un montant et une devise, le délai qu'en jours ; sinon « Sur devis » et « À définir ».
- `archived` : retirée. Jamais affichée.

Règles d'une fiche `exemple` :
- `id` et `slug` identiques, préfixés `exemple-`.
- `price.amount`, `price.currency` et `deliveryDays` à `null` ; `price.model` à `"quote"`.
- `demoUrl` à `null`, `screenshots` vide, `license.name` et `license.url` à `null`, `license.verified` à `false`.
- `notice` : « Exemple, non commercialisé ».
- Pas de bouton d'achat : l'action est toujours « Demander un devis ».

Bloc `match` : il ne change pas l'affichage. Le moteur de recommandation (lot 5) s'en servira pour rapprocher une solution des réponses au questionnaire. Chaque liste renvoie aux codes d'une question de `questionnaire.json` : `needs` (question `need`), `goals` (`goal`), `industries` (`industry` ; tableau vide = tous les secteurs), `complexity` (`complexity`), `customization` (`customization`).

Le fichier contient 8 fiches d'exemple, une par catégorie.

## Projet portfolio (`assets/data/projects.json`)
Les 8 projets existants y sont recopiés tels quels depuis `index.html`.

Champs actuels :
- `id`, `slug`, `order`, `featured`
- `name`
- `category` et `summary` par langue (`fr` seulement pour l'instant)
- `client`, `period`
- `technologies` : uniquement celles nommées dans le résumé
- `media` : captures ordinateur et mobile, `null` tant qu'elles n'existent pas
- `url` : adresse publique si disponible
- `missing` : informations à fournir par le propriétaire du site

Enrichissement progressif en études de cas : contexte, défi, intervention, résultats (uniquement s'ils sont vérifiables).

Tant que `index.html` écrit les projets en dur, toute modification d'un projet doit être reportée aux deux endroits. Le lot « pages » fera lire la page depuis ce fichier.

## Catégorie (`assets/data/categories.json`)
- `id`, `slug`
- `order`
- `label` multilingue
- `status`
- `description` multilingue : une phrase, affichée dans le catalogue quand la catégorie est choisie
- à ajouter : icône

## Questionnaire (`assets/data/questionnaire.json`)
Sept questions. Chacune a un `id`, un `type` (`single` ou `multiple`), un `weight` et des `options` identifiées par un code. Les libellés affichés seront dans les fichiers de traduction, pas dans ce fichier.

## Licence
Avant toute vente ou redistribution, vérifier la licence exacte du dépôt et de ses dépendances. Un dépôt public n'autorise pas automatiquement la revente, le rebranding ou l'hébergement en SaaS.
