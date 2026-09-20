# Domaine — Auth & ACL

## Auth (signup/login/logout)

Référence routes: `start/routes/auth.ts`.

### Signup

- `GET /signup` (guest-only)
  - Controller: `app/controllers/new_account_controller.ts` → `create`
  - Page: `inertia/pages/auth/signup.vue`
- `POST /signup` (guest-only)
  - Controller: `NewAccountController.store`
  - Validation: `signupValidator` (`app/validators/user.ts`) — `firstName`, `lastName`, `email`, `password`, `organizationName`, `organizationType?`, `fleetSize?`, `acceptTerms`. Le schéma doit rester le miroir exact des champs rendus par la page, sinon l'inscription échoue en silence (#448) ; `tests/inertia/signup_form_validator_sync.spec.ts` le vérifie.
  - Service: `UserService.signupWithOrganization`
  - Auth: `auth.use('web').login(user)`
  - Redirect: route `home`
  - Mot de passe : `PASSWORD_MIN_LENGTH` / `PASSWORD_MAX_LENGTH` (`shared/constants/auth.ts`) — mêmes constantes côté formulaire, qui les affiche (#455). `store` connecte l'utilisateur immédiatement, envoie l'e-mail de bienvenue (`EmailQueueService.sendWelcome`) **et** un lien de vérification d'adresse (#768, voir ci-dessous) : l'essai reste sans friction, le compte part simplement non vérifié
  - Promesses affichées : `tests/functional/auth/signup_claims.spec.ts` relit les chaînes servies dans `appT` pour interdire tout retour d'un quota en dur, d'un « illimité » ou d'un essai 14 jours (#455)

### Vérification d'adresse (#768)

L'inscription créait directement un utilisateur, une organisation et une
session : **rien ne prouvait que l'adresse saisie appartenait à la personne qui
s'inscrivait**. Or cette adresse est le pivot de l'app — clé de connexion,
canal de réinitialisation, cible des invitations, destinataire des factures et
des relances. Ce que cela permettait : s'inscrire avec l'adresse d'un tiers (qui
reçoit alors nos e-mails transactionnels), des comptes jetables en masse, et une
base de contacts dont les bounces dégradent la délivrabilité du domaine.

Le flux reprend le moule de `password_reset_tokens` : jeton en clair envoyé par
e-mail, **hash SHA-256 stocké**, expiration à
`EMAIL_VERIFICATION_TOKEN_TTL_HOURS` (24 h,
`shared/constants/email_verification.ts`).

| Route                               | Accès                                                 | Rôle                                   |
| ----------------------------------- | ----------------------------------------------------- | -------------------------------------- |
| `GET /verify-email`                 | auth                                                  | Écran de rappel, adresse et renvoi     |
| `POST /verify-email/resend`         | auth + `emailVerificationResendThrottle` (5 / 10 min) | Renvoie un lien, invalide le précédent |
| `GET /verify-email/confirm?token=…` | **public** + `authThrottle`                           | Consomme le lien                       |

#### Pourquoi la confirmation est publique

Le lien arrive par e-mail et rien ne dit que la session est encore ouverte dans
le navigateur qui l'ouvre. Exiger d'être connecté renverrait sur `/login` **en
perdant le jeton** — le piège de #770. Le jeton prouve à lui seul la possession
de l'adresse. La route est aussi hors du groupe `guest()`, pour qu'un
utilisateur déjà connecté qui clique puisse confirmer au lieu d'être renvoyé sur
son dashboard.

La redirection vers `/login` passe par `withQs(false)` : sans lui,
`redirect().toPath()` reporte la query string entrante et le jeton se
retrouverait dans `/login?token=…`, donc dans l'historique du navigateur et dans
le `Referer` envoyé aux ressources de la page de connexion. Même fuite que celle
corrigée en #770 — un test la couvre.

#### Portée du blocage

C'est le choix produit de l'issue, et il est délibérément intermédiaire :
**l'app reste accessible sans vérification**, seules les actions qui engagent un
tiers ou de l'argent attendent. Bloquer tout casserait l'essai immédiat que
l'inscription sans friction cherche à offrir ; ne rien bloquer rendrait la
vérification décorative.

