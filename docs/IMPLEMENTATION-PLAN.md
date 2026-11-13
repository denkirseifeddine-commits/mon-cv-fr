# Plan d'implémentation

Une pull request par lot, validée avant le lot suivant.

## Préparation
- [x] Créer une branche de travail.
- [x] Retenir l'URL Vercel canonique : `https://mon-cv-fr.vercel.app`.
- [ ] Vérifier les paramètres de déploiement Vercel (tableau de bord).
- [x] Inventorier les liens et ressources actuels (`docs/AUDIT.md`).
- [ ] Résoudre les captures manquantes et le lien LinkedIn `#` sans inventer de contenu (en attente du propriétaire).

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
- [ ] Factoriser header/footer (reporté au lot 2, stratégie décrite dans `ARCHITECTURE.md`).

## Lot 2 — Navigation et design system
- [ ] En-tête et pied de page communs.
- [ ] Découper `portfolio.css` en base et composants.
- [ ] Nouveaux composants : carte solution, badge de statut, champs de formulaire.

## Lot 3 — Positionnement et pages
- [ ] Faire évoluer la page d'accueil (proposition de valeur, trois piliers).
- [ ] Créer les pages Portfolio, Services, Automatisations et Contact.
- [ ] Transformer les projets existants en études de cas.
- [ ] Garder les contenus réels ; marquer les informations manquantes.

## Lot 4 — Catalogue
- [ ] Couche de services (`catalogService`).
- [ ] Page catalogue avec filtres par catégorie et recherche.
- [ ] Ajouter uniquement des offres réellement prêtes ou clairement marquées comme exemples.
- [ ] Créer des fiches HTML indexables pour les solutions publiées.

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
