# 2026-08-25 — Hors-ligne : saisie des heures moteur (#488)

Relever les heures moteur est une saisie de terrain typique — au retour d'une sortie, souvent sans réseau — mais le formulaire exigeait une connexion. Cinquième formulaire branché sur la file hors-ligne.

- **`EngineHoursQuickAddForm.vue`.** Chemin hors-ligne selon la procédure de `docs/frontend/pwa.md` : hors connexion, l'incrément part dans la file IndexedDB (`type: increment-engine-hours`, `PATCH /boats/:id/engines/:engineId/hours`) et sera rejoué à la reconnexion ; en ligne, comportement inchangé.
- **Sûreté du rejeu vérifiée.** Le contrôleur applique bien un **incrément** (`BoatEngineService.incrementHours` : `hours += increment`), jamais un set absolu : l'opération est commutative, aucun conflit possible avec une saisie en ligne intercalée, et le trigger de monotonie ne peut pas rejeter le rejeu.
- **i18n.** Libellé de file `offline.queue.type.increment-engine-hours` dans les deux locales.
- **Doc.** Ligne ajoutée au tableau « Formulaires supportés » de `docs/frontend/pwa.md`.
- **Tests.** 5 cas Vitest (`engine_hours_quick_add_form.spec.ts`) : chemin en ligne (`router.patch`), chemin hors-ligne (enqueue avec type/url/method/payload, aucun appel réseau), incrément invalide non enfilé, rejeu correct après reconnexion, libellé traduit dans les deux locales.
