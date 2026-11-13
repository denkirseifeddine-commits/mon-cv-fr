# Spécifications produit — Digital Solution Studio

## Vision
Faire évoluer le portfolio professionnel existant en une vitrine commerciale qui combine expertise, projets, solutions digitales prêtes à installer et automatisations.

## Publics
- PME et entreprises
- Startups et entrepreneurs
- Associations
- Commerçants et e-commerçants
- Consultants et agences

## Proposition de valeur
- Français : « Décrivez votre besoin. Découvrez la solution digitale adaptée. »
- Anglais : « Your business needs a digital solution. Let's build it. »

## Piliers
1. **Digital Projects** : développement et intégration sur mesure.
2. **Ready-to-use Solutions** : solutions préconfigurées, installables et personnalisables.
3. **Business Automation** : automatisations et intégrations de processus.

## Arborescence publique
Chaque page vit dans un dossier avec son `index.html`, ce qui donne la même adresse sur Vercel et sur GitHub Pages sans configuration.

- `index.html` : accueil du studio
- `portfolio/` : réalisations et études de cas
- `services/` : prestations
- `solutions/` : catalogue
- `solutions/<slug>/` : fiche d'une solution publiée (HTML statique, indexable)
- `automatisations/` : cas d'usage et offres d'automatisation
- `trouver-ma-solution/` : questionnaire
- `contact/` : contact et demande de devis
- `cv.html` : CV existant, inchangé

## Accueil
- Hero et proposition de valeur
- Trois piliers commerciaux
- Solutions mises en avant (uniquement validées)
- Projets existants
- Méthode de travail
- Expertise et technologies
- CTA vers le questionnaire et le contact

## Catalogue
Filtres par catégorie, recherche, cartes accessibles et fiches HTML indexables.
Chaque fiche présente problème, solution, fonctionnalités vérifiées, captures, technologies, prérequis, licence, version, contenu livré, options, délai, prix si validé et CTA.
Catégories : sites web, e-commerce, CRM, automatisation marketing, assistants IA, mini-SaaS, outils métier, applications sur mesure.

## Questionnaire
Questions configurables (`assets/data/questionnaire.json`) :
1. Besoin principal
2. Secteur
3. Objectif métier
4. Complexité
5. Budget
6. Délai
7. Niveau de personnalisation

Moteur déterministe : règles et scores, sans API d'IA. Le résultat présente jusqu'à trois solutions pertinentes. Si aucune solution ne passe les contraintes minimales, proposer un devis personnalisé.

## Conversion
Le frontend peut préparer et valider les demandes, mais une demande commerciale ne doit pas être considérée comme envoyée tant qu'un endpoint sécurisé n'a pas confirmé sa réception. Aucun secret ne doit être placé dans le JavaScript public.

## Hors périmètre V1
- Paiement en ligne
- Comptes clients
- Abonnements
- Multi-tenant
- Provisionnement automatique des instances clientes
- Recommandation par IA payante
- Synchronisation automatique GitLab
