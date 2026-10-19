import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import type { HttpContext } from '@adonisjs/core/http'
import ShieldMiddleware from '@adonisjs/shield/shield_middleware'
import SessionMiddleware from '@adonisjs/session/session_middleware'
import { applyInstrumentCsp } from '#utils/csp_connect_src'

/**
 * Extension de `connect-src` vers le serveur Signal K (#988, D2). Rejoue le
 * vrai `ShieldMiddleware` (retiré du kernel en test, cf. `csp_nonce.spec.ts`)
 * puis applique le helper comme le fait `BoatsController.show()`.
 */
const CSP_HEADER = app.inProduction
  ? 'content-security-policy'
  : 'content-security-policy-report-only'

const NONCE_SOURCE = /'nonce-([A-Za-z0-9_-]+)'/

function directive(header: string, name: string): string {
  return (
    header
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name} `)) ?? ''
  )
}

async function runShield(): Promise<{ ctx: HttpContext; header: () => string }> {
  const ctx = await testUtils.createHttpContext()
  ctx.request.request.method = 'GET'
  ctx.request.request.url = '/en'

  const session = await app.container.make(SessionMiddleware)
  const shield = await app.container.make(ShieldMiddleware)
  await session.handle(ctx, () => shield.handle(ctx, async () => {}))

  return {
    ctx,
    header: () => {
      const value = ctx.response.response.getHeader(CSP_HEADER)
      return typeof value === 'string' ? value : ''
    },
  }
}

test.group('CSP — connect-src des instruments (#988)', () => {
  test('ouvre connect-src vers l’origine de la source, nonce et reste intacts', async ({
    assert,
  }) => {
    const { ctx, header } = await runShield()
    const before = header()
    assert.equal(directive(before, 'connect-src'), "connect-src 'self'")

    applyInstrumentCsp(ctx, { baseUrl: 'https://signalk.example:3443' }, { allowInsecure: false })

    const after = header()
    assert.equal(
      directive(after, 'connect-src'),
      "connect-src 'self' https://signalk.example:3443 wss://signalk.example:3443"
    )
    assert.equal(directive(after, 'script-src'), directive(before, 'script-src'))
    assert.equal(directive(after, 'style-src'), directive(before, 'style-src'))
    assert.equal(directive(after, 'script-src').match(NONCE_SOURCE)?.[1], ctx.response.nonce)
  })

  test('hors production : http et ws sont aussi ouverts', async ({ assert }) => {
    const { ctx, header } = await runShield()

    applyInstrumentCsp(ctx, { baseUrl: 'http://192.168.1.20:3000' }, { allowInsecure: true })

    const connect = directive(header(), 'connect-src')
    assert.include(connect, 'http://192.168.1.20:3000')
    assert.include(connect, 'ws://192.168.1.20:3000')
  })

  test('sans source, l’en-tête reste celui de Shield', async ({ assert }) => {
    const { ctx, header } = await runShield()
    const before = header()

    applyInstrumentCsp(ctx, null)

    assert.equal(header(), before)
  })
})
