import { test } from '@japa/runner'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde du vocabulaire de la file hors-ligne (#696, refermée par #726).
 *
 * `drainQueue` ne rapproche un flash d'une action enfilée que si les deux
 * chaînes sont **égales** :
 *
 * ```ts
 * if (flash?.conflictData && flash?.conflictType === action.type) {
 * ```
 *
 * Tant que chaque côté écrivait son propre littéral, renommer d'un seul côté
 * laissait tout vert et cassait la comparaison en production : l'action rejouée
 * n'était ni résolue, ni signalée, ni retirée de la file. #726 a descendu tout
 * le vocabulaire dans `shared/constants/offline_queue.ts` ; cette garde tient
 * les deux propriétés que le compilateur ne voit pas :
 *
 * 1. **plus aucun littéral** — un identifiant réécrit à la main contourne
 *    l'union fermée et rouvre exactement le trou d'origine ;
 * 2. **les deux moitiés se répondent** — un marqueur que personne n'enfile est
 *    mort, une action que personne ne relève reste en file sans rien afficher.
 *
 * ⚠️ Cette garde **relit le disque** plutôt que d'importer les constantes : une
 * garde qui partagerait sa source avec sa cible hériterait de ses angles morts.
 * Même intention que `ci_shards.spec.ts` (#687) et
 * `inertia_pages_covered.spec.ts` (#689).
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const CONTROLLERS_DIR = join(ROOT, 'app/controllers')
const INERTIA_DIR = join(ROOT, 'inertia')
const CONSTANTS_FILE = join(ROOT, 'shared/constants/offline_queue.ts')
const CONFLICT_MODAL = join(ROOT, 'inertia/components/ConflictResolutionModal.vue')

/**
 * Types enfilés par le front que le serveur ne renvoie jamais. Toute entrée
 * porte son motif : une exemption sans raison écrite est une régression
 * déguisée. Vide depuis #816 — les incidents, derniers exemptés, renvoient
 * désormais leur `rejectedType` — mais la garde reste : c'est ici qu'un
 * prochain trou devra s'écrire, avec sa raison.
 */
const ENQUEUED_WITHOUT_SERVER_ANSWER = new Map<string, string>([])

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

/** Le vocabulaire déclaré, relu à la source : nom de constante → identifiant. */
function declaredActions(): Map<string, string> {
  const constants = new Map<string, string>()
  const source = readFileSync(CONSTANTS_FILE, 'utf8')
  for (const match of source.matchAll(/export const (\w+) = '([^']+)'/g)) {
    constants.set(match[1], match[2])
  }
  return constants
}

interface Occurrence {
  /** Identifiants résolus via une constante partagée. */
  types: string[]
  /** Identifiants écrits en littéral — ce que #726 a supprimé. */
  literals: string[]
}

/**
 * Lit une expression prise à un point d'usage (`session.flash(…, X)`,
 * `enqueue({ type: X })`, clé calculée d'une carte) et en tire les identifiants.
 *
 * Deux formes sont reconnues : le littéral direct — toujours signalé, c'est la
 * régression que la garde traque — et la ou les constantes partagées, y compris
 * dans un ternaire (`editing ? UPDATE_… : CREATE_…`).
 */
function readExpression(expression: string, constants: Map<string, string>): Occurrence {
  const trimmed = expression.trim()
  const literals = [...trimmed.matchAll(/'([a-z][a-z-]+)'/g)].map((match) => match[1])
  const types: string[] = []

  for (const identifier of trimmed.matchAll(/\b[A-Z][A-Z0-9_]{3,}\b/g)) {
    const resolved = constants.get(identifier[0])
    if (resolved) types.push(resolved)
  }

  return { types, literals }
}

/** Les identifiants que le **serveur** sait renvoyer, et les littéraux restants. */
function serverActions(constants: Map<string, string>): Occurrence {
  const types: string[] = []
  const literals: string[] = []
  const keys = ACTION_FLASH_KEYS.join('|')
  const flashCall = new RegExp(`session\\.flash\\(\\s*'(?:${keys})'\\s*,\\s*([^)]+?)\\s*\\)`, 'g')

  for (const file of walk(CONTROLLERS_DIR, ['.ts'])) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(flashCall)) {
      const occurrence = readExpression(match[1], constants)
      types.push(...occurrence.types)
      literals.push(...occurrence.literals.map((literal) => `${relative(ROOT, file)} : ${literal}`))
    }
  }

  return { types, literals }
}

