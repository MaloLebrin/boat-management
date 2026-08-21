# 2026-07-15 — Mode navigation accessible depuis l'UI (journal de bord, carburant, incidents, position)

Le mode « navigation » d'un bateau (`/boats/:id/navigation`) n'était joignable par **aucun lien** dans l'application : le composant `BoatModeSwitcher` existait mais n'était monté nulle part, et les pages flotte renvoyaient en boucle vers la fiche bateau sans jamais exposer la navigation (cul-de-sac).

- **Sélecteur Gestion ↔ Navigation** : `BoatModeSwitcher.vue` (ancres brutes remplacées par `<Link>` Inertia) est désormais monté dans l'en-tête de la fiche bateau (`inertia/pages/boats/show.vue`, mode `management`) **et** de la page navigation (`inertia/pages/boats/navigation.vue`, mode `navigation`). La bascule est bidirectionnelle en 1 clic, sans full reload.
- **Empty states flotte contextuels** : sur `/navigation/logbook`, `/navigation/fuel` et `/navigation/incidents`, lorsqu'un bateau est filtré via `NavigationBoatFilter`, le CTA de l'empty state redirige désormais directement vers `/boats/:id/navigation` (libellé « Ouvrir la navigation ») au lieu de renvoyer vers la liste des bateaux — la boucle sans issue est cassée. Sans filtre, le comportement « Voir mes bateaux » est conservé. Nouvelle clé i18n `navigation.<page>.empty.actionBoat` (FR + EN).

Aucun changement backend (routes, contrôleurs et props déjà en place).
