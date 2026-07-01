import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'

const VALID_CSV = `date,title,subject,notes,engine_caption,sail_caption,cost
2024-01-15,Vidange moteur,Moteur,RAS,,,150
2024-02-20,Révision voile,Voilure,OK,,Grand-voile,0
`

test.group('CSV import preview (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /settings/import/preview redirige vers /settings/import pour un plan starter', async ({
    client,
  }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')
  })

  test('POST /settings/import/preview redirige vers /settings/import pour un plan pro', async ({
    client,
  }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'pro' })
    ).create()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: String(boat.id) })
      .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')
  })

  test('POST /settings/import/preview redirige vers /login si non authentifié', async ({
    client,
  }) => {
    const response = await client
      .post('/settings/import/preview')
      .fields({ type: 'maintenance', boatId: '1' })
      .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /settings/import/preview redirige avec erreur si le bateau est inconnu', async ({
    client,
  }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()

    const response = await client
      .post('/settings/import/preview')
      .loginAs(user)
      .fields({ type: 'maintenance', boatId: '999999' })
      .file('file', Buffer.from(VALID_CSV), { filename: 'import.csv', contentType: 'text/csv' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/settings/import')
  })
})