/** Les identifiants que le **front** sait enfiler, et les littéraux restants. */
function enqueuedActions(constants: Map<string, string>): Occurrence {
  const types: string[] = []
  const literals: string[] = []

  for (const file of walk(INERTIA_DIR, ['.vue', '.ts'])) {
    const source = readFileSync(file, 'utf8')
    // `enqueue({ … type: '…' … })` : le `type` suit l'appel de près, sur la
    // ligne suivante dans tous les appels du dépôt.
    for (const match of source.matchAll(/enqueue\(\{[^}]*?type:\s*([^,\n]+)/g)) {
      const occurrence = readExpression(match[1], constants)
      types.push(...occurrence.types)
      literals.push(...occurrence.literals.map((literal) => `${relative(ROOT, file)} : ${literal}`))
    }
  }

  return { types, literals }
}

/** Les types pour lesquels la modale de conflit sait afficher des champs. */
function conflictModalActions(constants: Map<string, string>): Occurrence {
  const source = readFileSync(CONFLICT_MODAL, 'utf8')
  const block = source.match(/const FIELDS_BY_TYPE[^{]*\{([\s\S]*?)\n\}/)
  if (!block) return { types: [], literals: [] }

  const types: string[] = []
  const literals: string[] = []
  // Clé calculée `[UPDATE_…]:` depuis #726, littérale `'update-…':` avant.
  for (const match of block[1].matchAll(/^\s*(\[[^\]]+\]|'[^']+')\s*:/gm)) {
    const occurrence = readExpression(match[1], constants)
    types.push(...occurrence.types)
    literals.push(...occurrence.literals.map((literal) => `FIELDS_BY_TYPE : ${literal}`))
  }

  return { types, literals }
}

test.group("Hygiene — le vocabulaire d'actions de la file hors-ligne", () => {
  test('la découverte trouve bien les trois lieux d’usage', ({ assert }) => {
    // Sans ce témoin, une regex qui ne matcherait plus rien rendrait tous les
    // autres tests de ce fichier verts sur des ensembles vides.
    const constants = declaredActions()
    assert.isAbove(
      constants.size,
      8,
      `seulement ${constants.size} constantes lues — la lecture a dérivé`
    )

    const server = new Set(serverActions(constants).types)
    const enqueued = new Set(enqueuedActions(constants).types)
    const modal = new Set(conflictModalActions(constants).types)

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
    assert.isAbove(
      modal.size,
      2,
      `seulement ${modal.size} types dans la modale — la lecture a dérivé`
    )

    // Le ternaire de `BoatIncidentForm.vue` : deux constantes dans une seule
    // expression. Si la résolution retombait au littéral simple, seul ce témoin
    // le dirait.
    assert.isTrue(enqueued.has('create-incident'), 'les constantes d’un ternaire ne sont plus lues')
    assert.isTrue(enqueued.has('update-incident'), 'les constantes d’un ternaire ne sont plus lues')
  })

  test('aucun identifiant d’action n’est plus écrit en littéral', ({ assert }) => {
    // Le cœur de #726 : un littéral réécrit à la main contourne l'union fermée
    // et rouvre le trou — les deux moitiés peuvent à nouveau diverger sans que
    // rien ne casse à la compilation.
    const constants = declaredActions()
    const literals = [
      ...serverActions(constants).literals,
      ...enqueuedActions(constants).literals,
      ...conflictModalActions(constants).literals,
    ].sort()

    assert.deepEqual(
      literals,
      [],
      `identifiants d'actions écrits en littéral : ${literals.join(', ')} — ` +
        `les importer depuis shared/constants/offline_queue.ts (#726)`
    )
  })

  test('tout type renvoyé par le serveur est un type que le front enfile', ({ assert }) => {
    const constants = declaredActions()
    const enqueued = new Set(enqueuedActions(constants).types)
    const orphans = [...new Set(serverActions(constants).types)]
      .filter((type) => !enqueued.has(type))
      .sort()

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
    const constants = declaredActions()
    const server = new Set(serverActions(constants).types)
    const orphans = [...new Set(enqueuedActions(constants).types)]
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
    const constants = declaredActions()
    const enqueued = new Set(enqueuedActions(constants).types)
    const stale = [...ENQUEUED_WITHOUT_SERVER_ANSWER.keys()]
      .filter((type) => !enqueued.has(type))
      .sort()

    assert.deepEqual(stale, [], `exemptions périmées à retirer : ${stale.join(', ')}`)
  })

  test('chaque constante déclarée sert quelque part', ({ assert }) => {
    // La source unique n'est une source que si elle reste branchée : une
    // constante que ni un contrôleur ni un composant n'emploie est du
    // vocabulaire mort qui gonfle l'union.
    const constants = declaredActions()
    const used = new Set([...serverActions(constants).types, ...enqueuedActions(constants).types])
    const unused = [...constants.values()].filter((type) => !used.has(type)).sort()

    assert.deepEqual(
      unused,
      [],
      `constantes déclarées que personne n'emploie : ${unused.join(', ')}`
    )
  })

  test('chaque type déclaré a son libellé dans les deux locales', ({ assert }) => {
    // `OfflinePendingQueue.vue` construit `common.offline.queue.type.<type>` et
    // retombe sur l'identifiant brut quand la clé manque : sans libellé,
    // l'utilisateur lit « update-navigation-log-entry » dans le panneau de la
    // file. Le fallback ne casse rien, donc rien d'autre ne le dirait.
    const types = [...declaredActions().values()]
    const missing: string[] = []

    for (const locale of ['en', 'fr']) {
      const labels = JSON.parse(
        readFileSync(join(ROOT, `resources/lang/${locale}/common.json`), 'utf8')
      ) as Record<string, string>
      for (const type of types) {
        if (!labels[`offline.queue.type.${type}`]) missing.push(`${locale} : ${type}`)
      }
    }

    assert.deepEqual(
      missing.sort(),
      [],
      `libellés de file manquants : ${missing.join(', ')} — la file afficherait l'identifiant brut`
    )
  })

  test('chaque type de conflit a sa carte de champs dans la modale', ({ assert }) => {
    // Sans entrée dans `FIELDS_BY_TYPE`, `rows` est vide : la modale s'ouvre,
    // demande à l'utilisateur de trancher, et ne lui montre rien.
    const constants = declaredActions()
    const modal = new Set(conflictModalActions(constants).types)
    const conflictTypes = new Set<string>()
    const flashCall = /session\.flash\(\s*'conflictType'\s*,\s*([^)]+?)\s*\)/g

    for (const file of walk(CONTROLLERS_DIR, ['.ts'])) {
      for (const match of readFileSync(file, 'utf8').matchAll(flashCall)) {
        for (const type of readExpression(match[1], constants).types) conflictTypes.add(type)
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
