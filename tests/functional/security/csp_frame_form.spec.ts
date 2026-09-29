import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import ShieldMiddleware from '@adonisjs/shield/shield_middleware'
import SessionMiddleware from '@adonisjs/session/session_middleware'

/**
 * CSP `frame-ancestors` / `form-action` (#779).
 *
 * `start/kernel.ts` retire Shield du pipeline en test : le client HTTP ne
 * voit jamais l'en-tête. On rejoue le vrai middleware, construit par son
 * provider depuis `config/shield.ts`, sur un contexte GET — précédé du
 * middleware de session dont dépend le garde CSRF. Hors production la CSP
 * est en `reportOnly`, d'où l'en-tête lu.
 */
const CSP_HEADER = app.inProduction
  ? 'content-security-policy'
  : 'content-security-policy-report-only'

function directive(header: string, name: string): string {
  const found = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `))

  return found ?? ''
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

test.group('CSP — frame-ancestors et form-action (#779)', () => {
  test("l'en-tête CSP porte frame-ancestors 'none' et form-action 'self'", async ({ assert }) => {
    const header = await cspHeader()

    assert.isNotEmpty(header)
    assert.include(directive(header, 'frame-ancestors'), "'none'")
    assert.include(directive(header, 'form-action'), "'self'")
  })
})
