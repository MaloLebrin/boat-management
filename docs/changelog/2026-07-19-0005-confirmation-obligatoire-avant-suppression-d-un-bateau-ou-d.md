# 2026-07-19 — Confirmation obligatoire avant suppression d'un bateau ou d'un port (#398)

`inertia/pages/boats/edit.vue` soumettait la suppression du bateau directement au clic (`<Form method="delete">`), sans aucune confirmation — un clic malencontreux d'un admin supprimait le bateau et tout son historique immuable (maintenance, documents, équipements). `inertia/pages/ports/show.vue` n'utilisait qu'un `confirm()` natif du navigateur, incohérent avec le pattern de confirmation déjà utilisé ailleurs (clients, factures, saisons tarifaires).

- `inertia/pages/boats/edit.vue` : le bouton « Supprimer » ouvre désormais `BaseConfirmModal` (titre + message rappelant le nom du bateau et l'irréversibilité) avant d'appeler `router.delete`.
- `inertia/pages/ports/show.vue` : remplacement du `confirm()` natif par `BaseConfirmModal`, cohérent avec le reste de l'application ; la vérification « port avec bateaux assignés » (`alert()`) est conservée telle quelle en amont de la modale.
- Nouvelles clés i18n `boats.edit.deleteConfirm.title`/`.message` (FR+EN).
- **Tests** : `tests/inertia/boats_edit_delete_button.spec.ts` (ouverture de la modale puis confirmation avant `router.delete`), `tests/inertia/ports_show_delete.spec.ts` (nouveau).
- Backend inchangé — purement une correction d'affichage frontend.
