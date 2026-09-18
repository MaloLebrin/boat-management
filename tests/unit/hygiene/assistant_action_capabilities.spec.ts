import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde de cohérence des gardes d'action du copilote (#697).
 *
 * La capability d'une action est déclarée **deux fois**, dans deux fichiers qui
 * ne se lisent pas l'un l'autre :
 *
 * 1. `ASSISTANT_ACTION_META[kind].capability` (`shared/types/assistant.ts`) —
 *    consommée par `allowedKindsFor`, donc par le prompt (les kinds offerts au
 *    modèle), la validation de proposition, et le masquage du bouton côté front ;
 * 2. le `switch` d'`AssistantActionsService.authorizeConfirm` — qui, lui,
 *    n'appelle pas la capability mais une **méthode de policy**, laquelle relit
 *    sa propre capability.
 *
 * Les deux coïncident aujourd'hui. Rien ne le garantit demain, et la divergence
 * est silencieuse dans les deux sens :
 *
 * - méta plus **permissif** que la confirmation : le bouton s'affiche, la
 *   confirmation refuse — le défaut de la famille #456 ;
 * - méta plus **strict** : le modèle ne propose jamais l'action, la branche
 *   d'exécution devient du code mort que personne n'atteint.
 *
 * ⚠️ Cette garde **relit le disque** au lieu d'importer `ASSISTANT_ACTION_META`.
 * Une garde qui partagerait sa source avec sa cible hériterait de ses angles
 * morts. Même intention que `tests/unit/hygiene/policies_covered.spec.ts` et
 * `offline_protocol_vocabulary.spec.ts`.
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const TYPES_FILE = join(ROOT, 'shared/types/assistant.ts')
const SERVICE_FILE = join(ROOT, 'app/services/assistant_actions_service.ts')
const POLICIES_DIR = join(ROOT, 'app/policies')

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

/** `create_task: { capability: 'maintenance.create' },` → `create_task → maintenance.create`. */
function metaCapabilities(): Map<string, string> {
  const source = read(TYPES_FILE)
  const block = source.slice(source.indexOf('ASSISTANT_ACTION_META'))
  const entries = new Map<string, string>()
  for (const [, kind, capability] of block.matchAll(/^ {2}([a-z_]+): \{ capability: '([^']+)'/gm)) {
    entries.set(kind, capability)
  }
  return entries
}

/** Les neuf kinds déclarés, dans l'ordre de `ASSISTANT_ACTION_KINDS`. */
function declaredKinds(): string[] {
  const source = read(TYPES_FILE)
  const start = source.indexOf('export const ASSISTANT_ACTION_KINDS')
  const block = source.slice(start, source.indexOf('] as const', start))
  return [...block.matchAll(/^ {2}'([a-z_]+)',$/gm)].map(([, kind]) => kind)
}

/** `import BoatPolicy from '#policies/boat_policy'` → `BoatPolicy → boat_policy.ts`. */
function policyFileByClass(): Map<string, string> {
  const files = new Map<string, string>()
  for (const [, name, file] of read(SERVICE_FILE).matchAll(
    /^import (\w+Policy) from '#policies\/(\w+)'$/gm
  )) {
    files.set(name, `${file}.ts`)
  }
  return files
}

/**
 * Le `switch` de `authorizeConfirm`, chutes comprises : plusieurs `case` peuvent
 * partager un même `authorize` (`add_engine_hours` et `set_part_stock` passent
 * tous deux par `BoatPolicy.edit`). On accumule les étiquettes jusqu'à l'appel.
 */