`middleware.requireVerifiedEmail()` (`app/middleware/require_verified_email_middleware.ts`)
garde quatre routes :

| Route                                                           | Pourquoi                                              |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| `POST /organization/invitations`                                | l'adresse d'un tiers reçoit un e-mail à notre nom     |
| `POST /invoices/:id/send`                                       | met du courrier à notre nom dans la boîte d'un client |
| `POST /boats/:boatId/reservations/:reservationId/contract/send` | idem                                                  |
| `POST /settings/billing/checkout`                               | engage de l'argent                                    |

`POST /settings/billing/portal` reste **ouvert** : un client déjà payant doit
pouvoir gérer son abonnement, y compris le résilier.

Le rappel passe par `EmailVerificationBanner.vue`, monté dans le layout
applicatif et piloté par le booléen `user.emailVerified` de la prop partagée —
un booléen, pas la date : le front n'a besoin que de savoir s'il doit afficher
la bannière. Sans ce rappel, l'utilisateur découvrirait la garde au moment
d'envoyer sa première facture, sans savoir quoi faire.

#### Comptes antérieurs

La migration les marque **vérifiés**. Ce n'est pas une preuve rétroactive :
c'est le seul choix qui ne casse pas des comptes en service derrière une garde
qu'ils n'ont jamais eu l'occasion de franchir. La garde ne s'applique donc
qu'aux inscriptions postérieures. `UserFactory` fait de même — un utilisateur de
fabrique représente un compte établi, et la garde ne doit pas surgir dans des
tests qui n'ont rien à voir avec elle ; un compte fraîchement inscrit se
construit en remettant `emailVerifiedAt` à `null`.

Couverture : `tests/functional/auth/email_verification.spec.ts` (lien valide,
expiré, déjà consommé, inconnu, sans session ouverte, renvoi qui invalide le
précédent, renvoi indiscernable sur une adresse déjà vérifiée, les deux faces de
la garde).

### Réinitialisation du mot de passe : le jeton hors de l'URL (#770)

Le lien envoyé par e-mail porte le jeton en query string — c'est un lien. Ce
qui est corrigé, c'est qu'il n'y **reste** pas :

- `GET /reset-password?token=…` range le jeton en session
  (`PASSWORD_RESET_TOKEN_SESSION_KEY`, `shared/constants/auth.ts`) et rejoue la
  page **sans query string** ; le formulaire le reçoit en prop et le poste dans
  le corps de la requête. `update` l'oublie de la session une fois consommé.
- `GuestMiddleware` redirige désormais avec `.withQs(false)`. Un utilisateur
  déjà connecté qui clique sur son lien atterrissait sur
  `/dashboard?token=<jeton encore valide>` — donc dans l'historique, dans les
  journaux d'accès du reverse proxy, et dans le `Referer` des sous-requêtes de
  la page (la CSP autorise `res.cloudinary.com` en `imgSrc`).
- `SecurityHeadersMiddleware` (`server.use`, pas Shield, que le kernel retire
  en test) pose `Referrer-Policy: strict-origin-when-cross-origin` sur toutes
  les réponses. Défense indépendante, qui couvre aussi les jetons
  d'invitation — eux aussi en query string.

⚠️ `config/app.ts` garde `forwardQueryString: true` en global. Toute nouvelle
redirection depuis une route qui porte un paramètre sensible doit donc s'en
extraire explicitement avec `.withQs(false)`.

### Login

- `GET /login` (guest-only)
  - Controller: `app/controllers/session_controller.ts` → `create`
  - Page: `inertia/pages/auth/login.vue`
- `POST /login` (guest-only)
  - Controller: `SessionController.store`
  - `User.verifyCredentials(email, password)`
  - `auth.use('web').login(user)`
  - `session.forget('demoSessionStartedAt')` — voir « Session démo » ci-dessous
  - Redirect: route `home`

### Logout

- `POST /logout` (auth-only)
  - Controller: `SessionController.destroy`
  - `auth.use('web').logout()`
  - `session.forget('demoSessionStartedAt')` — voir « Session démo » ci-dessous
  - Redirect: route `session.create`

### Session démo

