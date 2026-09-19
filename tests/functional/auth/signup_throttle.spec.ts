import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Organization from '#models/organization'
import User from '#models/user'

/**
 * Le limiteur de `POST /signup` (#766).
 *
 * Les quatre POST du groupe `guest()` sont sous la même garde ; trois portaient
 * `authThrottle`, le quatrième — celui qui **écrit** un utilisateur, une
 * organisation, une adhésion, et déclenche les effets de bord du parcours de
 * création — n'avait rien. C'était la seule route publique d'écriture du repo
 * sans limiteur.
 *
 * Deux choses sont mesurées ici, et la seconde compte autant que la première :
 * au-delà du débit, **aucune ligne n'est créée**. Un limiteur qui refuse après
 * l'écriture ne borne rien.
 */

/** Débit déclaré dans `start/limiter.ts` — la borne mesurée ici. */
const SIGNUP_LIMIT = 5

function signupForm(overrides: Record<string, string> = {}) {
  return {
    firstName: 'Marie',
    lastName: 'Curie',
    email: 'marie@example.com',
    password: 'Password123!',
    organizationName: 'Marina Bleue',
    organizationType: 'marina',
    fleetSize: '5-20',
    acceptTerms: 'on',
    ...overrides,
  }
}

test.group('Auth signup throttle (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('refuses past its quota and creates nothing', async ({ client, assert }) => {
    for (let index = 0; index < SIGNUP_LIMIT; index += 1) {
      const passing = await client
        .post('/signup')
        .form(signupForm({ email: `marie${index}@example.com` }))
        .redirects(0)
      passing.assertStatus(302)
    }

    const refused = await client
      .post('/signup')
      .form(signupForm({ email: 'de-trop@example.com' }))
      .redirects(0)

    refused.assertStatus(302)

    assert.isNull(
      await User.findBy('email', 'de-trop@example.com'),
      'la requête refusée a tout de même créé un utilisateur'
    )
    assert.lengthOf(
      await User.all(),
      SIGNUP_LIMIT,
      'le limiteur doit refuser avant le contrôleur, pas après'
    )
    assert.lengthOf(await Organization.all(), SIGNUP_LIMIT)
  })

  test('the refusal is a flash redirect, not a bare 429', async ({ client, assert }) => {
    // Une 429 brute sur un formulaire pleine page est un cul-de-sac : le
    // visiteur perd sa saisie devant une page d'erreur du framework.
    for (let index = 0; index < SIGNUP_LIMIT; index += 1) {
      await client
        .post('/signup')
        .form(signupForm({ email: `marie${index}@example.com` }))
        .redirects(0)
    }

    const refused = await client
      .post('/signup')
      .form(signupForm({ email: 'de-trop@example.com' }))
      .redirects(0)

    refused.assertStatus(302)
    assert.notEqual(refused.status(), 429)
  })

  test('a normal signup is untouched by the limiter', async ({ client }) => {
    // Le témoin : sans lui, un limiteur réglé à zéro passerait pour un succès.
    const response = await client.post('/signup').form(signupForm())

    response.assertRedirectsTo('/dashboard')
  })
})
