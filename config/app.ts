import { defineConfig } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import proxyAddr from 'proxy-addr'
import env from '#start/env'

/**
 * Proxies dont on accepte les en-têtes `X-Forwarded-*` (#844).
 *
 * Le défaut d'AdonisJS (`loopback`) ne suffit pas derrière Caddy : Caddy joint
 * `web` par le réseau Docker, depuis une IP privée (172.16/12…) et non depuis
 * `127.0.0.1`. `request.ip()` rendait alors l'IP du conteneur Caddy pour toutes
 * les requêtes, et chaque throttle par IP de `start/limiter.ts` devenait un
 * compteur global à la plateforme (5 inscriptions par heure pour tout le monde).
 *
 * `uniquelocal` couvre 10/8, 172.16/12, 192.168/16 et fc00::/7 — les réseaux
 * Docker et les proxies privés des PaaS — sans faire confiance à Internet :
 * un visiteur ne peut forger son IP que s'il se connecte déjà depuis un réseau
 * privé du serveur.
 */
export const DEFAULT_TRUST_PROXY = 'loopback, uniquelocal'

/**
 * Traduit `TRUST_PROXY` en valeur `trustProxy` : vide → défaut ci-dessus,
 * `true`/`false` → faire confiance à tout/à rien, sinon liste de préréglages
 * `proxy-addr` (`loopback`, `linklocal`, `uniquelocal`), d'IP ou de CIDR
 * séparés par des virgules.
 *
 * La liste est compilée ici : passée en chaîne à `defineConfig`,
 * `proxyAddr.compile` la prendrait pour une seule adresse et lèverait au boot
 * (il ne découpe que les tableaux).
 */
export function resolveTrustProxy(
  raw: string | undefined
): ((address: string, distance: number) => boolean) | boolean {
  const value = raw?.trim() || DEFAULT_TRUST_PROXY
  if (value === 'true') return true
  if (value === 'false') return false
  return proxyAddr.compile(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  )
}

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  /**
   * Generate a unique request id for each incoming request.
   * Useful to correlate logs and debug a request flow.
   */
  generateRequestId: true,

  /**
   * Proxies de confiance pour `X-Forwarded-For`/`-Proto`/`-Host` — voir
   * `resolveTrustProxy` ci-dessus et `docs/dev/hosting.md`.
   */
  trustProxy: resolveTrustProxy(env.get('TRUST_PROXY')),

  /**
   * Allow HTTP method spoofing via the "_method" form/query parameter.
   * This lets HTML forms target PUT/PATCH/DELETE routes while still
   * submitting with POST.
   */
  allowMethodSpoofing: false,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: false,

  /**
   * Redirect configuration controls the behavior of
   * response.redirect().back() and query string forwarding.
   */
  redirect: {
    /**
     * When enabled, all redirects automatically carry over the current
     * request's query string parameters to the redirect destination.
     * Use withQs(false) to opt out for a specific redirect.
     */
    forwardQueryString: true,
  },

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    /**
     * Restrict the cookie to a specific domain.
     * Keep empty to use the current host.
     */
    domain: '',

    /**
     * Restrict the cookie to a URL path. '/' means all routes.
     */
    path: '/',

    /**
     * Default lifetime for cookies managed by the HTTP layer.
     */
    maxAge: '5d',

    /**
     * Prevent JavaScript access to the cookie in the browser.
     */
    httpOnly: true,

    /**
     * Send cookies only over HTTPS in production.
     */
    secure: app.inProduction,

    /**
     * Cross-site policy for cookie sending.
     */
    sameSite: 'lax',
  },
})
