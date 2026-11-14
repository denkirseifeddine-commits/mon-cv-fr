# Plan d'implémentation

Une pull request par lot, validée avant le lot suivant.

## Préparation
- [x] Créer une branche de travail.
- [x] Retenir l'URL Vercel canonique : `https://mon-cv-fr.vercel.app`.
- [ ] Vérifier les paramètres de déploiement Vercel (tableau de bord).
- [x] Inventorier les liens et ressources actuels (`docs/AUDIT.md`).
- [x] Captures d'ATDDS et de Meubles Chabbouh, lien LinkedIn.
- [ ] Capture mobile d'ATDDS (le site s'affichait sans ses styles au moment des captures).
- [ ] Rôle et période pour ATDDS et Meubles Chabbouh (à fournir par le propriétaire).

## Lot 1 — Fondation non destructive
- [x] Ajouter README et AGENTS.
- [x] Ajouter favicon et métadonnées (canonical, Open Graph).
- [x] Ajouter page 404.
- [x] Ajouter robots.txt et sitemap avec le domaine réel.
- [x] Extraire les tokens CSS dans `assets/css/tokens.css`.
- [x] Recopier les 8 projets dans `assets/data/projects.json`.
- [x] Ajouter les données de départ : catégories, questionnaire, solution d'exemple.
- [x] Vérifier le CV et préserver son style autonome.
- [x] Ajouter un test de liens et de ressources (`scripts/check-site.py`) et l'intégration continue.

## Lot 2 — Navigation et design system
- [x] En-tête et pied de page communs, générés depuis `assets/js/config/navigation.js`.
- [x] Menu compact accessible sur petit écran.
- [x] Découper `portfolio.css` en base, composants et styles de l'accueil.
- [x] Découper `portfolio.js` en modules ES.
- [x] Nouveaux composants : carte solution, badge de statut, filtres, champs de formulaire, cartes de choix, résultat de recommandation.
- [x] Page de démonstration `design-system/`.
- [x] `check-site.py` vérifie les imports JavaScript et les références CSS.

## Lot 3 — Positionnement et pages
- [x] Accueil du studio : proposition de valeur, trois offres, projets récents, méthode.
- [x] Page Portfolio : l'ancienne page d'accueil, avec les vraies captures des deux projets à la une.
- [x] Pages Services, Automatisations et Contact.
- [x] Formulaire de demande de devis : e-mail pré-rempli dans la messagerie du visiteur (`quote-service.js`).
- [x] Navigation du studio et lien LinkedIn dans le pied de page et le CV.
- [ ] Textes des pages Services et Automatisations à valider par le propriétaire.
- [ ] Transformer les projets existants en études de cas (contexte, défi, résultats : contenu à fournir).

## Lot 4 — Catalogue
- [x] Couche de services (`catalogService`).
- [x] Page catalogue avec filtres par catégorie et recherche.
- [x] Ajouter uniquement des offres réellement prêtes ou clairement marquées comme exemples.
- [x] Fiche solution (`solutions/fiche/?s=<slug>`).
- [x] Tests unitaires du service catalogue (`scripts/test-catalog.mjs`, intégration continue).
- [ ] Créer des fiches HTML indexables pour les solutions publiées (aucune solution publiée pour l'instant).

## Lot 5 — Questionnaire
- [x] Créer le questionnaire accessible.
- [x] Implémenter le scoring et les contraintes bloquantes.
- [x] Tester les cas sans résultat et les demandes sur mesure.
- [x] Vérifier que le résultat est explicable et non trompeur.
- [x] Tests unitaires du moteur (`scripts/test-recommendation.mjs`, intégration continue).

## Lot 6 — Internationalisation
- [x] Définir le routage FR/EN/AR (français à la racine, `en/` et `ar/` avec les mêmes dossiers).
- [x] Externaliser les contenus (`assets/js/i18n/messages/`, données JSON `{ fr, en, ar }`).
- [x] Ajouter le sélecteur de langue (en-tête : FR, EN, ع).
- [x] Ajouter RTL (propriétés logiques, flèches, polices arabes).
- [ ] Tester chaque page arabe au rendu (ordinateur et mobile).
- [x] Ajouter `hreflang` et canonicals cohérents (pages, sitemap, `scripts/check-site.py`).
- [x] Tests i18n (`scripts/test-i18n.mjs`, intégration continue).

## Lot 7 — Devis
- [x] Choisir un endpoint sécurisé : fonction serveur Vercel provisoire `api/quote` + Resend, en attendant Laravel.
- [x] Ajouter validation serveur, anti-spam (origine, pot de miel, délai, limitation de débit) et consentement.
- [x] Tester confirmation, erreurs et repli sur l'e-mail pré-rempli (tests Node et navigateur).
- [ ] Configurer les variables d'environnement dans Vercel et vérifier un envoi réel.
- [x] Ne pas stocker des données sensibles dans localStorage.

## Lot 8 — Backend
- [ ] Décider si le catalogue justifie une API.
- [ ] Implémenter Laravel, PostgreSQL et Filament.
- [ ] Migrer les données JSON.
- [ ] Ajouter prospects, devis, commandes et paiements par étapes.

## Critères de sortie de chaque lot
- Aucun contenu existant perdu.
- `python3 scripts/check-site.py` sans erreur.
- Affichage mobile et desktop vérifié.
- Navigation clavier vérifiée.
- Console navigateur sans erreur critique.
- Déploiement Vercel vérifié.
- Compatibilité GitHub Pages testée si maintenue.
