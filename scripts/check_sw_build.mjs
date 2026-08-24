/**
 * Garde-fou de build du service worker (#483).
 *
 * S'exécute sur l'artefact de build réel (`node ace build` préalable), pas sur
 * les sources — c'est l'absence de ce test qui a laissé passer #482 (SW qui ne
 * s'installait jamais en production).
 *
 * Vérifie :
 * 1. `build/public/sw.js` existe (racine web, pas `/assets/`) ;
 * 2. le SW s'évalue sans lever dans un contexte mocké (`node:vm`), la
 *    dépendance AMD vers le chunk `workbox-*.js` voisin étant résolue via un
 *    shim `importScripts` — une erreur Workbox du type `non-precached-url`
 *    lève ici, comme dans un vrai navigateur ;
 * 3. les listeners `install`/`activate`/`fetch` sont bien enregistrés ;
 * 4. `/offline.html` figure dans le manifeste de précache ;
 * 5. le bundle client enregistre `/sw.js` avec un scope `/` (et plus
 *    `/assets/sw.js`).
 *
 * Usage : `node scripts/check_sw_build.mjs` (ou `pnpm check:sw`).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const webRoot = join(projectRoot, 'build', 'public')
const swPath = join(webRoot, 'sw.js')
const failures = []

function fail(message) {
  failures.push(message)
  console.error(`✗ ${message}`)
}

function pass(message) {
  console.log(`✓ ${message}`)
}

/* 1 — sw.js à la racine web du build */
if (!existsSync(swPath)) {
  fail(
    `build/public/sw.js introuvable — lancer \`node ace build\` d'abord. ` +
      `S'il sort dans build/public/assets/, le scope est reparti sur /assets/ (régression #482).`
  )
  console.error(`\n${failures.length} vérification(s) en échec.`)
  exit(1)
}
pass('build/public/sw.js présent à la racine web')

/* 2 & 3 — évaluation du SW dans un contexte service worker mocké */
const swCode = readFileSync(swPath, 'utf-8')
const listeners = new Set()
let evaluationError = null

const sandbox = {
  location: new URL('https://fleetai.test/sw.js'),
  URL,
  console,
  fetch: async () => ({ ok: true }),
  caches: { open: async () => ({}), keys: async () => [], match: async () => undefined },
  addEventListener: (type) => listeners.add(type),
  removeEventListener: () => {},
  registration: { scope: 'https://fleetai.test/' },
  clients: { claim: async () => {} },
  skipWaiting: async () => {},
  importScripts: (...urls) => {
    for (const url of urls) {
      const pathname = new URL(url, 'https://fleetai.test/').pathname
      const chunk = readFileSync(join(webRoot, pathname), 'utf-8')
      vm.runInContext(chunk, context, { filename: pathname })
    }
  },
}
sandbox.self = sandbox
sandbox.globalThis = sandbox
const context = vm.createContext(sandbox)

// Le loader AMD du SW résout le chunk workbox en asynchrone : les erreurs
// Workbox (ex. non-precached-url) arrivent en rejet de promesse, pas en throw.
process.on('unhandledRejection', (error) => {
  evaluationError = error
})

try {
  vm.runInContext(swCode, context, { filename: 'sw.js' })
} catch (error) {
  evaluationError = error
}

// Laisser la chaîne de microtâches/timers du loader AMD se terminer.
await new Promise((resolve) => setTimeout(resolve, 200))

if (evaluationError) {
  const details = 'details' in evaluationError ? ` :: ${JSON.stringify(evaluationError.details)}` : ''
  fail(
    `le service worker lève à l'évaluation — il ne s'installera jamais : ` +
      `${evaluationError.name}: ${evaluationError.message}${details}`
  )
} else {
  pass("le service worker s'évalue sans lever")
  for (const type of ['install', 'activate', 'fetch']) {
    if (listeners.has(type)) pass(`listener '${type}' enregistré`)
    else fail(`listener '${type}' jamais enregistré — le SW ne fait rien`)
  }
}

/* 4 — /offline.html dans le manifeste de précache */
const manifestEntries = [...swCode.matchAll(/\{url:"([^"]+)",revision:(?:null|"[a-f0-9]+")\}/g)].map(
  (match) => match[1]
)
if (manifestEntries.length === 0) {
  fail('aucun manifeste de précache trouvé dans sw.js')
} else if (manifestEntries.some((url) => url.replace(/^\//, '') === 'offline.html')) {
  pass(`/offline.html précaché (manifeste : ${manifestEntries.length} entrées)`)
} else {
  fail(
    `/offline.html absent du manifeste de précache (${manifestEntries.length} entrées) — ` +
      `navigateFallback lèvera non-precached-url`
  )
}

/* 5 — enregistrement client : /sw.js, scope / */
const assetsDir = join(webRoot, 'assets')
const clientBundles = readdirSync(assetsDir).filter((file) => file.endsWith('.js'))
let registersAtRoot = false
let registersUnderAssets = false
let scopeRoot = false
for (const file of clientBundles) {
  const code = readFileSync(join(assetsDir, file), 'utf-8')
  if (code.includes('"/sw.js"')) registersAtRoot = true
  if (code.includes('"/assets/sw.js"')) registersUnderAssets = true
  if (code.includes('"/sw.js"') && code.includes('scope:"/"')) scopeRoot = true
}
if (registersUnderAssets) {
  fail('le bundle client référence /assets/sw.js — le SW ne contrôlerait que /assets/ (régression #482)')
} else if (registersAtRoot && scopeRoot) {
  pass('le bundle client enregistre /sw.js avec un scope /')
} else {
  fail(`enregistrement du SW introuvable dans le bundle client (registersAtRoot=${registersAtRoot}, scope /=${scopeRoot})`)
}

if (failures.length > 0) {
  console.error(`\n${failures.length} vérification(s) en échec.`)
  exit(1)
}
console.log('\nGarde-fou service worker : OK')
exit(0)
