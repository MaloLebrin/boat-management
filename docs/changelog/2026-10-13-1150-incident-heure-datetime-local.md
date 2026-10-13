# 2026-10-13 — Incidents : l'heure saisie par le formulaire est acceptée (#976)

`createBoatIncidentValidator` et `updateBoatIncidentValidator` déclaraient `occurredAt: vine.date()` sans formats. Le format par défaut de VineJS refuse `YYYY-MM-DDTHH:mm`, la valeur d'un `<input type="datetime-local">` que `BoatIncidentForm.vue` envoie : déclarer ou modifier un incident depuis l'UI échouait en validation (« The occurredAt field must be a datetime value »), en ligne comme au rejeu de la file hors-ligne, où l'action partait dans les échecs.

- **Validateur.** `occurredAt` accepte `YYYY-MM-DDTHH:mm`, `YYYY-MM-DDTHH:mm:ss` et `YYYY-MM-DD HH:mm:ss` (création et édition), comme les horodatages du journal de navigation.
- **Tests.** Les tests fonctionnels envoyaient `2026-06-01 10:00:00`, seul format accepté, d'où le trou. Deux cas ajoutés à `tests/functional/boats/incidents.spec.ts` : la valeur réelle du formulaire, décalage horaire compris, à la création et à l'édition ; une heure illisible reste refusée.
- Repéré par le test navigateur de #970 (conflits en lot).
