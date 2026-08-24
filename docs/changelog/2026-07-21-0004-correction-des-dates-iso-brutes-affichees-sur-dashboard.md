# 2026-07-21 — Correction des dates ISO brutes affichées sur dashboard, fiche bateau et planning (#405)

Audit UX du 2026-07-19 : les dates étaient affichées en ISO brut (« Dû le 2026-07-12 », « Echeance: 2026-07-12 », « Installé le 2018-04-01 », « Fabriqué le 2020-05-01 ») sur le dashboard, la fiche bateau (onglets Aperçu/Équipement/Tâches/Incidents) et le planning kanban, alors que d'autres écrans (audit-log, historique) formatent déjà correctement via `Intl.DateTimeFormat`. Aucune norme commune.

- Nouveau composable `inertia/composables/use_date_format.ts` (`formatDate`, `formatDateTime`) — même pattern que `use_reservation_format.ts`, s'appuie sur la locale reactive de `useT()`, retourne `—` pour une date manquante.
- Remplacement systématique des interpolations de dates brutes et des faux formateurs (`iso.slice(0, 10)`) par ce composable : dashboard (maintenance urgente), planning kanban (échéance des tâches et des groupes), fiche bateau — onglets Tâches, Aperçu (alerte de retard, KPIs, activité récente), Incidents, et fiches info Gréement/Voile/Sécurité/Équipement générique, cartes Moteur/Voile/Gréement/Sécurité de l'onglet Équipement.
- `BoatSafetyEquipmentCard.vue` : la fonction locale servant à préremplir le champ `<input type="date">` du formulaire d'édition (qui a besoin du format ISO brut, pas localisé) est renommée `toDateInputValue` pour ne pas la confondre avec le nouvel affichage localisé.
- Réutilise la clé i18n existante `boats.maintenance.tasks.dueAt` (déjà présente en FR/EN) à la place du texte « Echeance: » codé en dur dans l'onglet Tâches.
- Tests : nouveau `tests/inertia/use_date_format.spec.ts`.
