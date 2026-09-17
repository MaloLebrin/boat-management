import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/** Contrat de la liste des clients (#689). */

test.group('Clients pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /clients renders clients/index', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/clients').loginAs(user).withInertia(),
      'clients/index'
    )
  })
})
