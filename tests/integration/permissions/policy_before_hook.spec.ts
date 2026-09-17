import { test } from '@japa/runner'
import { Bouncer } from '@adonisjs/bouncer'
import * as abilities from '#abilities/main'
import { policies } from '#generated/policies'
import type User from '#models/user'
import MouillagePolicy from '#policies/mouillage_policy'
import PortPolicy from '#policies/port_policy'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

/**
 * Le hook `before()` d'`OrgScopedPolicy`, tel que la production l'exécute (#690).
 *
 * C'est le seul fichier du dépôt qui passe par un **vrai `Bouncer`**, et c'est
 * délibéré : `before()` n'est **jamais** appelé quand on instancie une policy à
 * la main. Seul `PolicyAuthorizer#execute` l'invoque, et un retour booléen y
 * court-circuite entièrement la méthode de policy :
 *
 * ```js
 * hookResponse = await policyInstance.before(this.#user, action, ...args)
 * if (typeof hookResponse === "boolean" || …) return …   // la méthode n'est jamais atteinte
 * ```
 *
 * Conséquence : tous les `assert.isFalse(await new XPolicy().edit(admin, ressourceÉtrangère))`
 * des specs unit et de `policies_capabilities.spec.ts` testent un chemin d'appel
 * qui n'existe pas en production. Ils vérifient `sameOrg`, pas l'autorisation
 * réelle. Ce qu'un admin obtient vraiment se décide ici.
 *
 * Suite `integration` et non `unit` : `isAdminOf` fait une requête SQL.
 */

async function userWithRole(orgId: number, role: 'admin' | 'member'): Promise<User> {
  const user = await UserFactory.merge({ organizationId: orgId }).create()
  await OrganizationMembership.create({ userId: user.id, organizationId: orgId, role })
  return user
}

/** Un Bouncer identique à celui que monte `InitializeBouncerMiddleware`, sans HTTP. */
function bouncerFor(user: User) {
  return new Bouncer(() => user, abilities, policies)
}

test.group('OrgScopedPolicy.before — via un vrai Bouncer (integration)', () => {
  test('an admin is granted their own organization resources', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const port = { organizationId: org.id } as never

    assert.isTrue(await bouncerFor(admin).with(PortPolicy).allows('edit', port))
  })

  test('an admin is granted an action whose capability they lack', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')

    // `before()` rend `true` sans que `PortPolicy.create` ne soit exécutée : le
    // laissez-passer admin est bien un court-circuit, pas une capability de plus.
    assert.isTrue(await bouncerFor(admin).with(PortPolicy).allows('create'))
  })

  test('an admin of another organization is denied a foreign resource', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const outsiderAdmin = await userWithRole(otherOrg.id, 'admin')
    const port = { organizationId: org.id } as never

    // Le cœur de #690. `before(user)` ignorait `action` et `args` : un admin de
    // l'org B franchissait la couche policy sur une ressource de l'org A, et
    // seul le scoping des services en aval (`PortService.assertPortInUserOrg`)
    // rattrapait le coup. La défense en profondeur n'avait qu'une profondeur.
    assert.isFalse(await bouncerFor(outsiderAdmin).with(PortPolicy).allows('edit', port))
  })

  test('an admin of another organization is denied a foreign mouillage via its port', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const outsiderAdmin = await userWithRole(otherOrg.id, 'admin')
    // `Mouillage` n'a pas de colonne `organizationId` : son organisation se lit
    // sur la relation `port`.
    const mouillage = { port: { organizationId: org.id } } as never

    assert.isFalse(await bouncerFor(outsiderAdmin).with(MouillagePolicy).allows('edit', mouillage))
  })

  test('an admin keeps access when the resource carries no readable organization', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    // Relation `port` non préchargée : impossible de trancher. Le hook ne doit
    // pas refuser sur un doute — sinon tout appel qui ne précharge pas le port
    // se met à renvoyer 403 pour les admins, une régression silencieuse sur un
    // chemin aujourd'hui autorisé.
    const mouillage = { portId: 12 } as never

    assert.isTrue(await bouncerFor(admin).with(MouillagePolicy).allows('edit', mouillage))
  })

  test('a member falls through to the policy method', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const member = await userWithRole(org.id, 'member')
    const port = { organizationId: org.id } as never

    // `before()` ne tranche pas pour un non-admin : c'est `PortPolicy` qui
    // décide, capability par capability. `ports.view` appartient au rôle
    // `member`, `ports.delete` non.
    assert.isTrue(await bouncerFor(member).with(PortPolicy).allows('view', port))
    assert.isFalse(await bouncerFor(member).with(PortPolicy).allows('delete', port))
  })

  test('a user without an organization is denied', async ({ assert }) => {
    const orphan = await UserFactory.merge({ organizationId: null }).create()
    const port = { organizationId: 1 } as never

    assert.isFalse(await bouncerFor(orphan).with(PortPolicy).allows('view', port))
  })
})
