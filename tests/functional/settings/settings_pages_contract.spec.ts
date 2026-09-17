import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createAdminUser, createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertPageContract } from '#tests/support/inertia_page'

/**
 * Contrat des pages de réglages (#689).
 *
 * Sept écrans servis par trois contrôleurs, et aucun n'épinglait son composant.
 * C'est la famille où la confusion est la plus facile : toutes ces pages
 * partagent la même URL de base, le même layout et des props de forme voisine —
 * une erreur d'aiguillage y serait particulièrement discrète.
 *
 * `settings/me` ne reçoit rien (`inertia.render('settings/me', {})`) : son
 * contrat se réduit au composant, et c'est exact.
 */

test.group('Settings pages contract (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('GET /settings/me renders settings/me', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/settings/me').loginAs(user).withInertia(),
      'settings/me'
    )
  })

  test('GET /settings/org renders settings/org', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/settings/org').loginAs(user).withInertia(),
      'settings/org'
    )
  })

  test('GET /settings/members renders settings/members', async ({ client, assert }) => {
    const user = await createAdminUser()

    assertPageContract(
      assert,
      await client.get('/settings/members').loginAs(user).withInertia(),
      'settings/members'
    )
  })

  test('GET /settings/ai renders settings/ai', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/settings/ai').loginAs(user).withInertia(),
      'settings/ai'
    )
  })

  test('GET /settings/branding renders settings/branding', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/settings/branding').loginAs(user).withInertia(),
      'settings/branding'
    )
  })

  test('GET /settings/audit-log renders settings/audit_log', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/settings/audit-log').loginAs(user).withInertia(),
      'settings/audit_log'
    )
  })

  test('GET /settings/import renders settings/import', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    assertPageContract(
      assert,
      await client.get('/settings/import').loginAs(user).withInertia(),
      'settings/import'
    )
  })
})
