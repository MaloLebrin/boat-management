# 2026-07-03 — [#167] Membres : l'owner de l'org apparaît toujours dans la liste

**Corrige A-04 : `listMembers()` ne lisait que la table `organization_memberships`. Un user rattaché à une organisation mais sans ligne de membership (drift de données, ou owner créé avant le backfill des memberships) n'apparaissait jamais — la page members pouvait être vide**

- `app/services/organization_member_service.ts` : `listMembers()` appelle désormais `ensureMembershipsForOrgUsers()` en amont — pour chaque user de l'org sans membership, une membership `admin` est créée (idempotent via la contrainte unique `(user_id, organization_id)`). L'invariant « tout user de l'org a une membership » est ainsi auto-réparé, sans changement de type ni de frontend (`id` reste l'id de membership, donc les actions rôle/suppression continuent de fonctionner)
- Le backfill des données existantes était déjà couvert par la migration `1779400001000_backfill_organization_memberships.ts` ; ce correctif ajoute la garantie au runtime
- Test ajouté : `tests/functional/organization/members.spec.ts` (un user avec `organizationId` mais sans membership apparaît dans la liste en rôle `admin`, et sa membership est bien créée)

**Corrige A-06, D-04 et E-03 : `vine.compile()` est interdit par les règles du projet (déprécié). Il subsistait dans plusieurs validators des domaines auth, navigation/équipage et CSV**

- `app/validators/organization_member.ts` : les 4 validators (`inviteMemberValidator`, `updateMemberRoleValidator`, `acceptInvitationValidator`, `declineInvitationValidator`) utilisent désormais `vine.create()`
- `app/validators/navigation_log.ts` : les 3 validators (`createNavigationLogValidator`, `updateNavigationLogValidator`, `closeNavigationLogValidator`) utilisent désormais `vine.create()`
- `app/validators/crew.ts` : les 4 validators (`createCrewMemberValidator`, `updateCrewMemberValidator`, `createCrewCertificationValidator`, `syncNavigationLogCrewValidator`) utilisent désormais `vine.create()`
- `app/validators/csv_import.ts` : les 2 validators (`csvPreviewValidator`, `csvConfirmValidator`) utilisent désormais `vine.create()`
- Remplacement mécanique sans changement de comportement (même API, `vine.create` est le remplaçant direct de `vine.compile`)
