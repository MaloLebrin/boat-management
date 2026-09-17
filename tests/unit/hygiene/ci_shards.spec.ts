import { test } from '@japa/runner'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde d'exécution des shards de CI (#687).
 *
 * `.github/workflows/ci.yml` faisait tourner les tests fonctionnels via une
 * allowlist de répertoires écrite à la main. Un répertoire absent de cette
 * liste ne tournait jamais en CI, sans qu'aucun job n'échoue : l'échec était
 * silencieux, et c'est exactement ce que produit toute nouvelle campagne de
 * tests qui crée un répertoire.
 *
 * La matrice est maintenant générée par `scripts/ci_test_shards.mjs`. Ce test
 * rejoue l'algorithme de filtrage de Japa (`FilesManager#grep`) sur les filtres
 * émis et vérifie que l'ensemble des specs fonctionnels est **exactement**
 * couvert — ni oubli, ni doublon.
 */

interface Shard {
  name: string
  suites: string
  files: string
}

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))

// Spécifieur non littéral : le module est un .mjs sans déclarations de types.
const generatorUrl = new URL('../../../scripts/ci_test_shards.mjs', import.meta.url).href
const { buildMatrix } = (await import(generatorUrl)) as {
  buildMatrix: (count?: number) => Shard[]
}

/**
 * Le balayage du disque est **réimplémenté ici**, il n'appelle pas le
 * `functionalSpecFiles()` du générateur : sinon la garde hériterait du même
 * angle mort que ce qu'elle surveille (un scan cassé produirait une liste de
 * référence cassée à l'identique, et le test resterait vert).
 */
function specFilesOnDisk(): string[] {
  return readdirSync(join(ROOT, 'tests/functional'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
}

/**
 * Réimplémentation fidèle de `FilesManager#grep` de @japa/runner : un fichier
 * est retenu si son chemin absolu se termine par le filtre, ou si chaque
 * segment du filtre (lu depuis la fin) est un suffixe du segment correspondant
 * du chemin privé de son extension `.spec.ts`.
 */
function japaGrep(absolutePaths: string[], filters: string[]): string[] {
  return absolutePaths.filter((path) => {
    const withoutSuffix = path.replace(/\.spec\.(ts|js)$/, '')
    return filters.some((filter) => {
      if (path.endsWith(filter)) return true
      const filterSegments = filter.split('/').reverse()
      const fileSegments = withoutSuffix.split('/').reverse()
      return filterSegments.every(
        (segment, index) =>
          fileSegments[index] && (segment === '*' || fileSegments[index].endsWith(segment))
      )
    })
  })
}

test.group('CI shards hygiene (unit)', () => {
  const specs = specFilesOnDisk()
  const absoluteSpecs = specs.map((file) => `${ROOT}${file}`)
  const matrix = buildMatrix()
  const functionalShards = matrix.filter((shard) => shard.suites === 'functional')

  test('the repository still holds the functional suite this guard assumes', ({ assert }) => {
    assert.isAbove(specs.length, 100)
  })

  test('the shard filters cover every functional spec exactly once', ({ assert }) => {
    const seen = new Map<string, string[]>()

    for (const shard of functionalShards) {
      for (const matched of japaGrep(absoluteSpecs, shard.files.split(','))) {
        seen.set(matched, [...(seen.get(matched) ?? []), shard.name])
      }
    }

    const missing = absoluteSpecs.filter((file) => !seen.has(file))
    const duplicated = [...seen.entries()].filter(([, shards]) => shards.length > 1)

    // Le message nomme le fichier orphelin : c'est tout l'intérêt de la garde.
    assert.deepEqual(
      missing.map((file) => file.replace(ROOT, '')),
      [],
      'ces specs ne sont couverts par aucun shard et ne tourneraient jamais en CI'
    )
    assert.deepEqual(
      duplicated.map(([file, shards]) => `${file.replace(ROOT, '')} → ${shards.join(', ')}`),
      [],
      'ces specs tourneraient plusieurs fois'
    )
  })

  test('no shard is empty and the load stays balanced', ({ assert }) => {
    const sizes = functionalShards.map(
      (shard) => japaGrep(absoluteSpecs, shard.files.split(',')).length
    )

    assert.isAbove(Math.min(...sizes), 0, 'un shard vide gâche un runner')
    // LPT pondéré par le nombre de tests : l'écart de *fichiers* reste large,
    // ce seuil ne sanctionne qu'un packer franchement cassé.
    assert.isBelow(Math.max(...sizes) / (specs.length / functionalShards.length), 2)
  })

  test('the unit and integration suites run unfiltered', ({ assert }) => {
    const unitShard = matrix.find((shard) => shard.suites === 'unit integration')

    assert.exists(unitShard)
    assert.equal(unitShard!.files, '')
  })

  test('the workflow consumes the generated matrix, not a hand-written allowlist', ({ assert }) => {
    const workflow = readFileSync(`${ROOT}.github/workflows/ci.yml`, 'utf8')

    assert.include(workflow, 'node scripts/ci_test_shards.mjs')
    assert.include(workflow, 'fromJson(needs.test-backend-matrix.outputs.shards)')
    assert.notMatch(
      workflow,
      /files: "[^"]*\*/,
      'un filtre --files écrit à la main est réapparu : il redeviendrait une allowlist'
    )
  })
})
