/**
 * Génère la matrice de shards du job `test-backend` de la CI (#687).
 *
 * Avant : les filtres `--files` de chaque shard étaient une **allowlist** de
 * répertoires écrite à la main dans `.github/workflows/ci.yml`. Créer
 * `tests/functional/reservations/` produisait des tests qui passaient en local
 * (`pnpm test` prend toute la suite) mais ne tournaient jamais en CI, sans que
 * rien n'échoue — un angle mort silencieux.
 *
 * Maintenant : la matrice est dérivée de l'arborescence à chaque exécution. Un
 * nouveau répertoire (ou un nouveau fichier) est shardé automatiquement, et
 * `tests/unit/hygiene/ci_shards.spec.ts` échoue si un spec cessait d'être
 * couvert.
 *
 * Répartition : au **fichier** près, pas au répertoire. `tests/functional/boats/`
 * pèse à lui seul ~40 % des tests fonctionnels ; tant qu'il était l'unité
 * indivisible d'un shard, il fixait le chemin critique de la CI quel que soit
 * le nombre de shards. Le packing se fait donc fichier par fichier, pondéré par
 * le nombre de déclarations `test(...)` du fichier (proxy du temps d'exécution),
 * par LPT (*longest processing time first*) : on trie par poids décroissant et
 * on pose chaque fichier dans le shard le moins chargé.
 *
 * Les filtres émis sont des chemins relatifs complets (`tests/functional/boats/
 * boat_engines.spec.ts`). Japa retient un fichier dès que son chemin absolu
 * `endsWith()` le filtre (`FilesManager#grep`), donc un chemin complet désigne
 * exactement un fichier — contrairement aux filtres par segment (`boats/*`),
 * qui matchent par suffixe de segment et peuvent déborder.
 *
 * Usage :
 *   node scripts/ci_test_shards.mjs            # JSON compact (consommé par la CI)
 *   node scripts/ci_test_shards.mjs --explain  # tableau lisible des shards
 *   node scripts/ci_test_shards.mjs --shards=6 # simuler un autre découpage
 *
 * Pour raccourcir la CI : augmenter FUNCTIONAL_SHARD_COUNT. Aucun autre
 * changement n'est nécessaire, la matrice et les filtres suivent.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const FUNCTIONAL_SHARD_COUNT = 4

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const FUNCTIONAL_DIR = 'tests/functional'

/** `test(` et ses variantes (`test.failing(`, `test.skip(`…), mais pas `test.group(`. */
const TEST_DECLARATION = /^[ \t]*test(?!\.group\b)(?:\.[a-zA-Z]+)*\s*\(/gm

/**
 * Tous les specs fonctionnels, en chemins relatifs à la racine du dépôt, triés.
 * La récursion couvre d'éventuels sous-répertoires : un filtre en chemin
 * complet n'a pas la limite de profondeur du glob `dossier/*`.
 */
export function functionalSpecFiles() {
  return readdirSync(join(ROOT, FUNCTIONAL_DIR), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
}

/** Nombre de tests déclarés dans le fichier ; au moins 1 pour qu'aucun fichier ne pèse zéro. */
export function weightOf(file) {
  const matches = readFileSync(join(ROOT, file), 'utf8').match(TEST_DECLARATION)
  return Math.max(matches?.length ?? 0, 1)
}

/**
 * Répartit les specs en `count` groupes équilibrés (LPT). Déterministe : à poids
 * égal l'ordre alphabétique tranche, et un shard vide n'est jamais émis tant
 * qu'il y a plus de fichiers que de shards.
 */
export function buildFunctionalShards(count = FUNCTIONAL_SHARD_COUNT) {
  const bins = Array.from({ length: count }, () => ({ files: [], weight: 0 }))

  const weighted = functionalSpecFiles()
    .map((file) => ({ file, weight: weightOf(file) }))
    .sort((a, b) => b.weight - a.weight || a.file.localeCompare(b.file))

  for (const { file, weight } of weighted) {
    const lightest = bins.reduce((min, bin) => (bin.weight < min.weight ? bin : min), bins[0])
    lightest.files.push(file)
    lightest.weight += weight
  }

  return bins.map((bin, index) => ({
    name: `functional-${index + 1}`,
    suites: 'functional',
    files: bin.files.sort().join(','),
    weight: bin.weight,
  }))
}

/**
 * La matrice complète du job `test-backend`. Les suites `unit` et `integration`
 * gardent leur shard dédié : elles ne touchent pas au serveur HTTP et tournent
 * sans `truncateDb()` entre chaque test, donc leur coût n'est pas comparable à
 * celui du fonctionnel — les mélanger déséquilibrerait le packing.
 */
export function buildMatrix(count = FUNCTIONAL_SHARD_COUNT) {
  return [
    { name: 'unit-integration', suites: 'unit integration', files: '' },
    ...buildFunctionalShards(count).map(({ name, suites, files }) => ({ name, suites, files })),
  ]
}

// `process.argv[1]` est absent quand le module est importé par un autre
// process (le test-garde, un `node -e`) : ne pas le tester ferait lever
// pathToFileURL au simple import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const shardsArg = process.argv.find((arg) => arg.startsWith('--shards='))
  const count = shardsArg ? Number(shardsArg.split('=')[1]) : FUNCTIONAL_SHARD_COUNT

  if (!Number.isInteger(count) || count < 1) {
    console.error(`--shards doit être un entier >= 1 (reçu : ${shardsArg})`)
    process.exit(1)
  }

  if (process.argv.includes('--explain')) {
    const shards = buildFunctionalShards(count)
    const total = shards.reduce((sum, shard) => sum + shard.weight, 0)
    console.log(`${functionalSpecFiles().length} specs fonctionnels, ${total} tests, ${count} shards`)
    for (const shard of shards) {
      const share = ((shard.weight / total) * 100).toFixed(1)
      console.log(
        `  ${shard.name.padEnd(14)} ${String(shard.files.split(',').length).padStart(3)} fichiers  ` +
          `${String(shard.weight).padStart(4)} tests  (${share} %)`
      )
    }
  } else {
    console.log(JSON.stringify(buildMatrix(count)))
  }
}
