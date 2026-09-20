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

  // --- #771 : « je n'ai pas pu vérifier » n'est plus « autorisé » ---

  test('an admin on an unreadable resource falls through to the policy method', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    // Relation `port` non préchargée : le hook ne peut pas lire l'organisation.
    //
    // ⚠️ Ce test assertait l'inverse jusqu'à #771 : le hook traitait une
    // ressource illisible comme « non étrangère », donc l'autorisait, et ne
    // distinguait pas « rien à vérifier » de « je n'ai pas pu vérifier ».
    // Il ne tranche plus : c'est `MouillagePolicy.edit` qui décide, et
    // `sameOrgViaPort` refuse faute de relation.
    const mouillage = { portId: 12 } as never

    assert.isFalse(await bouncerFor(admin).with(MouillagePolicy).allows('edit', mouillage))
  })

  test('an admin on a preloaded resource of their own organization is still granted', async ({
    assert,
  }) => {
    // Le témoin de la régression que le refus-sur-le-doute pourrait causer :
    // précharger la relation suffit à retrouver le laissez-passer admin.
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')
    const mouillage = { port: { organizationId: org.id } } as never

    assert.isTrue(await bouncerFor(admin).with(MouillagePolicy).allows('edit', mouillage))
  })

  test('an action with no resource at all still grants the admin', async ({ assert }) => {
    // « Rien à vérifier » reste distinct de « je n'ai pas pu vérifier » : les
    // actions sans cible (`create`, `viewMembers`…) doivent continuer à
    // passer, sans quoi #771 casserait la moitié des écrans d'administration.
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')

    assert.isTrue(await bouncerFor(admin).with(PortPolicy).allows('create'))
  })

  test('one unreadable resource among several is enough to stop deciding', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const admin = await userWithRole(org.id, 'admin')

    // Un argument illisible à côté d'un argument parfaitement légitime : le
    // hook ne doit pas conclure sur la seule foi du second. L'ancienne
    // version répondait `true` — `every(non étrangère)` — et la méthode de
    // policy n'était jamais atteinte.
    const unreadable = { portId: 12 } as never
    const readable = { port: { organizationId: org.id } } as never

    assert.isFalse(
      await bouncerFor(admin).with(MouillagePolicy).allows('edit', unreadable, readable)
    )
  })

  test('a foreign resource still wins over an unreadable one', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const outsiderAdmin = await userWithRole(otherOrg.id, 'admin')

    const foreign = { port: { organizationId: org.id } } as never
    const unreadable = { portId: 12 } as never

    assert.isFalse(
      await bouncerFor(outsiderAdmin).with(MouillagePolicy).allows('edit', foreign, unreadable)
    )
  })

  test('the boat relation is a readable form too', async ({ assert }) => {
    // Troisième forme reconnue par `organizationIdOf` : les ressources
    // rattachées à un bateau n'ont pas de colonne `organization_id`.
    const org = await OrganizationFactory.create()
    const otherOrg = await OrganizationFactory.create()
    const outsiderAdmin = await userWithRole(otherOrg.id, 'admin')
    const resource = { boat: { organizationId: org.id } } as never

    assert.isFalse(await bouncerFor(outsiderAdmin).with(PortPolicy).allows('edit', resource))
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
