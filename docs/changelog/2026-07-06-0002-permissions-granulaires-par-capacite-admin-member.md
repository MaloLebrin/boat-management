# 2026-07-06 — Permissions granulaires par capacité (admin/member)

Refactor de l'autorisation Bouncer : les 16 policies codaient en dur `before()` (bypass admin) puis `return false`/checks bruts pour chaque action. Introduction d'une taxonomie de capacités explicite (`shared/types/permissions.ts` : type `Capability`, `ROLE_PERMISSIONS: Record<OrgRole, Set<Capability>>`), sans changement de comportement (refactor pur) ni migration de base de données — le rôle reste `'admin' | 'member'` en base.

- **Backend** :
  - `shared/types/permissions.ts` : taxonomie des capacités (`boats.delete`, `members.manage`, `ai.configure`…) et mapping par rôle
  - `app/models/user.ts` : nouvelle méthode `hasPermission(orgId, capability)` ; fallback vers les capacités `member` pour un utilisateur lié à l'org via `organizationId` mais sans ligne `organization_memberships` (préserve le comportement historique des utilisateurs legacy non encore auto-réparés)
  - `app/utils/org_scoped_policy.ts` : classe de base `OrgScopedPolicy` (hors `app/policies/` pour ne pas être indexée par Bouncer) centralisant le `before()` admin et exposant `can()`/`sameOrg()`
  - Les 16 policies (`app/policies/*.ts`) migrées vers `OrgScopedPolicy` et les nouvelles capacités
  - `app/services/permission_service.ts` : `sharedProps()` pour exposer rôle + capacités résolues à Inertia
  - `app/middleware/inertia_middleware.ts` : nouvelle prop partagée `permissions`
  - `shared/types/auth.ts` supprimé (type mort, jamais peuplé côté frontend)
- **Frontend** : `inertia/composables/use_permissions.ts` — `usePermissions()` expose `role`, `isAdmin`, `isMember`, `can(capability)` à partir des props Inertia partagées
- **Comportement préservé à l'identique** : MouillagePolicy/PortPolicy restent admin-only sur create/edit/delete (pas alignés sur les autres ressources) ; `OrganizationInvitationPolicy` migrée mais toujours non branchée dans le contrôleur (qui utilise `OrganizationPolicy.manageMembers`)
- **Documentation** : `docs/domain/auth-acl.md` réécrit (section ACL) — taxonomie complète, mécanisme des Policies, exposition frontend, règles préservées
- **Tests** : `tests/unit/permissions_taxonomy.spec.ts` (invariant member ⊂ admin), `tests/integration/permissions/user_has_permission.spec.ts`, `tests/integration/permissions/policies_capabilities.spec.ts` (admin autorisé / member refusé / cross-org refusé sur plusieurs policies admin-only), `tests/inertia/use_permissions.spec.ts`
