import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import ShieldMiddleware from '@adonisjs/shield/shield_middleware'
import SessionMiddleware from '@adonisjs/session/session_middleware'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Barre de progression Inertia et CSP (#837).
 *
 * `@inertiajs/core` injecte par défaut le CSS de sa barre de progression
 * (`#nprogress { … }`) dans une balise `<style>` sans nonce. En production,
 * `style-src 'self' 'nonce-…'` la refuse : Chromium loggait sur chaque page
 * « Applying inline style violates the following Content Security Policy
 * directive 'style-src …' » et la barre n'avait aucun style.
 *
 * Le correctif ne doit pas passer par un affaiblissement de la CSP
 * (`'unsafe-inline'`) mais par `includeCSS: false` côté `createInertiaApp` et
 * un CSS bundlé dans `inertia/css/app.css`, servi same-origin (couvert par
 * `'self'`). Comme `csp_nonce.spec.ts` (#830), l'en-tête est lu en rejouant
 * le vrai `ShieldMiddleware` — `start/kernel.ts` le retire du pipeline en
 * test. Les deux autres gardes relisent le disque : une garde qui importerait
 * l'objet d'options hériterait de ses angles morts.
 */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url))

const CSP_HEADER = app.inProduction
  ? 'content-security-policy'
  : 'content-security-policy-report-only'

function directive(header: string, name: string): string {
  const found = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `))

  return found ?? ''
}

async function styleSrc(): Promise<string> {
  const ctx = await testUtils.createHttpContext()
  ctx.request.request.method = 'GET'
  ctx.request.request.url = '/en'

  const session = await app.container.make(SessionMiddleware)
  const shield = await app.container.make(ShieldMiddleware)
  await session.handle(ctx, () => shield.handle(ctx, async () => {}))

  const header = ctx.response.response.getHeader(CSP_HEADER)
  return directive(typeof header === 'string' ? header : '', 'style-src')
}

test.group('CSP — CSS de la barre de progression Inertia (#837)', () => {
  test("`style-src` reste sur 'self' + nonce, sans 'unsafe-inline'", async ({ assert }) => {
    const source = await styleSrc()

    assert.include(source, "'self'")
    assert.match(source, /'nonce-[A-Za-z0-9_-]+'/)
    assert.notInclude(source, "'unsafe-inline'")
  })

  test("`createInertiaApp` désactive l'injection du <style> d'Inertia", ({ assert }) => {
    const options = readFileSync(join(ROOT, 'inertia/utils/inertia_progress.ts'), 'utf8')
    const entry = readFileSync(join(ROOT, 'inertia/app.ts'), 'utf8')

    assert.match(options, /includeCSS:\s*false/)
    assert.include(entry, 'progress: inertiaProgressOptions')
  })

  test('le CSS de la barre est bundlé dans app.css avec la couleur brand', ({ assert }) => {
    const css = readFileSync(join(ROOT, 'inertia/css/app.css'), 'utf8')

    assert.match(css, /#nprogress\s*\{\s*pointer-events:\s*none;/)
    assert.match(css, /#nprogress \.bar\s*\{[^}]*background:\s*var\(--color-brand\);/)
    assert.match(css, /#nprogress \.peg\s*\{/)
  })
})
