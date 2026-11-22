# Backoffice Digital Solution Studio

Laravel 13 + Filament 5 + PostgreSQL + Redis. Premier lot du backend prévu par `docs/ARCHITECTURE.md` :

- modèle de données (catégories, solutions, projets, demandes de devis, administrateurs) ;
- import et export des JSON du site statique (`../assets/data`), le site restant statique pour l'instant ;
- backoffice Filament en français sur `/admin` ;
- API publique `/api/v1` conforme à `docs/API-CONTRACT.md` (hors `POST /recommendations`, prévu plus tard).

Le site statique (racine du dépôt) n'est pas modifié par ce dossier. `.vercelignore` exclut `backend/` : Vercel ne le sert ni ne le construit.

## Prérequis

PHP 8.3 ou plus (extensions `pdo_pgsql`, `pdo_sqlite`, `intl`, `mbstring`, `redis`, `zip`, `gd`), Composer 2, PostgreSQL 16, Redis. Node n'est pas nécessaire : Filament sert ses assets publiés (`public/js/filament`, `public/css/filament`, générés par `composer install` et exclus de Git).

## Installation locale

```bash
cd backend
composer install
cp .env.example .env          # puis renseigner DB_USERNAME / DB_PASSWORD
php artisan key:generate
createdb dss_backoffice       # ou via psql ; rôle et mot de passe à votre choix
php artisan migrate
php artisan site:import       # charge le contenu actuel du site dans la base
ADMIN_PASSWORD='un mot de passe de 12 caractères ou plus' php artisan admin:create
php artisan serve             # http://127.0.0.1:8000/admin
php artisan queue:work        # envoi des e-mails de devis (file Redis)
```

`.env`, `vendor/`, `storage/` (journaux, caches) et les assets Filament publiés sont exclus par `backend/.gitignore`. Aucun secret n'est versionné : `.env.example` ne contient que des valeurs d'exemple.

## Variables d'environnement

Toutes sont documentées dans `.env.example`. Les principales :

