import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import inertia from '@adonisjs/inertia/vite'
import adonisjs from '@adonisjs/vite/client'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// offline.html vit dans public/ et n'est copié dans build/public qu'après le
// build Vite (metaFiles) : il est précaché explicitement, avec une révision
// dérivée de son contenu pour invalider le cache quand il change (#482)
const offlineHtmlRevision = createHash('md5')
  .update(readFileSync(`${import.meta.dirname}/public/offline.html`))
  .digest('hex')

export default defineConfig({
  plugins: [
    vue(),
    inertia({ ssr: { enabled: true, entrypoint: 'inertia/ssr.ts' } }),
    adonisjs({ entrypoints: ['inertia/app.ts'], reload: ['resources/views/**/*.edge'] }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      // Le client Vite sort dans build/public/assets (@adonisjs/inertia/vite),
      // mais un SW servi sous /assets/ ne contrôle jamais les navigations
      // (/boats, /planning…) : sw.js doit sortir à la racine web du build et
      // s'enregistrer à /sw.js avec un scope '/' (#482)
      outDir: 'build/public',
      buildBase: '/',
      scope: '/',
      workbox: {
        // globDirectory = build/public (dérivé de outDir) : au moment du
        // generateSW seuls les bundles (assets/**) y sont — les metaFiles
        // (offline.html, favicons…) ne sont copiés qu'ensuite
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // ne jamais précacher le SW lui-même ni le runtime Workbox
        globIgnores: ['sw.js', 'workbox-*.js', 'offline.html'],
        additionalManifestEntries: [{ url: '/offline.html', revision: offlineHtmlRevision }],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/up\b/],
        runtimeCaching: [
          {
            urlPattern: /^\/(boats|navigation|planning)(\/.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'inertia-pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      '~/': `${import.meta.dirname}/inertia/`,
      '@generated': `${import.meta.dirname}/.adonisjs/client/`,
    },
  },

  server: {
    port: 5555,
    strictPort: true,
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },
})
