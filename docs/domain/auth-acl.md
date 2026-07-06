# Domaine — Auth & ACL

## Auth (signup/login/logout)

Référence routes: `start/routes/auth.ts`.

### Signup

- `GET /signup` (guest-only)
  - Controller: `app/controllers/new_account_controller.ts` → `create`
  - Page: `inertia/pages/auth/signup.vue`
- `POST /signup` (guest-only)
  - Controller: `NewAccountController.store`
  - Validation: `signupValidator` (`app/validators/user.ts`)
  - Service: `UserService.signupWithOrganization`
  - Auth: `auth.use('web').login(user)`
  - Redirect: route `home`

### Login

- `GET /login` (guest-only)
  - Controller: `app/controllers/session_controller.ts` → `create`
  - Page: `inertia/pages/auth/login.vue`
- `POST /login` (guest-only)
  - Controller: `SessionController.store`
  - `User.verifyCredentials(email, password)`
  - `auth.use('web').login(user)`
  - Redirect: route `home`

### Logout

- `POST /logout` (auth-only)
  - Controller: `SessionController.destroy`
  - `auth.use('web').logout()`
  - Redirect: route `session.create`

## Home vs dashboard

Référence: `app/controllers/home_controller.ts`.

- non-auth → render Inertia `home`
- auth → render Inertia `dashboard` avec data du `DashboardService`

## ACL (Bouncer + Policies)

Références:

- Policies: `app/policies/*.ts` (16 fichiers, un par ressource)
- Base class partagée: `app/utils/org_scoped_policy.ts`
- Taxonomie de capacités: `shared/types/permissions.ts`
- Middleware d'enregistrement: `app/middleware/initialize_bouncer_middleware.ts` (instancie un `Bouncer` par requête à partir de `#generated/policies`, auto-découvertes via `indexPolicies()` dans `adonisrc.ts`)
- `app/abilities/main.ts` est un placeholder vide, conservé uniquement pour ne pas casser un import historique — toute l'autorisation passe par les Policies, pas par des abilities fonction.

### Modèle de rôles

Un utilisateur appartient à une organisation via deux mécanismes qui coexistent :

- `users.organization_id` — l'org "courante"/historique de l'utilisateur (FK nullable, sans contrainte FK en base, vérifiée côté app)
- `organization_memberships` (table pivot `user_id` × `organization_id` avec colonne `role`) — support pour un rattachement multi-org (peu exploité aujourd'hui : l'app suppose `user.organizationId` comme org active)

`OrgRole = 'admin' | 'member'` (`shared/types/organization.ts`) — seulement deux rôles, pas de rôle personnalisé par organisation.

Méthodes clés sur `User` (`app/models/user.ts`) :

- `getRoleInOrg(orgId): Promise<OrgRole | null>` — lit la ligne `organization_memberships` correspondante
- `isAdminOf(orgId): Promise<boolean>` — `role === 'admin'`
- `hasPermission(orgId, capability): Promise<boolean>` — résout la capacité via `ROLE_PERMISSIONS[role]`. **Cas particulier legacy** : si aucune ligne de membership n'existe mais que `user.organizationId === orgId` (utilisateur historique jamais "auto-réparé"), le rôle est traité comme `member` par défaut plutôt que refusé — cela préserve le comportement historique où tout utilisateur rattaché à une org avait au moins un accès de niveau membre.

### Taxonomie de capacités (`shared/types/permissions.ts`)

Chaque action sensible d'une ressource est identifiée par une **capacité** nommée (`<ressource>.<action>`, ex. `boats.delete`, `members.manage`). `ROLE_PERMISSIONS: Record<OrgRole, Set<Capability>>` associe à chaque rôle l'ensemble de ses capacités — `admin` est toujours un sur-ensemble strict de `member` (vérifié par `tests/unit/permissions_taxonomy.spec.ts`).

| Ressource                  | Capacités partagées (admin + member)                                                      | Capacités admin-only                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Organisation               | `members.view`, `invitations.view`, `audit_log.view`                                      | `members.manage`, `invitations.manage`, `ai.configure`, `branding.configure` |
| Bateaux                    | `boats.view`, `boats.create`, `boats.edit`, `boats.manage`, `boats.reservations.delete`\* | `boats.delete`                                                               |
| Clients                    | `clients.create`, `clients.update`                                                        | `clients.delete`                                                             |
| Équipage                   | `crew.create`, `crew.update`                                                              | `crew.delete`                                                                |
| Carnet de bord / carburant | `navigation_logs.create`, `navigation_logs.update`, `fuel_logs.create`                    | `navigation_logs.delete`, `fuel_logs.delete`                                 |
| Incidents                  | `incidents.view`, `incidents.create`, `incidents.edit`                                    | `incidents.delete`                                                           |
| Entretien                  | `maintenance.view`, `maintenance.create`, `maintenance.edit`                              | `maintenance.delete`                                                         |
| Factures/devis             | `invoices.create`, `invoices.update`                                                      | `invoices.delete`                                                            |
| Tarification               | `pricing_seasons.create`, `pricing_seasons.update`                                        | `pricing_seasons.delete`                                                     |
| Spots                      | `spots.view`, `spots.create`, `spots.edit`                                                | `spots.delete`                                                               |
| Ports                      | `ports.view`                                                                              | `ports.create`, `ports.edit`, `ports.delete` ⚠                               |
| Mouillages                 | `mouillages.view`                                                                         | `mouillages.create`, `mouillages.edit`, `mouillages.delete` ⚠                |
| Abonnement                 | `subscription.view`                                                                       | `subscription.manage`                                                        |
| Simulateur                 | —                                                                                         | `simulator.manage_leads`                                                     |

