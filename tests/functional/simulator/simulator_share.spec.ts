import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { SimulatorShareFactory } from '#database/factories/simulator_share_factory'

test.group('Simulator share (functional)', (group) => {
  group.each.setup(() => truncateDb())

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

  /**
   * Un jeton périmé ou mal recopié renvoie au simulateur de la **route
   * empruntée** (#732). Les deux routes servent la même méthode ; avant, la
   * cible de repli était `/fr/…` pour les deux, et un visiteur anglophone
   * atterrissait sur la page française.
   */
  test('GET /simulateur/r/:token renvoie au simulateur FR sur un jeton inconnu', async ({
    client,
  }) => {
    const response = await client.get('/simulateur/r/token-invalide-inexistant').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/fr/simulateur-cout-entretien')
  })

  test('GET /simulator/r/:token renvoie au simulateur EN sur un jeton inconnu', async ({
    client,
  }) => {
    const response = await client.get('/simulator/r/token-invalide-inexistant').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/en/maintenance-cost-simulator')
  })
})
