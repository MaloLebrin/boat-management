# 2026-05-22 — Système de permissions Bouncer (rôles admin / member, scoped organisation)

- Nouvelle table `organization_memberships` (`user_id`, `organization_id`, `role` enum admin|member) avec contrainte d'unicité par paire user-org
- Migration de backfill : tous les utilisateurs existants liés à une org deviennent `admin`
- Modèle `OrganizationMembership` + helpers `User.getRoleInOrg(orgId)` / `User.isAdminOf(orgId)`
- 4 policies Bouncer dans `app/policies/` : `BoatPolicy`, `PortPolicy`, `MaintenancePolicy`, `OrganizationPolicy`
  - Matrice : admin → tout autoriser via hook `before` ; member → view/create/edit bateaux et maintenance, lecture seule infrastructure
  - Suppression de bateaux, ports/pontoons/mouillages/spots, maintenance : admin uniquement
- Remplacement de toutes les anciennes abilities `boatView/boatCreate/boatUpdate/boatDelete` par les nouvelles policies dans tous les controllers
- Service `OrganizationMemberService` : listMembers, addMember, updateRole, removeMember (avec protection dernier admin)
- Nouveau controller `OrganizationMembersController` + routes `GET/POST/PUT/DELETE /organization/members`
- Validator `inviteMemberValidator` / `updateMemberRoleValidator`
- Page frontend `inertia/pages/organization/members.vue` : table des membres, changement de rôle inline, formulaire d'invitation (visible admin seulement)
- Clés i18n `resources/lang/{en,fr}/organization.json`
- Types partagés dans `shared/types/organization.ts` : `OrgRole`, `OrganizationMemberData`

---
