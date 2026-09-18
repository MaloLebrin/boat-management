# 2026-09-18 — Une place occupée ne se supprime plus (#720)

Supprimer un ponton occupé était refusé, mais supprimer une de ses places passait : la clé `boats.spot_id ON DELETE SET NULL` démarrait le bateau sans le moindre message, et son séjour à quai (`boat_position_history`) restait ouvert sur une place disparue. La garde du ponton se contournait donc en vidant ses places une à une. Tranché par symétrie avec le ponton : **refuser**.

- **Service.** `SpotService.delete` cherche, dans une transaction, le bateau amarré sur la place ; s'il y en a un, il lève `SpotHasBoatError` (nouvelle classe de `app/exceptions/port_errors.ts`, porteuse du nom du bateau) avant toute écriture.
- **Route.** `DELETE /spots/:id` sur une place occupée : `302` vers la page précédente, flash `error` `flash.spots.hasBoat` nommant le bateau (« Impossible de supprimer cette place : {name} y est amarré. Libérez-la d'abord. »). Rien n'est supprimé, le bateau reste amarré. Une place libre se supprime comme avant.
- **Front.** `SpotsManager` prévient (`ports.spots.hasBoat`) au clic sur « Supprimer » d'une place occupée, sans ouvrir la confirmation — même garde que `PontoonCard` et `MouillageCard`.
- **Parcours.** Pour supprimer une place occupée, démarrer d'abord le bateau (« Affecter un bateau » → « Aucun bateau (libérer la place) »), puis supprimer.
- **Tests.** `spot_deletion_frontier.spec.ts` passe de caractérisation à validation (refus aux deux étages, contournement place par place fermé, suppression après démarrage) ; `spot_service.spec.ts` couvre le refus et le nom porté par l'erreur ; `spots_manager_permissions.spec.ts` (Vitest) couvre l'avis sur place occupée et la confirmation sur place libre.
- **Docs.** `docs/domain/ports-and-marina.md` mis à jour, constat #720 retiré des constats ouverts.
