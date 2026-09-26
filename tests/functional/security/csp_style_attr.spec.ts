import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import ShieldMiddleware from '@adonisjs/shield/shield_middleware'
import SessionMiddleware from '@adonisjs/session/session_middleware'

/**
 * CSP et attributs `style` (#831) : un nonce ne couvre que les balises
 * `<style>` — Chromium évalue les attributs `style="…"` via `style-src-attr`,
 * qui retombe sur `style-src`. Or le SSR d'Inertia sérialise chaque `:style`
 * de Vue (jauges, barres de progression, positions de carte) en attribut : en
 * production, tout ce HTML arrivait sans style jusqu'au rendu client.
 *
 * `start/kernel.ts` retire Shield du pipeline en test : le client HTTP ne voit
 * jamais l'en-tête. On rejoue donc le vrai middleware, construit par son
 * provider depuis `config/shield.ts`, sur un contexte GET — précédé du
 * middleware de session dont dépend le garde CSRF. Hors production la CSP est
 * en `reportOnly`, d'où l'en-tête lu.
 */
const CSP_HEADER = app.inProduction
  ? 'content-security-policy'
  : 'content-security-policy-report-only'

function directive(header: string, name: string): string | undefined {
  return header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `))
}

async function cspHeader(): Promise<string> {
  const ctx = await testUtils.createHttpContext()
  ctx.request.request.method = 'GET'
  ctx.request.request.url = '/en'

  const session = await app.container.make(SessionMiddleware)
  const shield = await app.container.make(ShieldMiddleware)
  await session.handle(ctx, () => shield.handle(ctx, async () => {}))

  const header = ctx.response.response.getHeader(CSP_HEADER)
  return typeof header === 'string' ? header : ''
}

test.group('CSP — attributs style (#831)', () => {
  test('style-src-attr autorise les attributs style inline sérialisés par le SSR', async ({
    assert,
  }) => {
    const header = await cspHeader()

    assert.isNotEmpty(header)
    assert.equal(directive(header, 'style-src-attr'), "style-src-attr 'unsafe-inline'")
  })

  test("la relaxation ne s'étend ni aux balises <style> ni aux scripts", async ({ assert }) => {
    const header = await cspHeader()

    const styleSrc = directive(header, 'style-src')
    assert.isString(styleSrc)
    assert.include(styleSrc, "'self'")
    assert.notInclude(styleSrc, "'unsafe-inline'")
    assert.notInclude(styleSrc, "'unsafe-hashes'")

    const scriptSrc = directive(header, 'script-src')
    assert.isString(scriptSrc)
    assert.notInclude(scriptSrc, "'unsafe-inline'")
    assert.isUndefined(directive(header, 'script-src-attr'))
  })
})
