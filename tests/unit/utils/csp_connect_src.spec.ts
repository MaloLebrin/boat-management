import { test } from '@japa/runner'
import {
  appendConnectSrc,
  applyInstrumentCsp,
  instrumentConnectOrigins,
} from '#utils/csp_connect_src'

const HEADER =
  "default-src 'self'; script-src 'self' 'nonce-abc'; connect-src 'self'; img-src 'self'"

test.group('appendConnectSrc (#988)', () => {
  test('ajoute les origines à connect-src sans toucher aux autres directives', ({ assert }) => {
    const result = appendConnectSrc(HEADER, ['https://sk.local:3443', 'wss://sk.local:3443'])
    assert.include(result, "connect-src 'self' https://sk.local:3443 wss://sk.local:3443")
    assert.include(result, "script-src 'self' 'nonce-abc'")
    assert.include(result, "img-src 'self'")
  })

  test('est idempotente', ({ assert }) => {
    const once = appendConnectSrc(HEADER, ['https://sk.local'])
    assert.equal(appendConnectSrc(once, ['https://sk.local']), once)
  })

  test('crée connect-src depuis default-src quand elle manque', ({ assert }) => {
    const result = appendConnectSrc("default-src 'self'; img-src 'self'", ['wss://h'])
    assert.include(result, "connect-src 'self' wss://h")
  })

  test('sans origine, rend l’en-tête inchangé', ({ assert }) => {
    assert.equal(appendConnectSrc(HEADER, []), HEADER)
  })
})

test.group('instrumentConnectOrigins (#988)', () => {
  test('production : https et wss seulement', ({ assert }) => {
    assert.deepEqual(instrumentConnectOrigins('https://sk.local:3443', { allowInsecure: false }), [
      'https://sk.local:3443',
      'wss://sk.local:3443',
    ])
  })

  test('hors production : ajoute http et ws', ({ assert }) => {
    assert.deepEqual(instrumentConnectOrigins('http://localhost:3000', { allowInsecure: true }), [
      'https://localhost:3000',
      'wss://localhost:3000',
      'http://localhost:3000',
      'ws://localhost:3000',
    ])
  })

  test('une valeur illisible n’ouvre rien', ({ assert }) => {
    assert.deepEqual(instrumentConnectOrigins('pas une url', { allowInsecure: true }), [])
  })
})

test.group('applyInstrumentCsp (#988)', () => {
  function fakeResponse(headers: Record<string, string>) {
    const store = new Map(Object.entries(headers))
    return {
      ctx: {
        response: {
          response: {
            getHeader: (name: string) => store.get(name),
            setHeader: (name: string, value: string) => store.set(name, value),
          },
        },
      },
      store,
    }
  }

  test('réécrit l’en-tête report-only posé par Shield', ({ assert }) => {
    const { ctx, store } = fakeResponse({ 'content-security-policy-report-only': HEADER })
    applyInstrumentCsp(ctx as never, { baseUrl: 'https://sk.local' }, { allowInsecure: false })
    assert.include(store.get('content-security-policy-report-only'), 'wss://sk.local')
  })

  test('réécrit l’en-tête appliqué', ({ assert }) => {
    const { ctx, store } = fakeResponse({ 'content-security-policy': HEADER })
    applyInstrumentCsp(ctx as never, { baseUrl: 'https://sk.local' }, { allowInsecure: false })
    assert.include(store.get('content-security-policy'), 'https://sk.local')
  })

  test('sans en-tête ou sans source : no-op', ({ assert }) => {
    const empty = fakeResponse({})
    applyInstrumentCsp(empty.ctx as never, { baseUrl: 'https://sk.local' })
    assert.equal(empty.store.size, 0)

    const withHeader = fakeResponse({ 'content-security-policy': HEADER })
    applyInstrumentCsp(withHeader.ctx as never, null)
    assert.equal(withHeader.store.get('content-security-policy'), HEADER)
  })
})
