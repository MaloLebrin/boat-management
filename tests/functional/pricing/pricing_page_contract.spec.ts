import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createCharterAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/** Contrat de la grille tarifaire saisonnière (#689). */

test.group('Pricing pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /pricing/seasons renders pricing/seasons/index', async ({ client, assert }) => {
    const user = await createCharterAdminUser()

    assertPageContract(
      assert,
      await client.get('/pricing/seasons').loginAs(user).withInertia(),
      'pricing/seasons/index'
    )
  })
})
