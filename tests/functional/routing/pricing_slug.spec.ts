import { test } from '@japa/runner'

test.group('Pricing slug (#475)', () => {
  test('GET /en/pricing renders the pricing page', async ({ client }) => {
    const response = await client.get('/en/pricing').withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ component: 'marketing/pricing' })
  })

  test('GET /fr/tarifs renders the pricing page', async ({ client }) => {
    const response = await client.get('/fr/tarifs').withInertia()

    response.assertStatus(200)
    response.assertBodyContains({ component: 'marketing/pricing' })
  })

  test('GET /en/tarifs redirects permanently to /en/pricing', async ({ client }) => {
    const response = await client.get('/en/tarifs').redirects(0)

    response.assertStatus(301)
    response.assertHeader('location', '/en/pricing')
  })
})
