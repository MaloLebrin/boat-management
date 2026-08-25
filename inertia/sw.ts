/// <reference lib="webworker" />
/**
 * Service worker custom (#496) — stratégie `injectManifest` de vite-plugin-pwa.
 *
 * En `generateSW`, tout ceci était généré ; la bascule rend chaque comportement
 * explicite (et permet d'accueillir les gestionnaires Web Push de #497/#498) :
 * - `skipWaiting`/`clients.claim` ne sont plus injectés par
 *   `registerType: 'autoUpdate'` — écrits ici en natif (pas de workbox-core) ;
 * - le précache vient du manifeste injecté (`self.__WB_MANIFEST`), dont
 *   `/offline.html` ajouté par `additionalManifestEntries` (#482) ;
 * - le NetworkFirst des pages terrain et le repli hors-ligne sont réécrits
 *   avec workbox-routing/strategies/expiration/cacheable-response.
 *
 * Le tsconfig Inertia charge la lib DOM : `self` y est un `Window`, d'où le
 * cast local vers `ServiceWorkerGlobalScope`.
 */
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, NetworkOnly } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// `registerType: 'autoUpdate'` : le nouveau SW prend la main sans attendre la
// fermeture des onglets — comportement qu'injectait generateSW
self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Pages terrain en NetworkFirst : réseau d'abord (3 s), sinon la dernière
// version visitée. Restreint aux navigations : les visites Inertia (XHR
// X-Inertia) répondent du JSON sur les mêmes URLs — les cacher sous la même
// clé servirait du JSON brut à une navigation hors-ligne.
registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' &&
    url.origin === self.location.origin &&
    /^\/(boats|navigation|planning)(\/|$)/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'inertia-pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

// Toute autre navigation passe par le SW en NetworkOnly : indispensable pour
// que le repli ci-dessous s'applique — `setCatchHandler` ne rattrape que les
// requêtes gérées par une route, une navigation sans route irait directement
// au réseau et échouerait hors-ligne sans repli. Enregistrée après le
// NetworkFirst : le routeur Workbox prend la première route qui matche.
registerRoute(new NavigationRoute(new NetworkOnly(), { denylist: [/^\/api\//, /^\/up\b/] }))

// Repli hors-ligne : toute navigation qui échoue (page jamais visitée, réseau
// coupé) sert le /offline.html précaché — équivalent du navigateFallback de
// generateSW
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    const fallback = await matchPrecache('/offline.html')
    if (fallback) return fallback
  }
  return Response.error()
})
