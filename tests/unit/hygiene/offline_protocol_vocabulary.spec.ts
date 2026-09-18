import { test } from '@japa/runner'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde du vocabulaire de la file hors-ligne (#696, suivi par #726).
 *
 * `drainQueue` ne rapproche un flash d'une action enfilée que si les deux
 * chaînes sont **égales** :
 *
 * ```ts
 * if (flash?.conflictData && flash?.conflictType === action.type) {
 * ```
 *
 * Or `shared/constants/offline_queue.ts` ne déclare que les trois actions des
 * états des lieux. Les autres — `update-navigation-log`, `close-navigation-log`,
 * `update-sheet-item`, `update-navigation-log-entry` — sont des **littéraux
 * écrits à la main des deux côtés**. Chaque côté est testé contre son propre
 * littéral, donc renommer d'un seul côté laisse tout vert et casse la
 * comparaison en production : l'action rejouée n'est ni résolue, ni signalée,
 * ni retirée de la file.
 *
 * ⚠️ Cette garde **relit le disque** plutôt que d'importer les constantes : une
 * garde qui partagerait sa source avec sa cible hériterait de ses angles morts.
 * Même intention que `ci_shards.spec.ts` (#687) et
 * `inertia_pages_covered.spec.ts` (#689).
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const CONTROLLERS_DIR = join(ROOT, 'app/controllers')
const INERTIA_DIR = join(ROOT, 'inertia')
const CONFLICT_MODAL = join(ROOT, 'inertia/components/ConflictResolutionModal.vue')

/**
 * Types enfilés par le front que le serveur ne renvoie jamais. Toute entrée
 * porte son motif : une exemption sans raison écrite est une régression
 * déguisée.
 */
const ENQUEUED_WITHOUT_SERVER_ANSWER = new Map<string, string>([
  [
    'update-navigation-log-entry',
    "l'édition d'un point de journal n'envoie pas de `_expectedUpdatedAt` et le service " +
      "n'a aucune détection de conflit : c'est la seule mutation enfilée hors-ligne sans " +
      'verrou optimiste. Suivi par #725 — quand elle en aura un, retirer cette exemption.',
  ],
  // Les quatre créations du domaine terrain ont reçu leur `rejectedType` en
  // #727 : elles ne sont plus exemptées, la garde les couvre comme les autres.
])

/** Les trois clés de flash qui transportent un identifiant d'action. */
const ACTION_FLASH_KEYS = ['conflictType', 'rejectedType', 'createdResourceType']

function walk(dir: string, extensions: string[]): string[] {
  const found: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...walk(full, extensions))
      continue
    }
    if (extensions.some((extension) => entry.endsWith(extension))) found.push(full)
  }

  return found
}

/**
 * Les identifiants que le **serveur** sait renvoyer.
 *
 * Deux formes cohabitent, et c'est tout le problème : le littéral direct
 * (`session.flash('conflictType', 'update-navigation-log')`) et la constante
 * partagée (`session.flash('rejectedType', CREATE_INSPECTION_ACTION)`). La
 * seconde est résolue en relisant `shared/constants/offline_queue.ts`.
 */
function serverActionTypes(): Set<string> {
  const constants = new Map<string, string>()
  const constantsSource = readFileSync(join(ROOT, 'shared/constants/offline_queue.ts'), 'utf8')
  for (const match of constantsSource.matchAll(/export const (\w+) = '([^']+)'/g)) {
    constants.set(match[1], match[2])
  }

  const types = new Set<string>()
  const keys = ACTION_FLASH_KEYS.join('|')
  const flashCall = new RegExp(`session\\.flash\\(\\s*'(?:${keys})'\\s*,\\s*([^)]+?)\\s*\\)`, 'g')

  for (const file of walk(CONTROLLERS_DIR, ['.ts'])) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(flashCall)) {
      const argument = match[1]
      const literal = argument.match(/^'([^']+)'$/)
      if (literal) {
        types.add(literal[1])
        continue
      }
      const resolved = constants.get(argument)
      if (resolved) types.add(resolved)
    }
  }

  return types
}

/** Les identifiants que le **front** sait enfiler. */
function enqueuedActionTypes(): Set<string> {
  const constants = new Map<string, string>()
  const constantsSource = readFileSync(join(ROOT, 'shared/constants/offline_queue.ts'), 'utf8')
  for (const match of constantsSource.matchAll(/export const (\w+) = '([^']+)'/g)) {
    constants.set(match[1], match[2])
  }

  const types = new Set<string>()

  for (const file of walk(INERTIA_DIR, ['.vue', '.ts'])) {
    const source = readFileSync(file, 'utf8')
    // `enqueue({ … type: '…' … })` : le `type` suit l'appel de près, sur la
    // ligne suivante dans tous les appels du dépôt.
    for (const match of source.matchAll(/enqueue\(\{[^}]*?type:\s*([^,\n]+)/g)) {
      const argument = match[1].trim()
      const literal = argument.match(/^'([^']+)'$/)
      if (literal) {
        types.add(literal[1])
        continue
      }
      const resolved = constants.get(argument)
      if (resolved) types.add(resolved)
    }
  }

  return types
}

