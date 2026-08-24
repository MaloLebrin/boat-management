# 2026-07-03 — [#196] Membres : flash message sur MemberNotFoundError

**Corrige A-10 : `MemberNotFoundError` levée dans `update()` et `destroy()` de `OrganizationMembersController` provoquait une redirection silencieuse, sans indiquer à l'utilisateur ce qui s'était passé**

- `app/controllers/organization_members_controller.ts` (`update()` ligne 93, `destroy()` ligne 119) : ajout de `session.flash('error', i18n.t('flash.members.notFound'))` avant le redirect
- `resources/lang/en/flash.json` et `resources/lang/fr/flash.json` : nouvelle clé `members.notFound`
- Tests ajoutés : `tests/functional/organization/members.spec.ts` (flash d'erreur vérifié sur `PUT` et `DELETE` avec un id de membre inexistant)