| Variable | Rôle |
| --- | --- |
| `APP_KEY`, `APP_URL`, `APP_DEBUG` | application (`APP_DEBUG=false` en production) |
| `DB_*` | PostgreSQL |
| `REDIS_*`, `CACHE_STORE=redis`, `QUEUE_CONNECTION=redis` | cache (dont limitation de débit) et files d'attente |
| `SESSION_DRIVER`, `SESSION_SECURE_COOKIE` | sessions du backoffice (cookie sécurisé en HTTPS) |
| `MAIL_*` | transport e-mail (`log` en développement) |
| `QUOTE_TO_EMAIL` | destinataire des notifications de devis (vide : demande enregistrée, aucun e-mail) |
| `ALLOWED_ORIGINS` | origines autorisées (CORS et contrôle d'origine de `POST /quotes`), séparées par des virgules |
| `TRUSTED_PROXIES` | proxys de confiance pour lire l'IP du visiteur (limitation de débit) ; vide = aucun, `*` = tous |
| `SITE_DATA_PATH` | dossier des JSON du site (défaut `../assets/data`) |
| `ADMIN_EMAIL`, `ADMIN_NAME` | lus par `admin:create` |

## Import et export avec le site statique

```bash
php artisan site:import [--path=../assets/data]
php artisan site:export [--path=../assets/data] [--public-only]
```

- `site:import` lit `categories.json`, `solutions.json` et `projects.json`, et met à jour par `slug` (idempotent, en une transaction : une erreur n'importe rien). L'ordre des solutions est celui du tableau ; `sourceOfTruth` et `note` de `projects.json` sont conservés (table `site_settings`).
- `site:export` réécrit ces trois fichiers depuis la base, au format exact actuel (mêmes clés, même ordre, indentation de 2 espaces, UTF-8 non échappé, saut de ligne final). Un fichier inchangé n'est pas réécrit. Les langues laissées vides dans le backoffice sont omises. `--public-only` exclut les solutions `draft` et `archived`.
- Test principal : `php artisan site:import && php artisan site:export && git -C .. diff --exit-code assets/data` ne produit aucune différence (couvert aussi par `tests/Feature/SiteSyncTest.php`, sur une copie temporaire).
- `questionnaire.json` n'est pas géré (non modélisé) : il reste édité à la main.
- Tant que le site est statique, le flux est : modifier dans `/admin`, lancer `site:export`, relire le diff Git, committer. Après un changement des JSON à la main, relancer `site:import`.

## Administrateur

Aucun mot de passe n'est dans le dépôt ni dans un seeder. Au choix :

- `php artisan make:filament-user` (interactif) ;
- `php artisan admin:create` : e-mail et nom depuis `ADMIN_EMAIL` / `ADMIN_NAME` (ou `--email`, `--name`), mot de passe depuis `ADMIN_PASSWORD` dans l'environnement du shell (à ne pas écrire dans un fichier versionné), sinon saisie masquée. 12 caractères au minimum ; relancer la commande réinitialise le mot de passe.

Tout utilisateur de la table `users` est administrateur du panneau.

## Backoffice (`/admin`)

- **Catégories, Solutions, Portfolio** : création, modification, suppression, tri par glisser-déposer, recherche, filtres (statut, catégorie, à la une). Champs multilingues en onglets Français / English / العربية (français obligatoire, arabe saisi de droite à gauche) ; listes (fonctionnalités, prérequis, livrables, options, captures) en répéteurs.
- **Fiches `exemple`** : le slug doit commencer par `exemple-` ; prix, délai, démo, licence et captures sont forcés à vide (règles de `docs/CONTENT-MODEL.md`).
- **Demandes de devis** : liste, détail, changement de statut (nouvelle, en cours, répondue, archivée) et notes internes. Pas de création manuelle ; les coordonnées du visiteur ne sont pas modifiables.
- L'avatar du compte est généré localement (aucun appel à un service tiers).

## API publique v1

| Route | Rôle |
| --- | --- |
| `GET /api/v1/solutions` | solutions `exemple` et `published` uniquement ; `locale`, `category` (slug), `search`, `featured`, `page` (et `per_page`, 50 au plus) ; réponse paginée `{ data, links, meta }` |
| `GET /api/v1/solutions/{slug}` | détail, 404 `{ "error": "not-found" }` si absent, `draft` ou `archived` |
| `GET /api/v1/solution-categories` | catégories publiques, dans l'ordre d'affichage |
| `GET /api/v1/portfolio-projects`, `GET /api/v1/portfolio-projects/{slug}` | projets du portfolio |
| `POST /api/v1/quotes` | demande de devis |

Les ressources reprennent les clés de `assets/data/*.json`. Sans `locale`, les textes sont les objets `{ fr, en, ar }` ; avec `locale=fr|en|ar`, ils sont aplatis dans cette langue (repli français). Une catégorie est publique si elle est `exemple` ou `published`, ou si elle contient au moins une solution publique (les huit catégories actuelles sont `draft` mais portent les fiches d'exemple) ; jamais si elle est archivée.

### `POST /api/v1/quotes`

Mêmes règles que `api/_lib/quote-core.mjs` (port dans `app/Support/QuoteValidator.php` ; les codes autorisés sont dans `app/Support/QuoteCodes.php`, à tenir à jour avec `questionnaire.json`) :

- contrôles dans l'ordre : origine (403 `forbidden-origin`, l'en-tête `Origin` est obligatoire), `Content-Type: application/json` (415), corps de 20 Ko au plus (413), limitation de débit (429 `rate-limited`, 5 demandes par 10 minutes et par IP, `Retry-After`), JSON lisible (422, `fields` vide), pot de miel `website` ou `elapsedMs` inférieur à 3 000 (200 `{ "ok": true }` sans enregistrement), validation (422 `{ "error": "invalid", "fields": [...] }` dans l'ordre du formulaire) ;
- champs courts : retours à la ligne, caractères de contrôle et U+2028, U+2029, U+0085 refusés ; caractères bidirectionnels U+202A à U+202E et U+2066 à U+2069 retirés ;
- succès : demande enregistrée puis `201 { "ok": true, "reference": "DSS-AAAAMMJJ-XXXX" }`. La notification (`App\Mail\QuoteReceived`, en file d'attente, réponse à l'adresse du visiteur, HTML échappé) part vers `QUOTE_TO_EMAIL`. Un échec de mise en file n'empêche pas l'enregistrement.
- **Aucune adresse IP n'est stockée.** L'IP ne sert qu'à la clé de limitation de débit, dans le cache Redis, pour 10 minutes.
- CORS limité à `ALLOWED_ORIGINS` (pré-vol `OPTIONS` compris).

Derrière un proxy ou un répartiteur de charge, renseigner `TRUSTED_PROXIES`, sinon toutes les demandes partagent l'IP du proxy et la limite de 5 s'applique à tous les visiteurs ensemble.

## Tests

```bash
php artisan test                                   # SQLite en mémoire (CI), via phpunit.xml
DB_CONNECTION=pgsql DB_DATABASE=dss_test php artisan test   # même suite sur PostgreSQL (base dédiée, jetable)
```

La suite couvre : migrations, aller-retour import/export sans différence, API de lecture (filtres, statuts exclus, 404, CORS), `POST /quotes` (201, enregistrement, e-mail en file, chaque erreur 422, pot de miel, délai, origine, taille, CORS, débit 429), accès `/admin` refusé sans connexion, ressources Filament et commande `admin:create`. Le job `backend` de `.github/workflows/quality-check.yml` lance la suite SQLite.

## Hébergement : décision à prendre

Un hébergement PHP avec PostgreSQL et Redis est nécessaire. **Vercel ne convient pas** (pas de PHP durable, pas de processus `queue:work`). Pistes : un VPS (Docker Compose ou Forge), Laravel Cloud, Fly.io ou Railway, un hébergement mutualisé PHP (sans Redis : repli possible sur `database` pour le cache et les files). Exigences : HTTPS, `queue:work` supervisé, sauvegardes PostgreSQL, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`. Il faut aussi un nom de domaine pour l'API (par exemple `api.<domaine>`) à ajouter ensuite à `ALLOWED_ORIGINS` côté serveur, et un service d'e-mail transactionnel (SMTP, Resend, Postmark...) avec un domaine d'expédition vérifié.

## Reste à faire

- `POST /api/v1/recommendations` (recalcul du score côté serveur, lot ultérieur).
- Brancher le formulaire du site sur `POST /api/v1/quotes` (aujourd'hui : fonction Vercel `POST /api/quote`) une fois l'hébergement choisi ; mise à jour de `docs/API-CONTRACT.md`.
- Déploiement, sauvegardes, supervision des files, politique de conservation et de suppression des demandes (RGPD) à définir avec le propriétaire.
- Administration : authentification à deux facteurs (Filament la propose) et limitation des tentatives de connexion à vérifier avant mise en ligne.
- Téléversement d'images (captures) : aujourd'hui seulement des chemins relatifs vers `assets/`.
- Récupération des codes du questionnaire (`QuoteCodes`) depuis `questionnaire.json` pour éviter la double saisie.
