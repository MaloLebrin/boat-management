import { test } from '@japa/runner'
import { policyUser, orphanUser, userWithCapabilities } from '#tests/support/policy_user'
import type { Capability } from '#shared/types/permissions'
import type { OrgRole } from '#shared/types/organization'

/**
 * La matrice commune aux policies scopées organisation (#690).
 *
 * Les 19 policies posent toutes la même question sous des noms différents :
 * « cette capability, dans cette organisation ». Écrire les quatre mêmes
 * assertions à la main dans 19 fichiers produirait ~1 900 lignes de copies —
 * et c'est dans les copies qu'un cas finit par manquer sans que ça se voie.
 *
 * Chaque spec **déclare** donc ses actions, et ce module génère un test nommé
 * par action. Les particularités (arguments optionnels, règles métier,
 * résolution via une relation) ne passent pas par ici : elles restent écrites
 * en clair dans leur spec, où on peut les lire.
 */

export const ORG_ID = 1
export const OTHER_ORG_ID = 2

export interface PolicyAction {
  /** Nom de la méthode de policy. */
  name: string
  /** La capability que l'action doit exiger — et elle seule. */
  capability: Capability
  /**
   * Fabrique la ressource passée à l'action, pour l'organisation donnée.
   * Omise : l'action ne prend que l'utilisateur.
   */
  resource?: (organizationId: number) => unknown
  /** Rôles qui doivent obtenir l'action (vérifié via le vrai ROLE_PERMISSIONS). */
  allowedRoles?: OrgRole[]
  /** Rôles qui doivent se la voir refuser. */
  deniedRoles?: OrgRole[]
}

type PolicyMethod = (user: unknown, ...args: unknown[]) => Promise<unknown>

function invoke(policy: object, action: PolicyAction, user: unknown, organizationId: number) {
  const method = (policy as Record<string, PolicyMethod>)[action.name].bind(policy)
  return action.resource ? method(user, action.resource(organizationId)) : method(user)
}

/**
 * Génère, pour chaque action : la capability exigée, son refus sans elle,
 * l'isolation entre organisations, et le compte sans organisation.
 *
 * ⚠️ Ces tests instancient la policy en direct — donc **sans** le hook
 * `before()`, que seul Bouncer exécute. Ce qu'un admin obtient réellement se
 * décide dans `tests/integration/permissions/policy_before_hook.spec.ts`.
 */
export function testPolicyMatrix(
  groupName: string,
  makePolicy: () => object,
  actions: PolicyAction[]
) {
  test.group(groupName, () => {
    for (const action of actions) {
      test(`${action.name} requires ${action.capability}`, async ({ assert }) => {
        const holder = userWithCapabilities(ORG_ID, [action.capability])
        assert.isTrue(
          Boolean(await invoke(makePolicy(), action, holder, ORG_ID)),
          `${action.name} devrait être accordée avec ${action.capability}`
        )
      })

      test(`${action.name} is denied without ${action.capability}`, async ({ assert }) => {
        // Une seule capability manquante : prouve que l'action exige bien
        // celle-là, et pas une voisine que le rôle porterait de toute façon.
        const stranger = userWithCapabilities(ORG_ID, [])
        assert.isFalse(
          Boolean(await invoke(makePolicy(), action, stranger, ORG_ID)),
          `${action.name} devrait être refusée sans ${action.capability}`
        )
      })

      if (action.resource) {
        test(`${action.name} is denied on another organization's resource`, async ({ assert }) => {
          // L'utilisateur a la capability : seul le scope organisationnel peut
          // encore refuser. C'est l'isolation tenant, testée nue.
          const holder = userWithCapabilities(ORG_ID, [action.capability])
          assert.isFalse(
            Boolean(await invoke(makePolicy(), action, holder, OTHER_ORG_ID)),
            `${action.name} laisse fuir une ressource d'une autre organisation`
          )
        })
      }

      test(`${action.name} is denied for a user without an organization`, async ({ assert }) => {
        // Un compte peut exister avant de rejoindre une organisation (#279).
        const orphan = orphanUser([action.capability])
        assert.isFalse(
          Boolean(await invoke(makePolicy(), action, orphan, ORG_ID)),
          `${action.name} devrait être refusée à un compte sans organisation`
        )
      })

      for (const role of action.allowedRoles ?? []) {
        test(`${action.name} is granted to ${role}`, async ({ assert }) => {
          assert.isTrue(
            Boolean(await invoke(makePolicy(), action, policyUser(ORG_ID, role), ORG_ID)),
            `le rôle ${role} devrait obtenir ${action.name}`
          )
        })
      }

      for (const role of action.deniedRoles ?? []) {
        test(`${action.name} is denied to ${role}`, async ({ assert }) => {
          assert.isFalse(
            Boolean(await invoke(makePolicy(), action, policyUser(ORG_ID, role), ORG_ID)),
            `le rôle ${role} ne devrait pas obtenir ${action.name}`
          )
        })
      }
    }
  })
}

/** Une ressource portant directement l'organisation (le cas courant). */
export const orgResource = (organizationId: number) => ({ organizationId })

/** Une ressource dont l'organisation se lit sur son port (Mouillage, Pontoon, Spot). */
export const portScopedResource = (organizationId: number) => ({ port: { organizationId } })
