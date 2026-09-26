import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import type { HttpContext } from '@adonisjs/core/http'
import ShieldMiddleware from '@adonisjs/shield/shield_middleware'
import SessionMiddleware from '@adonisjs/session/session_middleware'

/**
 * CSP par nonce (repéré dans #828) : `config/shield.ts` déclarait
 * `'nonce-{{nonce}}'` dans `script-src` / `style-src`. Shield ne connaît que
 * le mot-clé `@nonce` ; le placeholder partait tel quel dans l'en-tête, que
 * Chromium rejetait comme source invalide — et l'unique script inline du
 * layout (anti-FOUC du thème) était bloqué en production.
 *
 * `start/kernel.ts` retire Shield du pipeline en test : le client HTTP ne
 * voit donc jamais cet en-tête. On rejoue ici le vrai middleware, construit
 * par son provider à partir de `config/shield.ts`, sur un contexte de
 * requête GET — précédé du middleware de session dont dépend le garde CSRF.
 * Hors production la CSP est en `reportOnly`, d'où l'en-tête lu.
 */
const CSP_HEADER = app.inProduction
  ? 'content-security-policy'
  : 'content-security-policy-report-only'

const NONCE_SOURCE = /'nonce-([A-Za-z0-9_-]+)'/

function directive(header: string, name: string): string {
  const found = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `))

  return found ?? ''
}

async function runShield(): Promise<{ ctx: HttpContext; header: string }> {
  const ctx = await testUtils.createHttpContext()
  ctx.request.request.method = 'GET'
  ctx.request.request.url = '/en'

  const session = await app.container.make(SessionMiddleware)
  const shield = await app.container.make(ShieldMiddleware)
  await session.handle(ctx, () => shield.handle(ctx, async () => {}))

  const header = ctx.response.response.getHeader(CSP_HEADER)
  return { ctx, header: typeof header === 'string' ? header : '' }
}

test.group('CSP — nonce Shield (#828)', () => {
  test("l'en-tête CSP porte un nonce réel dans script-src et style-src", async ({ assert }) => {
    const { header } = await runShield()

    assert.isNotEmpty(header)
    assert.notInclude(header, '{{nonce}}')
    assert.notInclude(header, '@nonce')

    const scriptSrc = directive(header, 'script-src')
    const styleSrc = directive(header, 'style-src')
    assert.match(scriptSrc, NONCE_SOURCE)
    assert.match(styleSrc, NONCE_SOURCE)
    assert.include(scriptSrc, "'self'")
    assert.include(styleSrc, "'self'")
  })

  test("le nonce de l'en-tête est celui exposé à Edge sous `cspNonce`", async ({ assert }) => {
    const { ctx, header } = await runShield()

    const nonce = directive(header, 'script-src').match(NONCE_SOURCE)?.[1]
    assert.isString(nonce)
    assert.equal(ctx.response.nonce, nonce)
    // C'est cette valeur que `inertia_layout.edge` pose en `nonce="{{ cspNonce }}"`.
    const rendered = await ctx.view.renderRaw('{{ cspNonce }}')
    assert.equal(rendered.trim(), nonce)
  })

  test('le nonce change à chaque requête', async ({ assert }) => {
    const first = await runShield()
    const second = await runShield()

    const firstNonce = first.header.match(NONCE_SOURCE)?.[1]
    const secondNonce = second.header.match(NONCE_SOURCE)?.[1]

    assert.isString(firstNonce)
    assert.isString(secondNonce)
    assert.notEqual(firstNonce, secondNonce)
  })
})
