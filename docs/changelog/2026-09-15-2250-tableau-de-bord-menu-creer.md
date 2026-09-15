# Tableau de bord : menu « + Créer » pour les actions de création

**Date** : 2026-09-15

L'en-tête du tableau de bord alignait cinq contrôles de même poids visuel : trois chips « + Entrée journal », « + Incident », « + Tâche », le lien « Bateaux → » et le bouton « Nouveau bateau x/y ». Toutes les créations sont désormais regroupées dans un seul menu déroulant primaire « + Créer » (même pattern que le menu « + Ajouter » de la fiche bateau), avec une icône devant chaque item : « Un bateau », « Une entrée de journal », « Un incident », « Une tâche ». L'en-tête ne compte plus que deux contrôles : le menu « Créer » et le lien « Bateaux → ».

- Composant : `inertia/components/dashboard/DashboardQuickAddActions.vue` (`BaseDropdown` primaire + icônes Heroicons). Il reçoit désormais `canAddBoat` et `boatQuota` ; `NewBoatButton` n'est plus rendu sur le tableau de bord (il reste utilisé sur la liste des bateaux).
- Item « Un bateau » : badge de quota « x/y » (masqué sur quota illimité), navigation vers `/boats/new`, ou ouverture de la modale d'upsell au quota atteint (même comportement que `NewBoatButton`, #418).
- Sans bateau ou sans permission de création, seul l'item « Un bateau » est proposé ; les trois modales (sortie, incident, tâche) ne changent pas.
- i18n `dashboard.quickAdd` : nouvelles clés `menuLabel`, `menuAria`, `boat` ; les libellés `logbook`, `incident`, `task` perdent leur préfixe « + ».
- Aucun changement de route ni de backend.
