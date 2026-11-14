# Contrat API futur — Laravel

Ce document décrit une cible future. Ces routes ne sont pas encore disponibles et ne doivent pas être appelées par le frontend avant implémentation.
Seule exception, en place depuis le lot 7 : le point d'entrée provisoire `POST /api/quote` (fonction serveur Vercel), décrit à la fin de ce document.

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

## Point d'entrée provisoire Vercel : POST /api/quote

En place depuis le lot 7, en attendant `POST /api/v1/quotes` (Laravel). Fonction serveur Vercel sans dépendance npm :
- `api/quote.mjs` : gestionnaire au format Web (`export async function POST(request)`, `OPTIONS`, et 405 pour `GET`, `PUT`, `DELETE`, `PATCH`) ; lit les variables d'environnement et envoie l'e-mail par l'API HTTP de Resend (`fetch`). `createHandler({ env, fetchImpl, now, random, rateLimiter })` construit un gestionnaire testable (faux `fetch`, horloge simulée).
- `api/_lib/quote-core.mjs` : logique pure (validation, origine, pot de miel, délai, limitation de débit, référence, e-mail texte et HTML échappé, en-têtes CORS). Les fichiers dont le nom commence par `_` ne sont pas des routes.

La demande est validée puis envoyée par e-mail au propriétaire. **Rien n'est stocké** côté serveur (ni base de données, ni journal contenant des données personnelles : les journaux ne contiennent qu'un code d'erreur).

### Requête
`POST /api/quote`, en-têtes `Origin` (obligatoire, envoyé par le navigateur) et `Content-Type: application/json`, corps de 20 Ko au plus (20 × 1 024 octets) :

```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "phone": "+216 21 000 000",
  "need": "website",
  "deadline": "1-month",
  "budget": "1 000 à 2 500 €",
  "message": "Bonjour, je voudrais…",
  "consent": true,
  "locale": "fr",
  "solution": "site-vitrine",
  "website": "",
  "elapsedMs": 8421
}
```

| Champ | Règle |
| --- | --- |
| `name` | obligatoire, 2 à 100 caractères (après suppression des espaces aux extrémités) |
| `email` | obligatoire, format d'adresse valide, 254 caractères au plus ; sert d'adresse de réponse (`reply_to`) |
| `phone` | facultatif, 40 caractères au plus, chiffres, espaces et `+ ( ) . -` |
| `need` | obligatoire : `website`, `ecommerce`, `automation`, `crm`, `application`, `ai`, `unsure` |
| `deadline` | facultatif : `urgent`, `1-2-weeks`, `1-month`, `flexible` |
| `budget` | facultatif, 100 caractères au plus (texte libre) |
| `message` | obligatoire, 10 à 5 000 caractères ; seul champ où les retours à la ligne sont permis |
| `consent` | obligatoire, booléen `true` |
| `locale` | facultatif : `fr` (défaut), `en`, `ar` ; indiqué dans l'e-mail |
| `solution` | facultatif, slug `[a-z0-9-]`, 80 caractères au plus |
| `website` | pot de miel : doit rester vide |
| `elapsedMs` | temps passé sur le formulaire (ms), mesuré par le navigateur |

Les codes autorisés (`need`, `deadline`) sont écrits dans `quote-core.mjs` (copie de `assets/data/questionnaire.json`, à tenir à jour). Les retours à la ligne et caractères de contrôle sont refusés dans tous les champs courts (protection contre l'injection d'en-têtes). Les champs inconnus sont ignorés.

