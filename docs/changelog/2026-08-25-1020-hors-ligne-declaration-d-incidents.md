# 2026-08-25 — Hors-ligne : déclaration et modification d'incidents (#489)

Déclarer un incident est la saisie de terrain la plus urgente du produit — typiquement au moment où on a le moins de réseau — et n'avait aucun support hors-ligne.

- **Conversion `<Form>` → `useForm`.** `BoatIncidentForm.vue` utilisait `<Form :action>` d'`@adonisjs/inertia/vue`, sans `handleSubmit` interceptable. Converti en `useForm` + `@submit.prevent` : champs pilotés par `form.*`, erreurs par `form.errors`, `form.put`/`form.post` selon le mode. La conversion couvre aussi `QuickAddIncidentModal.vue` (délégation) et le quick add du dashboard.
- **Chemin hors-ligne.** Hors connexion, la saisie part en file (`create-incident` en POST, `update-incident` en PUT — last-write-wins comme les créations, pas de `_expectedUpdatedAt` sur les incidents) et est rejouée à la reconnexion. Un refus 4xx au rejeu part dans le store `failed` (#487).
- **`tzOffsetMinutes` figé à la soumission.** L'ancien `<input type="hidden">` recalculait l'offset **à l'affichage** ; il est désormais relu dans `handleSubmit` (pattern #452) et embarqué dans le payload enfilé : un incident saisi hors-ligne puis synchronisé après un changement de fuseau garde le fuseau de la saisie — jamais recalculé au rejeu.
- **i18n.** Libellés de file `offline.queue.type.create-incident` / `update-incident`, deux locales.
- **Doc.** Tableau « Formulaires supportés » de `docs/frontend/pwa.md` (+2 lignes).
- **Tests.** `boat_incident_form.spec.ts` réécrit (8 cas) : soumission en ligne create/update, erreurs de validation affichées, enqueue hors-ligne create/update avec payload complet, **offset figé à la soumission et insensible à un changement de fuseau ultérieur**, annulation, libellés traduits. `quick_add_incident_modal.spec.ts` inchangé et vert (12 cas au total).
