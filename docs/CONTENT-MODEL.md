# Modèle de contenu

## Solution (`assets/data/solutions.json`)
Champs :
- `id`, `slug`, `status`, `categoryId`
- `name` et `shortDescription` par langue
- `problem`, `description`, `features`
- `technologies`, `requirements`
- `license` : nom, URL, obligations et vérification
- `version`, `demoUrl`, `screenshots`
- `price` : valeur ou null, devise, modèle
- `deliveryDays` : valeur ou null
- `options`
- `featured`, `updatedAt`

Valeurs de `status` :
- `draft`
- `exemple`
- `published`
- `archived`

Une solution `exemple` doit afficher un avertissement « Exemple — non commercialisé » et ne doit pas présenter de bouton d'achat. Le fichier ne contient aujourd'hui qu'une fiche d'exemple.

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
- à ajouter : description multilingue, icône

## Questionnaire (`assets/data/questionnaire.json`)
Sept questions. Chacune a un `id`, un `type` (`single` ou `multiple`), un `weight` et des `options` identifiées par un code. Les libellés affichés seront dans les fichiers de traduction, pas dans ce fichier.

## Licence
Avant toute vente ou redistribution, vérifier la licence exacte du dépôt et de ses dépendances. Un dépôt public n'autorise pas automatiquement la revente, le rebranding ou l'hébergement en SaaS.
