import { test } from '@japa/runner'

test.group('Sitemap (functional)', () => {
  test('GET /sitemap.xml returns valid XML with all marketing URLs', async ({ client, assert }) => {
    const response = await client.get('/sitemap.xml')

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/xml; charset=utf-8')

    const xml = response.text()

    // Toutes les pages marketing indexables, dans les deux locales.
    const expectedUrls = [
      'https://fleetai.app/en',
      'https://fleetai.app/fr',
      'https://fleetai.app/en/tarifs',
      'https://fleetai.app/fr/tarifs',
      'https://fleetai.app/en/maintenance-cost-simulator',
      'https://fleetai.app/fr/simulateur-cout-entretien',
      'https://fleetai.app/en/boat-maintenance-cost',
      'https://fleetai.app/fr/cout-entretien-bateau',
      'https://fleetai.app/en/about',
      'https://fleetai.app/fr/a-propos',
      'https://fleetai.app/en/privacy',
      'https://fleetai.app/fr/confidentialite',
      'https://fleetai.app/contact',
      'https://fleetai.app/design-system',
    ]
    for (const url of expectedUrls) {
      assert.include(xml, `<loc>${url}</loc>`)
    }

    // Annotations hreflang (indexation multilingue) + x-default.
    assert.include(xml, 'xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    assert.include(xml, 'hreflang="en"')
    assert.include(xml, 'hreflang="fr"')
    assert.include(xml, 'hreflang="x-default"')
  })
})
