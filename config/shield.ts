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
      // Cloudinary CDN pour les images uploadées
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com'],
      // Polices bundlées localement via Fontsource, pas de CDN externe
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },

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
    exceptRoutes: ['/webhooks/stripe'],

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