/** Les types pour lesquels la modale de conflit sait afficher des champs. */
function conflictModalTypes(): Set<string> {
  const source = readFileSync(CONFLICT_MODAL, 'utf8')
  const block = source.match(/const FIELDS_BY_TYPE[^{]*\{([\s\S]*?)\n\}/)
  if (!block) return new Set()

  return new Set([...block[1].matchAll(/'([a-z-]+)':/g)].map((match) => match[1]))
}

test.group("Hygiene — le vocabulaire d'actions de la file hors-ligne", () => {
  test('la découverte trouve bien les deux moitiés', ({ assert }) => {
    // Sans ce témoin, une regex qui ne matcherait plus rien rendrait tous les
    // autres tests de ce fichier verts sur deux ensembles vides.
    const server = serverActionTypes()
    const enqueued = enqueuedActionTypes()

    assert.isAbove(
      server.size,
      4,
      `seulement ${server.size} types côté serveur — la lecture a dérivé`
    )
    assert.isAbove(
      enqueued.size,
      4,
      `seulement ${enqueued.size} types côté front — la lecture a dérivé`
    )

    // Un de chaque forme : le littéral direct et la constante partagée. Si la
    // résolution des constantes cassait, seul ce témoin le dirait.
    assert.isTrue(server.has('update-navigation-log'), 'le littéral direct n’est plus lu')
    assert.isTrue(server.has('create-inspection'), 'la constante partagée n’est plus résolue')
  })

  test('tout type renvoyé par le serveur est un type que le front enfile', ({ assert }) => {
    const enqueued = enqueuedActionTypes()
    const orphans = [...serverActionTypes()].filter((type) => !enqueued.has(type)).sort()

    assert.deepEqual(
      orphans,
      [],
      `types renvoyés par un contrôleur que le front n'enfile jamais : ${orphans.join(', ')} — ` +
        `soit le nom a divergé d'un côté, soit le marqueur est mort`
    )
  })

  test('tout type enfilé par le front est un type dont le serveur sait parler', ({ assert }) => {
    // Le sens qui compte le plus : une action enfilée dont le serveur ne
    // renvoie jamais le marqueur ne sera **ni résolue, ni signalée** au retour
    // du réseau — elle reste en attente, sans rien afficher.
    const server = serverActionTypes()
    const orphans = [...enqueuedActionTypes()]
      .filter((type) => !server.has(type) && !ENQUEUED_WITHOUT_SERVER_ANSWER.has(type))
      .sort()

    assert.deepEqual(
      orphans,
      [],
      `types enfilés hors-ligne dont aucun contrôleur ne renvoie le marqueur : ${orphans.join(', ')}`
    )
  })

  test('chaque exemption décrit encore un type réellement enfilé', ({ assert }) => {
    // Une exemption qui ne correspond plus à rien est un commentaire périmé qui
    // se fait passer pour une décision.
    const enqueued = enqueuedActionTypes()
    const stale = [...ENQUEUED_WITHOUT_SERVER_ANSWER.keys()]
      .filter((type) => !enqueued.has(type))
      .sort()

    assert.deepEqual(stale, [], `exemptions périmées à retirer : ${stale.join(', ')}`)
  })

  test('chaque type de conflit a sa carte de champs dans la modale', ({ assert }) => {
    // Sans entrée dans `FIELDS_BY_TYPE`, `rows` est vide : la modale s'ouvre,
    // demande à l'utilisateur de trancher, et ne lui montre rien.
    const modal = conflictModalTypes()
    const conflictTypes = new Set<string>()
    const flashCall = /session\.flash\(\s*'conflictType'\s*,\s*'([^']+)'\s*\)/g

    for (const file of walk(CONTROLLERS_DIR, ['.ts'])) {
      for (const match of readFileSync(file, 'utf8').matchAll(flashCall)) {
        conflictTypes.add(match[1])
      }
    }

    assert.isAbove(conflictTypes.size, 2, 'la lecture des types de conflit a dérivé')

    const unmapped = [...conflictTypes].filter((type) => !modal.has(type)).sort()
    assert.deepEqual(
      unmapped,
      [],
      `types de conflit absents de FIELDS_BY_TYPE : ${unmapped.join(', ')} — ` +
        `la modale s'ouvrirait sans aucune ligne à comparer`
    )
  })
})