function confirmationPolicies(): Map<string, { policy: string; method: string }> {
  const source = read(SERVICE_FILE)
  const start = source.indexOf('async authorizeConfirm(')
  const block = source.slice(start, source.indexOf('\n  }', start))

  const bound = new Map<string, { policy: string; method: string }>()
  let pending: string[] = []
  for (const line of block.split('\n')) {
    const label = line.match(/^ {6}case '([a-z_]+)':$/)
    if (label !== null) {
      pending.push(label[1])
      continue
    }
    const call = line.match(/bouncer\.with\((\w+)\)\.authorize\('(\w+)'/)
    if (call !== null) {
      for (const kind of pending) bound.set(kind, { policy: call[1], method: call[2] })
      pending = []
    }
  }
  return bound
}

/** `async create(user, boat) { return … this.can(user, 'maintenance.create') }`. */
function capabilityOfPolicyMethod(file: string, method: string): string | null {
  const source = read(join(POLICIES_DIR, file))
  const start = source.search(new RegExp(`^ {2}(?:async )?${method}\\(`, 'm'))
  if (start === -1) return null
  const body = source.slice(start, source.indexOf('\n  }', start))
  const capability = body.match(/this\.can\(user, '([^']+)'\)/)
  return capability === null ? null : capability[1]
}

test.group("Hygiene — les gardes d'action du copilote sont déclarées une seule fois", () => {
  test('la lecture des trois sources ne rend pas des ensembles vides', ({ assert }) => {
    // Sans ce cas, une regex cassée rendrait tous les autres verts sur du vide.
    assert.lengthOf(declaredKinds(), 9, 'ASSISTANT_ACTION_KINDS n’est plus lu correctement')
    assert.equal(metaCapabilities().size, 9, 'ASSISTANT_ACTION_META n’est plus lu correctement')
    assert.equal(
      confirmationPolicies().size,
      9,
      'le switch d’authorizeConfirm n’est plus lu correctement'
    )
    assert.isAbove(policyFileByClass().size, 4, 'les imports de policy ne sont plus lus')
  })

  test('chaque kind déclaré est autorisé à la confirmation', ({ assert }) => {
    const bound = confirmationPolicies()
    const orphans = declaredKinds().filter((kind) => !bound.has(kind))

    assert.deepEqual(
      orphans,
      [],
      `kinds sans branche dans authorizeConfirm : ${orphans.join(', ')} — ` +
        'un kind absent du switch traverse le Bouncer sans être autorisé'
    )
  })

  test('la policy de confirmation lit bien la capability annoncée par le méta', ({ assert }) => {
    const meta = metaCapabilities()
    const files = policyFileByClass()
    const divergences: string[] = []

    for (const [kind, { policy, method }] of confirmationPolicies()) {
      const file = files.get(policy)
      if (file === undefined) {
        divergences.push(`${kind} : ${policy} n’est pas importée par le service`)
        continue
      }
      const enforced = capabilityOfPolicyMethod(file, method)
      if (enforced === null) {
        divergences.push(`${kind} : ${policy}.${method} ne lit aucune capability`)
        continue
      }
      const announced = meta.get(kind)
      if (enforced !== announced) {
        divergences.push(
          `${kind} : le méta annonce '${announced}', ${policy}.${method} exige '${enforced}'`
        )
      }
    }

    assert.deepEqual(
      divergences,
      [],
      `la garde annoncée et la garde appliquée divergent :\n  ${divergences.join('\n  ')}`
    )
  })

  test('aucune branche du switch ne vise un kind inconnu', ({ assert }) => {
    const kinds = new Set(declaredKinds())
    const ghosts = [...confirmationPolicies().keys()].filter((kind) => !kinds.has(kind))

    // Une étiquette survivant à la suppression d'un kind est du code mort que
    // TypeScript ne signale pas : le `switch` n'est pas exhaustif sur un type.
    assert.deepEqual(ghosts, [], `branches orphelines dans authorizeConfirm : ${ghosts.join(', ')}`)
  })

  test('les deux kinds à drapeau de plan sont re-vérifiés à l’exécution', ({ assert }) => {
    // Le méta le promet en commentaire ; c'est `execute()` qui le tient, pas
    // `authorizeConfirm()` — le Bouncer ne connaît que les capabilities.
    const types = read(TYPES_FILE)
    const flagged = [...types.matchAll(/^ {2}([a-z_]+): \{ capability: '[^']+', planFlag: /gm)].map(
      ([, kind]) => kind
    )
    assert.deepEqual(flagged.sort(), ['create_client', 'create_reservation'])

    const service = read(SERVICE_FILE)
    const execute = service.slice(service.indexOf('  async execute('))
    assert.include(
      execute.slice(0, 600),
      'if (meta.planFlag !== undefined)',
      'execute() ne re-vérifie plus le drapeau de plan — une proposition survivrait à une rétrogradation'
    )
  })
})