### Réponses
Toutes les réponses sont en JSON avec `Cache-Control: no-store` (la réponse 204 à `OPTIONS` n'a pas de corps). Ordre des contrôles : origine, type de contenu, taille, lecture du JSON, limitation de débit, pot de miel et délai, validation, configuration, envoi.

| Statut | Corps | Cas |
| --- | --- | --- |
| 200 | `{ "ok": true, "reference": "DSS-20261114-K7QZ" }` | demande envoyée ; la référence (`DSS-AAAAMMJJ-XXXX`, date UTC, 4 caractères A-Z et 2-9) figure aussi dans l'objet et le corps de l'e-mail |
| 200 | `{ "ok": true }` | pot de miel rempli, ou `elapsedMs` absent, non numérique ou inférieur à 3 000 : rien n'est envoyé (la détection n'est pas révélée) |
| 204 | — | `OPTIONS` d'une origine autorisée |
| 403 | `{ "error": "forbidden-origin" }` | `Origin` absent ou hors de `ALLOWED_ORIGINS` |
| 405 | `{ "error": "method-not-allowed" }` | autre méthode que `POST` et `OPTIONS` (en-tête `Allow: POST, OPTIONS`) |
| 413 | `{ "error": "payload-too-large" }` | corps de plus de 20 Ko |
| 415 | `{ "error": "unsupported-media-type" }` | `Content-Type` autre que `application/json` |
| 422 | `{ "error": "invalid", "fields": ["email", "message"] }` | champs refusés, dans l'ordre du formulaire ; JSON illisible : `fields` vide |
| 429 | `{ "error": "rate-limited" }` | plus de 5 demandes en 10 minutes pour la même IP (en-tête `Retry-After`) |
| 502 | `{ "error": "send-failed" }` | Resend répond autre chose que 2xx, ou erreur réseau |
| 503 | `{ "error": "not-configured" }` | `RESEND_API_KEY` ou `QUOTE_TO_EMAIL` absente |

CORS : `Access-Control-Allow-Origin` (l'origine reçue), `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`, `Vary: Origin`, uniquement pour une origine autorisée.

Limitation de débit : au mieux, en mémoire de l'instance de la fonction (IP lue dans `x-forwarded-for`, sinon `x-real-ip` ; pas de limitation si aucune IP n'est connue). Elle n'est ni globale ni durable : plusieurs instances ont chacune leur compteur, remis à zéro à leur arrêt. Une limitation globale viendra avec Laravel et Redis.

### E-mail envoyé
`POST https://api.resend.com/emails` avec `Authorization: Bearer RESEND_API_KEY` et `{ from, to: [QUOTE_TO_EMAIL], reply_to: <e-mail du visiteur>, subject, text, html }`. L'e-mail est en français, destiné au propriétaire uniquement (pas d'accusé de réception au visiteur) ; il indique la langue du visiteur. Objet : `Demande de devis — <libellé du besoin> — <nom> [<référence>]`. Le corps existe en texte brut et en HTML ; toute valeur du visiteur est échappée dans le HTML.

### Variables d'environnement (Vercel, jamais dans le dépôt)
| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `RESEND_API_KEY` | oui | clé de l'API Resend |
| `QUOTE_TO_EMAIL` | oui | adresse qui reçoit les demandes |
| `QUOTE_FROM_EMAIL` | non | expéditeur ; défaut `Digital Solution Studio <onboarding@resend.dev>` (sans domaine vérifié, Resend n'écrit qu'à l'adresse du compte) |
| `ALLOWED_ORIGINS` | non | origines autorisées, séparées par des virgules ; défaut `https://mon-cv-fr.vercel.app` |

### Côté navigateur
`submitQuote()` (`assets/js/services/quote-service.js`) n'appelle pas ce point d'entrée sur GitHub Pages (`*.github.io`) ni en `file:` : il prépare l'e-mail dans la messagerie du visiteur. Ailleurs, il envoie la demande (délai maximal 15 s) : 200 → demande reçue ; 422 → erreurs rattachées aux champs ; 429 → message « trop de demandes » ; toute autre réponse (503, 502, 404, 405, 403…), erreur réseau ou délai dépassé → repli sur l'e-mail pré-rempli, précédé de « L'envoi direct n'est pas disponible pour le moment. ».

Lors du passage à Laravel, `POST /api/v1/quotes` reprendra ce format et ajoutera l'enregistrement de la demande, une limitation de débit globale (Redis) et la journalisation.
