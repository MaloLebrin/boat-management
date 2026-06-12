import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { SimulatorShareFactory } from '#database/factories/simulator_share_factory'

test.group('Simulator share (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /simulateur/r/:token returns 200 with valid token', async ({ client }) => {
    const share = await SimulatorShareFactory.merge({ locale: 'fr' }).create()

    const response = await client.get(`/simulateur/r/${share.token}`)

    response.assertStatus(200)
  })

  test('GET /simulator/r/:token returns 200 with valid token (EN route)', async ({ client }) => {
    const share = await SimulatorShareFactory.merge({ locale: 'en' }).create()

    const response = await client.get(`/simulator/r/${share.token}`)

    response.assertStatus(200)
  })

  test('GET /simulateur/r/:token redirects when token is invalid', async ({ client }) => {
    const response = await client.get('/simulateur/r/token-invalide-inexistant').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/fr/simulateur-cout-entretien')
  })

  test('GET /simulator/r/:token redirects when token is invalid', async ({ client }) => {
    const response = await client.get('/simulator/r/token-invalide-inexistant').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/fr/simulateur-cout-entretien')
  })
})
