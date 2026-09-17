import { ROLE_PERMISSIONS } from '#shared/types/permissions'
import type User from '#models/user'
import type { Capability } from '#shared/types/permissions'
import type { OrgRole } from '#shared/types/organization'

/**
 * Faux utilisateurs pour les specs unit de policy (#690).
 *
 * Une policy ne touche jamais la base : `OrgScopedPolicy.can()` ne lit que
 * `user.organizationId` et appelle `user.hasPermission()`. Tous les modèles y
 * sont importés en `import type`, donc effacés à la compilation. Un littéral
 * suffit — d'où des specs de policy en suite `unit`, sans Postgres.
 *
 * Le rôle est adossé au **vrai** `ROLE_PERMISSIONS` plutôt qu'à des listes
 * recopiées : si `boats.delete` est renommée ou sort du rôle `member`, les
 * specs le disent au lieu de continuer à valider une capability fantôme.
 *
 * ⚠️ `policyUser(id, 'admin')` teste les **capabilities** d'un admin, pas son
 * laissez-passer `before()` — ce hook n'est exécuté que par Bouncer, et sa
 * couverture vit dans `tests/integration/permissions/policy_before_hook.spec.ts`.
 */

function fakeUser(organizationId: number | null, capabilities: ReadonlySet<Capability>): User {
  return {
    organizationId,
    async hasPermission(orgId: number, capability: Capability) {
      // `can()` n'interroge jamais que l'organisation de l'utilisateur ; on
      // reproduit la garde du vrai modèle plutôt que de l'ignorer.
      return orgId === organizationId && capabilities.has(capability)
    },
  } as unknown as User
}

/** Utilisateur d'une organisation, avec les capabilities réelles de son rôle. */
export function policyUser(organizationId: number, role: OrgRole): User {
  return fakeUser(organizationId, ROLE_PERMISSIONS[role])
}

/**
 * Utilisateur ne détenant **que** les capabilities listées. Sert à isoler une
 * action : prouver qu'une policy exige bien `spots.edit` et pas une capability
 * voisine que le rôle `member` porterait de toute façon.
 */
export function userWithCapabilities(organizationId: number, capabilities: Capability[]): User {
  return fakeUser(organizationId, new Set(capabilities))
}

/**
 * Utilisateur sans organisation (#279 : un compte peut exister avant d'en
 * rejoindre une). `can()` court-circuite à `false` — aucune policy scopée ne
 * doit rien lui accorder, même avec la capability.
 */
export function orphanUser(capabilities: Capability[] = []): User {
  return fakeUser(null, new Set(capabilities))
}
