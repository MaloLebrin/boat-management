import { test } from '@japa/runner'

/**
 * Sonde Signal K du spike instruments de bord (#985) : `GET /dev/signalk-probe`
 * sert la page autonome `scripts/spike/signalk_probe.html` hors production, en
 * y substituant le nonce CSP. En test Shield est retiré du kernel : le nonce est
 * vide, mais le marqueur ne doit jamais rester dans la page.
 */
test.group('Dev — sonde Signal K (#985)', () => {
  test('la page est servie en HTML avec son script et sans marqueur de nonce', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/dev/signalk-probe')

    response.assertStatus(200)
    response.assertHeader('content-type', 'text/html; charset=utf-8')

    const html = response.text()
    assert.include(html, 'Sonde Signal K')
    assert.include(html, '/signalk/v1/stream')
    assert.include(html, '/signalk/v1/api/vessels/self')
    assert.notInclude(html, '__CSP_NONCE__')
  })
})
