import { test } from '@japa/runner'

test.group('Contact page locale routes (functional)', () => {
  test('GET /en/contact renders in English', async ({ client, assert }) => {
    const response = await client.get('/en/contact')

    response.assertStatus(200)
    assert.include(response.text(), '<html lang="en">')
    assert.include(response.text(), 'Address')
  })

  test('GET /fr/contact renders in French', async ({ client, assert }) => {
    const response = await client.get('/fr/contact')

    response.assertStatus(200)
    assert.include(response.text(), '<html lang="fr">')
    assert.include(response.text(), 'Adresse')
  })

  test('bare GET /contact honors the locale carried by the cookie', async ({ client, assert }) => {
    const response = await client.get('/contact').cookie('locale', 'fr')

    response.assertStatus(200)
    assert.include(response.text(), '<html lang="fr">')
    assert.include(response.text(), 'Adresse')
  })
})
