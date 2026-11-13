# Contrat API futur — Laravel

Ce document décrit une cible future. Ces routes ne sont pas encore disponibles et ne doivent pas être appelées par le frontend avant implémentation.

Base : `/api/v1`

## Solutions
`GET /solutions`
- Query : `locale`, `category`, `search`, `featured`, `page`
- Réponse : liste paginée de solutions publiées.

`GET /solutions/{slug}`
- Réponse : détail public d'une solution publiée.

## Catégories
`GET /solution-categories`
- Réponse : catégories publiées et ordre d'affichage.

## Projets
`GET /portfolio-projects`
`GET /portfolio-projects/{slug}`

## Recommandations
`POST /recommendations`
- Body : réponses du questionnaire.
- Réponse : jusqu'à trois solutions, explication des correspondances et indication éventuelle d'un besoin sur mesure.
- Le serveur recalcule le score ; ne jamais faire confiance à un score envoyé par le navigateur.

## Devis
`POST /quotes`
- Body : coordonnées, besoin, budget, délai, réponses et consentement.
- Protection : validation serveur, rate limiting, honeypot ou CAPTCHA, journalisation.
- Réponse : référence de demande uniquement après enregistrement effectif.

## Principes
- Validation côté serveur.
- Limitation de débit.
- CORS limité aux domaines autorisés.
- Aucun secret dans le frontend.
- Protection anti-spam.
- Politique de conservation des données et consentement adaptés.
- Versionner les changements incompatibles.