`POST /demo` (`DemoController.login`) connecte le compte `DEMO_EMAIL` et pose
`demoSessionStartedAt` en session ; `CheckDemoSessionMiddleware` déconnecte au-delà de
`DEMO_SESSION_DURATION_MS`, et `inertia_middleware` partage `demoSessionStartedAt` /
`demoSessionDurationMs` pour la bannière `DemoSessionBanner.vue`.

Invariants (#451) — `auth.logout()` ne vide pas la session, la clé doit donc être purgée
explicitement, sinon la bannière suit la session navigateur sur les comptes réels :

- la clé est oubliée au logout (`SessionController.destroy`), au login
  (`SessionController.store`) et à l'expiration (`CheckDemoSessionMiddleware`) ;
- `inertia_middleware` ne la partage que si `DemoService.isDemoUser(auth.user.email)`.

Couverture : `tests/functional/auth/demo_session_leak.spec.ts`.

## Home vs dashboard

Référence: `app/controllers/home_controller.ts`.

- non-auth → render Inertia `home`
- auth → render Inertia `dashboard` avec data du `DashboardService`

## ACL (Bouncer + Policies)

Références:

- Policies: `app/policies/*.ts` (19 fichiers, un par ressource)
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

| Ressource                  | Capacités partagées (admin + member)                                                      | Capacités admin-only                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Organisation               | `members.view`, `invitations.view`, `audit_log.view`                                      | `members.manage`, `invitations.manage`, `ai.configure`, `branding.configure`, `import.run` |
| Bateaux                    | `boats.view`, `boats.create`, `boats.edit`, `boats.manage`, `boats.reservations.delete`\* | `boats.delete`                                                                             |
| Clients                    | `clients.create`, `clients.update`                                                        | `clients.delete`                                                                           |
| Équipage                   | `crew.create`, `crew.update`                                                              | `crew.delete`                                                                              |
| Carnet de bord / carburant | `navigation_logs.create`, `navigation_logs.update`, `fuel_logs.create`                    | `navigation_logs.delete`, `fuel_logs.delete`                                               |
| Incidents                  | `incidents.view`, `incidents.create`, `incidents.edit`                                    | `incidents.delete`                                                                         |
| Entretien                  | `maintenance.view`, `maintenance.create`, `maintenance.edit`                              | `maintenance.delete`                                                                       |
| Factures/devis             | `invoices.create`, `invoices.update`                                                      | `invoices.delete`                                                                          |
| Tarification               | `pricing_seasons.create`, `pricing_seasons.update`                                        | `pricing_seasons.delete`                                                                   |
| Spots                      | `spots.view`, `spots.create`, `spots.edit`                                                | `spots.delete`                                                                             |
| Ports                      | `ports.view`                                                                              | `ports.create`, `ports.edit`, `ports.delete` ⚠                                             |
| Mouillages                 | `mouillages.view`                                                                         | `mouillages.create`, `mouillages.edit`, `mouillages.delete` ⚠                              |
| Abonnement                 | `subscription.view`                                                                       | `subscription.manage`                                                                      |
| Simulateur                 | —                                                                                         | `simulator.manage_leads`                                                                   |

`import.run` garde l'import CSV (`/settings/import`) depuis #715 : admin seul, **aligné sur `maintenance.delete` et non sur `maintenance.create`**. L'import écrit en masse dans l'historique d'entretien, que seul un admin peut ensuite corriger — un `mechanic` pouvait jusque-là écrire un historique qu'il ne pouvait pas défaire, et un `boat_owner`, qui n'a aucune capability, en faisait autant. S'y ajoute une garde de plan (Entreprise, `PlanQuotas.canImport`), vérifiée **avant** la capability : sur une organisation qui n'a pas l'import du tout, l'upsell vers la facturation dit plus qu'un 403 de rôle. Les **exports** de la même page ne sont pas concernés — ils s'arrêtent à `canExport` (Pro et Entreprise, tous rôles), et c'est pourquoi `show` reste ouvert avec une prop `canImport` plutôt que fermé.

`*` `boats.reservations.delete` porte en plus une règle métier propre à la ressource : un member ne peut supprimer que les réservations **non confirmées** (`reservation.status !== 'confirmed'`), vérifiée après la capacité dans `BoatPolicy.deleteReservation`.

Les places (`spots.*`) sont lues par `SpotPolicy` depuis #719 : un member crée et renomme une place, seul l'admin la supprime. L'infrastructure qui les porte — ports, pontons, mouillages et leurs positions — reste sous `PortPolicy`, donc admin-only (voir `⚠` ci-dessous).

`⚠` Ports et Mouillages sont **admin-only sur create/edit/delete** (contrairement à toutes les autres ressources, où member peut créer/éditer et seul delete est admin-only). C'est un choix hérité, préservé tel quel lors de l'introduction des capacités — pas encore tranché s'il s'agit d'une règle métier voulue ou d'un oubli historique. `PortPolicy.edit/delete` et `MouillagePolicy.edit/delete` vérifient malgré tout `sameOrg` (comme `view`) en plus de la capacité, par défense en profondeur : le jour où `ports.edit`/`mouillages.edit` seraient déplacées vers les capacités partagées, l'isolation multi-tenant reste garantie sans action supplémentaire.

### Mécanisme (comment une Policy vérifie une capacité)

Toutes les policies org-scopées héritent de `OrgScopedPolicy` (`app/utils/org_scoped_policy.ts`) :

```ts
export default abstract class OrgScopedPolicy extends BasePolicy {
  async before(user: User, _action: string, ...resources: unknown[]) {
    if (!user.organizationId) return
    // Non-admin : le hook ne tranche pas, la méthode de policy décide
    if (!(await user.isAdminOf(user.organizationId))) return
    // Un admin de son org court-circuite tout — sauf sur une ressource étrangère
    return resources.every((resource) => !this.isForeignResource(user, resource))
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

**`before()` lit la ressource (#690).** Bouncer transmet l'action et ses arguments au hook — `before(user, action, ...args)` — et un retour booléen **court-circuite entièrement** la méthode de policy. Tant que la signature ne lisait que `user`, un admin de l'org A franchissait `bouncer.with(PortPolicy).authorize('edit', portDeB)` sans que `sameOrg` soit jamais atteint : le point de vigilance signalé ici était réel, seulement masqué par le scoping des Services. Il est refermé — la couche policy refuse désormais elle-même.

La règle : **refuser seulement sur une ressource prouvablement étrangère**. Le hook lit l'organisation sous deux formes — la colonne `organizationId` directe, et la relation `port` chargée (`Mouillage` et `Pontoon` n'ont pas de colonne propre ; `Spot`, lui, porte un `organization_id` `NOT NULL` depuis la création de la table et se compare donc directement). Quand elle n'est pas lisible — argument absent, payload de validation, relation non préchargée — l'admin passe comme avant. Refuser sur le doute ferait retomber l'admin sur la méthode de policy, qui refuserait un `Mouillage` dont le `port` n'est pas préchargé : un 403 tout neuf sur un chemin aujourd'hui autorisé.

⚠️ Corollaire pour les tests : `before()` n'est **jamais** exécuté quand on instancie une policy à la main (`new BoatPolicy().edit(...)`). Un test qui procède ainsi vérifie `sameOrg`, pas l'autorisation réelle. Ce qu'un admin obtient vraiment se teste à travers un vrai `Bouncer` — `tests/integration/permissions/policy_before_hook.spec.ts`.

`app/utils/org_scoped_policy.ts` vit **hors** de `app/policies/` intentionnellement : `indexPolicies()` (hook `adonisrc.ts`) indexe tout fichier `.ts` du dossier `app/policies/` comme une policy concrète instanciable — une classe abstraite placée là casserait la génération de `#generated/policies`.

### Ajouter une nouvelle capacité

1. Ajouter la valeur au type `Capability` dans `shared/types/permissions.ts`
2. L'ajouter à `MEMBER_CAPABILITIES` (si member+admin) ou `ADMIN_ONLY_CAPABILITIES` (si admin seul)
3. Utiliser `this.can(user, 'ma.capacite')` dans la Policy concernée
4. Étendre `tests/unit/permissions_taxonomy.spec.ts` et `tests/integration/permissions/policies_capabilities.spec.ts`
5. Déclarer l'action dans le spec unit de la policy (`tests/unit/policies/<policy>.spec.ts`) — la garde `tests/unit/hygiene/policies_covered.spec.ts` échoue si une action publique n'y est nommée nulle part

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
