import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more.
   */
  csp: {
    enabled: true,

    directives: {
      defaultSrc: ["'self'"],
      // `@nonce` est le mot-clé Shield (cspKeywords) remplacé à chaque requête
      // par `'nonce-<valeur>'`. La même valeur est partagée avec Edge sous
      // `cspNonce` : les scripts inline de `inertia_layout.edge` la posent
      // en attribut `nonce`. Les balises `@vite` / `@inertiaHead` n'en ont pas
      // besoin : elles émettent des ressources same-origin couvertes par 'self'.
      // Un placeholder `{{nonce}}` n'est pas interprété et rend la source
      // invalide (avertissement Chromium sur chaque page, cf. #828).
      scriptSrc: ["'self'", '@nonce'],
      styleSrc: ["'self'", '@nonce'],
      // Attributs `style="…"` (#831) : Chromium les évalue via `style-src-attr`,
      // qui retombe sur `style-src` — et un nonce ne s'applique jamais à un
      // attribut. Or le SSR d'Inertia sérialise chaque `:style` de Vue (jauges,
      // barres de progression, positions de carte, couleurs de marque choisies
      // par l'utilisateur, `wrapperStyle` de BaseInput) en attribut `style` :
      // sans cette directive, le HTML arrive sans ces styles jusqu'au rendu
      // client. `'unsafe-inline'` est cantonné aux attributs — les balises
      // `<style>` et les feuilles restent sous `style-src` ('self' + nonce).
      // `'unsafe-hashes'` est écarté : il faudrait un hash par valeur, ce que
      // des largeurs ou des positions calculées rendent impossible.
      styleSrcAttr: ["'unsafe-inline'"],
      // Cloudinary CDN pour les images uploadées
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
      // Polices bundlées localement via Fontsource, pas de CDN externe
      fontSrc: ["'self'"],
      // Transmit SSE (`use_notifications.ts`) ouvre EventSource sur
      // `window.location.origin` — même origine, `'self'` suffit en mode
      // bloquant (#779).
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      // Complète `xFrame: DENY` pour les navigateurs qui privilégient CSP
      // (#779). Les deux coexistent volontairement.
      frameAncestors: ["'none'"],
      // Empêche un formulaire injecté de poster hors origine. Les `<Form>` /
      // `useForm` Inertia restent same-origin ; Stripe est une redirection
      // serveur après un POST interne, pas un `action` externe (#779).
      formAction: ["'self'"],
    },

    // Prod : CSP appliquée. Dev : report-only — la console Chromium a fait
    // sortir #830 / #831. Pas de collecteur `report-uri` pour l'instant (#779).
    reportOnly: !app.inProduction,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more.
   */
  csrf: {
    /**
     * Enable CSRF token verification for state-changing requests.
     */
    enabled: true,

    /**
     * Route patterns to exclude from CSRF checks.
     * Useful for external webhooks or API endpoints.
     */
    exceptRoutes: ['/webhooks/stripe', '/webhooks/stripe/connect'],

    /**
     * Expose an encrypted XSRF-TOKEN cookie for frontend HTTP clients.
     */
    enableXsrfCookie: true,

    /**
     * HTTP methods protected by CSRF validation.
     */
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iframes.
   */
  xFrame: {
    /**
     * Enable the X-Frame-Options header.
     */
    enabled: true,

    /**
     * Block all framing attempts. Default value is DENY.
     */
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS.
   *
   * Pas de `includeSubDomains` ni `preload` (#779) : `www.fleetai.app` est
   * déjà en HTTPS, mais la couverture HTTPS de tous les sous-domaines n'est
   * pas confirmée, et l'en-tête est mis en cache 180 jours.
   */
  hsts: {
    /**
     * Enable the Strict-Transport-Security header.
     */
    enabled: true,

    /**
     * HSTS policy duration remembered by browsers.
     */
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing content types and rely only
   * on the response content-type header.
   */
  contentTypeSniffing: {
    /**
     * Enable X-Content-Type-Options: nosniff.
     */
    enabled: true,
  },
})

export default shieldConfig
