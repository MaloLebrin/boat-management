# 2026-09-29 — Corbeille des bateaux (#858)

Supprimer un bateau effaçait physiquement tout son historique (76 clés étrangères en cascade). La corbeille garde la ligne et ses enfants 30 jours.

- **Périmètre.** Soft delete sur l'agrégat `boats` seulement. Les moteurs, tâches, documents et médias suivent le bateau et ne partent qu'à la purge. Les clients et les factures restent hors sujet : l'anonymisation RGPD existe, une facture émise ne se supprime pas. Le statut `sold` (#870) reste distinct — historique lisible, hors quota, hors liste active.
- **Comportement.** `DELETE /boats/:id` pose `deleted_at`, libère la place et propose « Annuler » sur le toast. `GET /boats?trashed=1` (capacité `boats.delete`) liste la corbeille avec restauration et suppression définitive. Un bateau en corbeille ne compte pas dans le quota, mais son nom et son immatriculation restent réservés. Le restaurer, s'il n'est pas vendu, repasse par le plafond. Job `PurgeTrashedBoats` à 04:15 Europe/Paris.
- **Tests.** Fonctionnels (invisible, restauration, quota, identité, purge, membre) et Vitest (toast Annuler, actions de corbeille).
