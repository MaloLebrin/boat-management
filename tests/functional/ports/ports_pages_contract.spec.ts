import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { PortFactory } from '#database/factories/port_factory'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Contrat des pages de cartographie de port (#689).
 *
 * Trois gardes se succèdent avant le contrôleur — plan Entreprise, profil
 * d'activité, capability `ports.create` — d'où `createEnterpriseAdminUser()`.
 * Avec un utilisateur sans membership, la redirection serait **suivie** et ces
 * tests recevraient un 200 sur `/dashboard` : l'épinglage du composant est ce
 * qui le rattraperait.
 */

test.group('Ports pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /ports renders ports/index', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/ports').loginAs(user).withInertia(),
      'ports/index'
    )
  })

  test('GET /ports/new renders ports/new', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/ports/new').loginAs(user).withInertia(),
      'ports/new'
    )
  })

  test('GET /ports/:id renders ports/show', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    assertPageContract(
      assert,
      await client.get(`/ports/${port.id}`).loginAs(user).withInertia(),
      'ports/show'
    )
  })

  test('GET /ports/:id/edit renders ports/edit', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const port = await PortFactory.merge({ organizationId: user.organizationId! }).create()

    assertPageContract(
      assert,
      await client.get(`/ports/${port.id}/edit`).loginAs(user).withInertia(),
      'ports/edit'
    )
  })
})
