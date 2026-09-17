import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/** Contrat des pages transverses de navigation — journal, carburant, avaries (#689). */

test.group('Navigation pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /navigation/logbook renders navigation/logbook', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/navigation/logbook').loginAs(user).withInertia(),
      'navigation/logbook'
    )
  })

  test('GET /navigation/fuel renders navigation/fuel', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/navigation/fuel').loginAs(user).withInertia(),
      'navigation/fuel'
    )
  })

  test('GET /navigation/incidents renders navigation/incidents', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/navigation/incidents').loginAs(user).withInertia(),
      'navigation/incidents'
    )
  })
})
