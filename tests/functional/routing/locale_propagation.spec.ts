import { test } from '@japa/runner'

test.group('Locale propagation (functional)', () => {
  test('visiting a /fr/... page sets a locale=fr cookie', async ({ client, assert }) => {
    const response = await client.get('/fr/tarifs')

    response.assertStatus(200)
    assert.equal(response.cookie('locale')?.value, 'fr')
  })

  test('visiting a /en/... page sets a locale=en cookie', async ({ client, assert }) => {
    const response = await client.get('/en/tarifs')

    response.assertStatus(200)
    assert.equal(response.cookie('locale')?.value, 'en')
  })

  test('locale cookie set while browsing /fr/... propagates to unprefixed /login', async ({
    client,
    assert,
  }) => {
    const marketingResponse = await client.get('/fr/tarifs')
    const localeCookie = marketingResponse.cookie('locale')?.value

    const loginResponse = await client.get('/login').cookie('locale', localeCookie)

    loginResponse.assertStatus(200)
    assert.include(loginResponse.text(), '<html lang="fr">')
  })

  test('locale cookie is refreshed when navigating to the other locale prefix', async ({
    client,
    assert,
  }) => {
    const frResponse = await client.get('/fr/tarifs').cookie('locale', 'en')

    assert.equal(frResponse.cookie('locale')?.value, 'fr')
  })
})
