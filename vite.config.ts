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
      // injectManifest (#496) : le SW custom inertia/sw.ts porte le runtime
      // (NetworkFirst, repli hors-ligne, bientôt Web Push) ; le plugin ne fait
      // plus que bundler le SW et y injecter le manifeste de précache
      strategies: 'injectManifest',
      srcDir: 'inertia',
      filename: 'sw.ts',
      // Le client Vite sort dans build/public/assets (@adonisjs/inertia/vite),
      // mais un SW servi sous /assets/ ne contrôle jamais les navigations
      // (/boats, /planning…) : sw.js doit sortir à la racine web du build et
      // s'enregistrer à /sw.js avec un scope '/' (#482)
      outDir: 'build/public',
      buildBase: '/',
      scope: '/',
      injectManifest: {
        // globDirectory = build/public : au moment de l'injection seuls les
        // bundles (assets/**) y sont — les metaFiles (offline.html, favicons…)
        // ne sont copiés qu'ensuite, d'où l'entrée manuelle ci-dessous
        globDirectory: 'build/public',
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // ne jamais précacher le SW lui-même
        globIgnores: ['sw.js', 'workbox-*.js', 'offline.html'],
        additionalManifestEntries: [{ url: '/offline.html', revision: offlineHtmlRevision }],
      },
      // SW testable avec `pnpm dev` — la validation finale reste sur build réel
      devOptions: { enabled: true, type: 'module' },
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
