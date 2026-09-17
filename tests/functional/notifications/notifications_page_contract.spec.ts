import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/** Contrat du centre de notifications (#689). */

test.group('Notifications page contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /notifications renders notifications/index', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/notifications').loginAs(user).withInertia(),
      'notifications/index'
    )
  })
})