`*` `boats.reservations.delete` porte en plus une règle métier propre à la ressource : un member ne peut supprimer que les réservations **non confirmées** (`reservation.status !== 'confirmed'`), vérifiée après la capacité dans `BoatPolicy.deleteReservation`.

`⚠` Ports et Mouillages sont **admin-only sur create/edit/delete** (contrairement à toutes les autres ressources, où member peut créer/éditer et seul delete est admin-only). C'est un choix hérité, préservé tel quel lors de l'introduction des capacités — pas encore tranché s'il s'agit d'une règle métier voulue ou d'un oubli historique. `PortPolicy.edit/delete` et `MouillagePolicy.edit/delete` vérifient malgré tout `sameOrg` (comme `view`) en plus de la capacité, par défense en profondeur : le jour où `ports.edit`/`mouillages.edit` seraient déplacées vers les capacités partagées, l'isolation multi-tenant reste garantie sans action supplémentaire.

### Mécanisme (comment une Policy vérifie une capacité)

Toutes les policies org-scopées héritent de `OrgScopedPolicy` (`app/utils/org_scoped_policy.ts`) :

```ts
export default abstract class OrgScopedPolicy extends BasePolicy {
  async before(user: User) {
    // Un admin de l'org court-circuite tout — avant même les méthodes ci-dessous
    if (user.organizationId && (await user.isAdminOf(user.organizationId))) return true
  }
  protected async can(user: User, capability: Capability) {
    /* → user.hasPermission(...) */
  }
  protected sameOrg(user: User, resource: { organizationId: number }) {
    /* … */
  }
}
```

Une policy concrète (ex. `BoatPolicy`) compose `sameOrg()` (isolation multi-tenant) et `can()` (capacité du rôle) :

```ts
async delete(user: User, boat: Boat) {
  return this.sameOrg(user, boat) && (await this.can(user, 'boats.delete'))
}
```

**Note importante** : `before()` ne vérifie que le rôle de l'utilisateur, jamais l'organisation de la ressource ciblée. Un admin de l'org A passe donc `before()` même pour une ressource théorique de l'org B — en pratique ce n'est jamais exploitable car chaque Service scope déjà ses requêtes par `organizationId` (la ressource d'une autre org n'est jamais chargée, donc jamais passée à la Policy). C'est un point de vigilance si un futur endpoint oubliait ce scoping.

`app/utils/org_scoped_policy.ts` vit **hors** de `app/policies/` intentionnellement : `indexPolicies()` (hook `adonisrc.ts`) indexe tout fichier `.ts` du dossier `app/policies/` comme une policy concrète instanciable — une classe abstraite placée là casserait la génération de `#generated/policies`.

### Ajouter une nouvelle capacité

1. Ajouter la valeur au type `Capability` dans `shared/types/permissions.ts`
2. L'ajouter à `MEMBER_CAPABILITIES` (si member+admin) ou `ADMIN_ONLY_CAPABILITIES` (si admin seul)
3. Utiliser `this.can(user, 'ma.capacite')` dans la Policy concernée
4. Étendre `tests/unit/permissions_taxonomy.spec.ts` et `tests/integration/permissions/policies_capabilities.spec.ts`

### Exposition frontend

`app/services/permission_service.ts` calcule `{ role, capabilities }` (rôle + capacités résolues) et `app/middleware/inertia_middleware.ts` les partage via la prop Inertia `permissions` sur chaque rendu.

Composable `inertia/composables/use_permissions.ts` :

```ts
const { role, isAdmin, isMember, can } = usePermissions()
// v-if="can('members.manage')"
```

### Règles métier annexes préservées

- **Dernier admin protégé** : `OrganizationMemberService.ensureNotLastAdmin` empêche de rétrograder/supprimer le dernier admin d'une organisation (`LastAdminError`)
- **Auto-réparation des memberships** : `OrganizationMemberService.ensureMembershipsForOrgUsers` crée une ligne `organization_memberships` (rôle `admin`) pour tout utilisateur rattaché via `organizationId` qui n'en a pas encore — typiquement le propriétaire d'une org créée avant l'introduction de la table pivot

### Tests

- `tests/unit/permissions_taxonomy.spec.ts` — invariant `member ⊂ admin`, couverture de la taxonomie
- `tests/integration/permissions/user_has_permission.spec.ts` — `User#hasPermission()` avec de vraies lignes DB
- `tests/integration/permissions/policies_capabilities.spec.ts` — admin autorisé / member refusé / cross-org refusé sur plusieurs policies représentatives
- `tests/inertia/use_permissions.spec.ts` — composable frontend
