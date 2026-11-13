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
- [ ] Créer le questionnaire accessible.
- [ ] Implémenter le scoring et les contraintes bloquantes.
- [ ] Tester les cas sans résultat et les demandes sur mesure.
- [ ] Vérifier que le résultat est explicable et non trompeur.

## Lot 6 — Internationalisation
- [ ] Définir le routage FR/EN/AR.
- [ ] Externaliser les contenus.
- [ ] Ajouter le sélecteur de langue.
- [ ] Ajouter RTL et tester chaque page arabe.
- [ ] Ajouter `hreflang` et canonicals cohérents.

## Lot 7 — Devis
- [ ] Choisir un endpoint sécurisé (Laravel ou fournisseur de formulaire approprié).
- [ ] Ajouter validation serveur, anti-spam et consentement.
- [ ] Tester confirmation, erreurs et notifications.
- [ ] Ne pas stocker des données sensibles dans localStorage.

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
