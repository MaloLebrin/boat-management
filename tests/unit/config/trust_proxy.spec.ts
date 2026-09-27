import { test } from '@japa/runner'
import { IncomingMessage } from 'node:http'
import { Socket } from 'node:net'
import { RequestFactory } from '@adonisjs/core/factories/http'
import { http, resolveTrustProxy, DEFAULT_TRUST_PROXY } from '#config/app'

/**
 * `trustProxy` derrière Caddy (#844).
 *
 * En production, Caddy joint `web` par le réseau Docker : la connexion TCP
 * arrive d'une IP privée (172.18.0.x), jamais de `127.0.0.1`. Avec le défaut
 * d'AdonisJS (`loopback`), `request.ip()` rendait l'IP de Caddy pour tout le
 * monde, et chaque throttle par IP de `start/limiter.ts` devenait global.
 *
 * Les tests fonctionnels ne peuvent pas reproduire cette topologie : le client
 * Japa se connecte toujours depuis le loopback, où `X-Forwarded-For` est
 * accepté quelle que soit la config. D'où ces requêtes construites à la main,
 * avec l'adresse distante que voit réellement le conteneur `web`.
 */

const CADDY_IP = '172.18.0.5'

function requestFrom(remoteAddress: string, forwardedFor?: string) {
  const socket = new Socket()
  Object.defineProperty(socket, 'remoteAddress', { value: remoteAddress })
  const req = new IncomingMessage(socket)
  if (forwardedFor) {
    req.headers['x-forwarded-for'] = forwardedFor
    req.headers['x-forwarded-proto'] = 'https'
  }
  return new RequestFactory()
    .merge({ req, url: '/signup', method: 'POST', config: { trustProxy: http.trustProxy } })
    .create()
}

test.group('trustProxy config (unit)', () => {
  test('behind Caddy, request.ip() is the visitor, not the Caddy container', ({ assert }) => {
    const request = requestFrom(CADDY_IP, '198.51.100.7')

    assert.equal(request.ip(), '198.51.100.7')
    assert.equal(request.protocol(), 'https')
  })

  test('two visitors behind Caddy get two distinct IPs — hence two throttle counters', ({
    assert,
  }) => {
    const first = requestFrom(CADDY_IP, '198.51.100.7')
    const second = requestFrom(CADDY_IP, '203.0.113.42')

    assert.notEqual(first.ip(), second.ip())
    assert.notEqual(first.ip(), CADDY_IP)
  })

  test('a client connecting from the Internet cannot spoof its IP', ({ assert }) => {
    const request = requestFrom('203.0.113.42', '10.0.0.1')

    assert.equal(request.ip(), '203.0.113.42')
    assert.equal(request.protocol(), 'http')
  })

  test('a client-supplied X-Forwarded-For before Caddy is ignored', ({ assert }) => {
    // Caddy remplace l'en-tête ; même s'il l'étendait, la chaîne s'arrête à la
    // première adresse non privée en partant de la droite.
    const request = requestFrom(CADDY_IP, '1.2.3.4, 198.51.100.7')

    assert.equal(request.ip(), '198.51.100.7')
  })
})

test.group('resolveTrustProxy (unit)', () => {
  function trusts(raw: string | undefined, address: string) {
    const trust = resolveTrustProxy(raw)
    return typeof trust === 'boolean' ? trust : trust(address, 0)
  }

  test('an empty or missing value falls back to loopback + private networks', ({ assert }) => {
    assert.equal(DEFAULT_TRUST_PROXY, 'loopback, uniquelocal')
    for (const raw of [undefined, '', '  ']) {
      assert.isTrue(trusts(raw, '127.0.0.1'))
      assert.isTrue(trusts(raw, CADDY_IP))
      assert.isTrue(trusts(raw, '10.0.0.3'))
      assert.isTrue(trusts(raw, 'fdaa::2'))
      assert.isFalse(trusts(raw, '203.0.113.42'))
    }
  })

  test('true/false become booleans', ({ assert }) => {
    assert.isTrue(resolveTrustProxy('true'))
    assert.isFalse(resolveTrustProxy('false'))
  })

  test('a comma-separated list is split before being compiled', ({ assert }) => {
    assert.isTrue(trusts('loopback, 203.0.113.0/24', '203.0.113.42'))
    assert.isTrue(trusts('loopback, 203.0.113.0/24', '127.0.0.1'))
    assert.isFalse(trusts('loopback, 203.0.113.0/24', CADDY_IP))
  })

  test('an invalid entry fails at boot rather than silently trusting nobody', ({ assert }) => {
    assert.throws(() => resolveTrustProxy('loopback, not-an-ip'))
  })
})
