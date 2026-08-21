# 2026-07-03 — [#168] Membres : flash messages d'erreur passés en i18n

**Corrige A-05 : quatre flash d'erreur de `OrganizationMembersController` utilisaient des clés brutes (`member_user_not_found`, `member_already_member`, `member_last_admin`) au lieu de `i18n.t(...)` — l'utilisateur voyait une clé technique au lieu d'un message traduit**

- `app/controllers/organization_members_controller.ts` : les flash de `store()` (`UserNotFoundError`, `AlreadyMemberError`) et de `update()`/`destroy()` (`LastAdminError`) passent désormais par `i18n.t('flash.members.*')`
- `resources/lang/en/flash.json` et `resources/lang/fr/flash.json` : nouvelles clés `members.userNotFound`, `members.alreadyMember`, `members.lastAdmin`
- Tests ajoutés : `tests/functional/organization/members.spec.ts` (flash i18n vérifié pour email sans compte, membre déjà présent, et retrait/rétrogradation du dernier admin)
