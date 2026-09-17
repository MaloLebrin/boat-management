import { test } from '@japa/runner'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde d'exhaustivité de la couverture ACL (#690).
 *
 * Sans elle, la 20ᵉ policy arrivera sans test et personne ne le verra : rien
 * dans la CI ne compte les fichiers. Même intention que
 * `tests/unit/hygiene/ci_shards.spec.ts`.
 *
 * ⚠️ Cette garde **relit le disque** au lieu d'importer une liste depuis le
 * code testé. Une garde qui partagerait sa source avec sa cible hériterait de
 * ses angles morts : si `policies.ts` oubliait une policy, une garde bâtie sur
 * `policies.ts` oublierait la même — et resterait verte.
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const POLICIES_DIR = join(ROOT, 'app/policies')
const SPECS_DIR = join(ROOT, 'tests/unit/policies')

/** Méthodes publiques d'une policy : `async view(user…)` ou `viewShare(user…)`. */
const PUBLIC_METHOD = /^ {2}(?:async )?([a-z][A-Za-z]*)\s*\(/gm

function policyFiles(): string[] {
  return readdirSync(POLICIES_DIR)
    .filter((name) => name.endsWith('_policy.ts'))
    .sort()
}

function publicMethodsOf(policyFile: string): string[] {
  const source = readFileSync(join(POLICIES_DIR, policyFile), 'utf8')
  const methods = new Set<string>()
  for (const [, name] of source.matchAll(PUBLIC_METHOD)) {
    // `before`, `can` et `sameOrg` vivent dans OrgScopedPolicy et sont couverts
    // par `tests/integration/permissions/policy_before_hook.spec.ts`.
    if (['before', 'can', 'sameOrg', 'constructor'].includes(name)) continue
    methods.add(name)
  }
  return [...methods].sort()
}

test.group('Hygiene — every policy is covered by a unit spec', () => {
  test('the policies directory is not empty', ({ assert }) => {
    // Si la découverte se casse, tous les autres tests de ce fichier passent
    // au vert sur un ensemble vide.
    assert.isAbove(policyFiles().length, 15, 'la découverte des policies ne renvoie presque rien')
  })

  test('each policy has a matching spec file', ({ assert }) => {
    const specs = new Set(readdirSync(SPECS_DIR))
    const missing = policyFiles()
      .map((file) => file.replace(/\.ts$/, '.spec.ts'))
      .filter((spec) => !specs.has(spec))

    assert.deepEqual(
      missing,
      [],
      `policies sans spec unit : ${missing.join(', ')} — ajouter le fichier dans tests/unit/policies/`
    )
  })

  test('each public policy method is named in its spec', ({ assert }) => {
    const uncovered: string[] = []

    for (const policyFile of policyFiles()) {
      const specPath = join(SPECS_DIR, policyFile.replace(/\.ts$/, '.spec.ts'))
      let spec: string
      try {
        spec = readFileSync(specPath, 'utf8')
      } catch {
        continue // signalé par le test précédent
      }

      for (const method of publicMethodsOf(policyFile)) {
        // Le nom apparaît soit en déclaration de matrice (`name: 'view'`), soit
        // en appel direct (`policy.view(`).
        const declared = spec.includes(`name: '${method}'`)
        const called = spec.includes(`policy.${method}(`)
        if (!declared && !called) uncovered.push(`${policyFile}#${method}`)
      }
    }

    assert.deepEqual(uncovered, [], `actions de policy non testées : ${uncovered.join(', ')}`)
  })

  test('every spec file matches an existing policy', ({ assert }) => {
    const policies = new Set(policyFiles().map((file) => file.replace(/\.ts$/, '.spec.ts')))
    const orphans = readdirSync(SPECS_DIR)
      .filter((name) => name.endsWith('.spec.ts'))
      .filter((name) => !policies.has(name))

    // Une policy supprimée doit emporter son spec : un spec orphelin continue
    // de tester du code mort et gonfle la CI pour rien.
    assert.deepEqual(orphans, [], `specs sans policy correspondante : ${orphans.join(', ')}`)
  })
})
