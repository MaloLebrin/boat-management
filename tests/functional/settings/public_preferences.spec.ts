import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { UserFactory } from '#database/factories/user_factory'
import User from '#models/user'

/**
 * `POST /locale` et `POST /theme` (#783).
 *
 * Les deux switchers sont servis avant authentification — pages marketing,
 * écran de login — et persistent la préférence sur le profil dès qu'une
 * session existe. C'étaient les deux seules routes publiques d'écriture de
 * l'app à n'avoir ni validateur VineJS ni limiteur.
 *
 * Le contrat de #414 / #403 est particulier et c'est lui que ce spec protège :
 * une valeur inconnue doit être **ignorée sans erreur**, pas rejetée. Un
 * validateur qui lève casserait le switcher sur les pages publiques, où
 * aucun formulaire Inertia n'affiche l'erreur de session. Le passage à
 * `tryValidate` ne doit donc rien changer de visible — d'où les deux premiers
 * tests, qui figent cette tolérance.
 */

/** Débit déclaré dans `start/limiter.ts` — la borne mesurée ici. */
const PREFERENCES_LIMIT = 30

test.group('Public preference switchers (functional)', (group) => {
  group.each.setup(() => truncateDb())

  // --- 1. le vocabulaire fermé, et sa tolérance ---

  test('POST /locale persists a known locale on the profile and in the cookie', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.with('organization').merge({ locale: 'en' }).create()

    const response = await client.post('/locale').loginAs(user).form({ locale: 'fr' }).redirects(0)

    response.assertStatus(302)
    assert.equal(response.cookie('locale')?.value, 'fr')

    await user.refresh()
    assert.equal(user.locale, 'fr')
  })

  test('POST /locale ignores an unknown locale without raising', async ({ client, assert }) => {
    const user = await UserFactory.with('organization').merge({ locale: 'en' }).create()

    const response = await client.post('/locale').loginAs(user).form({ locale: 'de' }).redirects(0)

    // Pas de 422 : le switcher vit sur des pages publiques sans formulaire
    // Inertia pour porter l'erreur.
    response.assertStatus(302)

    await user.refresh()
    assert.equal(user.locale, 'en', 'une valeur inconnue ne doit pas écraser la préférence')
  })

  test('POST /theme ignores an unknown preference without raising', async ({ client, assert }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client.post('/theme').loginAs(user).form({ theme: 'sepia' }).redirects(0)

    response.assertStatus(302)

    await user.refresh()
    assert.isNull(user.theme)
  })

  test('POST /theme persists a known preference on the profile', async ({ client, assert }) => {
    const user = await UserFactory.with('organization').create()

    const response = await client.post('/theme').loginAs(user).form({ theme: 'dark' }).redirects(0)

    response.assertStatus(302)
    assert.equal(response.cookie('theme')?.value, 'dark')

    await user.refresh()
    assert.equal(user.theme, 'dark')
  })

  // --- 2. sans session : le cookie, et rien d'autre ---

  test('an anonymous visitor gets the cookie and writes no row', async ({ client, assert }) => {
    const response = await client.post('/theme').form({ theme: 'dark' }).redirects(0)

    response.assertStatus(302)
    assert.equal(response.cookie('theme')?.value, 'dark')
    // Le témoin : `auth.check()` étant faux, aucun `UPDATE` ne part — et la
    // route reste servie, cookie compris.
    assert.lengthOf(await User.all(), 0)
  })

  // --- 3. le limiteur ---

  test('POST /theme refuses past its quota', async ({ client }) => {
    for (let index = 0; index < PREFERENCES_LIMIT; index += 1) {
      const passing = await client.post('/theme').form({ theme: 'dark' }).redirects(0)
      passing.assertStatus(302)
    }

    const refused = await client.post('/theme').form({ theme: 'dark' }).redirects(0)
    refused.assertStatus(429)
  })

  test('the two switchers share one counter, on purpose', async ({ client }) => {
    // Contrairement aux trois POST du simulateur, langue et thème partagent
    // délibérément leur budget : c'est le même geste d'interface, et 30/min
    // couvre largement les deux. Ce test fige la décision — si on veut les
    // séparer un jour, il faudra le dire ici.
    for (let index = 0; index < PREFERENCES_LIMIT; index += 1) {
      await client.post('/theme').form({ theme: 'dark' }).redirects(0)
    }

    const locale = await client.post('/locale').form({ locale: 'fr' }).redirects(0)
    locale.assertStatus(429)
  })
})
