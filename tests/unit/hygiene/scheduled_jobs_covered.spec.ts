import { test } from '@japa/runner'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde d'exhaustivité des jobs et des tâches planifiées (#699).
 *
 * Les sept crons de `start/scheduler.ts` sont le travail qui s'exécute quand
 * personne ne regarde, et aucun n'était testé. Pire : chacun **délègue** à un
 * service, et seuls les services l'étaient — un `execute()` vidé de son corps
 * aurait passé toute la suite. Personne n'aurait reçu d'e-mail de rappel, et
 * aucun test n'aurait bronché.
 *
 * ⚠️ Comme ses sœurs (`ci_shards.spec.ts` #687, `policies_covered.spec.ts` #690,
 * `inertia_pages_covered.spec.ts` #689), cette garde **relit le disque** plutôt
 * que d'importer une liste depuis le code surveillé : une garde qui partage sa
 * source avec sa cible hérite de ses angles morts.
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const JOBS_DIR = join(ROOT, 'app/jobs')
const TESTS_DIR = join(ROOT, 'tests')
const SCHEDULER = join(ROOT, 'start/scheduler.ts')

/**
 * Jobs volontairement non couverts ici, chacun avec son motif et son issue.
 * Une exemption sans raison écrite est une régression déguisée.
 */
const EXEMPT = new Map<string, string>([
  [
    'process_media',
    'traitement des médias — couvert par le domaine bateau (#692), avec les fabriques Cloudinary.',
  ],
  [
    'process_boat_maintenance_import',
    "import CSV de maintenance — couvert par le domaine maintenance (#693), avec ses fichiers d'exemple.",
  ],
])

function jobFiles(): string[] {
  return readdirSync(JOBS_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => name.replace(/\.ts$/, ''))
    .sort()
}

function specSources(): string {
  // Ce fichier-ci est exclu du balayage : il cite forcément des chemins `#jobs/…`
  // dans ses messages et ses commentaires, et se compterait alors lui-même comme
  // couvrant les jobs qu'il nomme. La garde resterait verte en **silence** —
  // vérifié : sans cette exclusion, supprimer un spec de job ne la faisait pas
  // tomber.
  const self = fileURLToPath(import.meta.url)

  return readdirSync(TESTS_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((file) => file !== self)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')
}

/** Les jobs importés par `start/scheduler.ts`, avec leur expression cron. */
function scheduledJobs(): { job: string; cron: string }[] {
  const source = readFileSync(SCHEDULER, 'utf8')
  const imports = new Map<string, string>()

  for (const [, className, file] of source.matchAll(/import (\w+) from '#jobs\/([\w_]+)'/g)) {
    imports.set(className, file)
  }

  const scheduled: { job: string; cron: string }[] = []
  for (const [, className, cron] of source.matchAll(
    /await (\w+)\.schedule\(\{\}\)\s*\.cron\('([^']+)'\)/g
  )) {
    const file = imports.get(className)
    if (file) scheduled.push({ job: file, cron })
  }

  return scheduled
}

/** Heure de la journée d'une expression cron `m h * * *`. */
function hourOf(cron: string): number {
  return Number(cron.split(' ')[1])
}

test.group('Hygiene — every job and every cron is covered', () => {
  test('the jobs directory still holds what this guard assumes', ({ assert }) => {
    // Si la découverte se casse, tous les autres tests passent au vert sur un
    // ensemble vide.
    assert.isAbove(jobFiles().length, 15, 'la découverte des jobs ne renvoie presque rien')
  })

  test('the scheduler still declares its crons', ({ assert }) => {
    assert.isAtLeast(
      scheduledJobs().length,
      7,
      'le scan du scheduler ne trouve plus les crons — la regex a cessé de matcher'
    )
  })

  test('every job is named by at least one spec', ({ assert }) => {
    const specs = specSources()
    const uncovered = jobFiles()
      .filter((job) => !EXEMPT.has(job))
      .filter((job) => !specs.includes(`#jobs/${job}`))

    assert.deepEqual(
      uncovered,
      [],
      `jobs sans aucun test : ${uncovered.join(', ')} — ajouter un fichier dans tests/integration/jobs/`
    )
  })

  test('every scheduled job is covered — a cron runs unattended', ({ assert }) => {
    const specs = specSources()
    const uncovered = scheduledJobs()
      .filter(({ job }) => !specs.includes(`#jobs/${job}`))
      .map(({ job, cron }) => `${job} (${cron})`)

    // Une exemption est tolérable sur un job à la demande, jamais sur un cron :
    // personne ne constate son absence de résultat.
    assert.deepEqual(uncovered, [], `crons sans test : ${uncovered.join(', ')}`)
  })

  test('every exemption names a job that still exists', ({ assert }) => {
    const jobs = new Set(jobFiles())
    const stale = [...EXEMPT.keys()].filter((job) => !jobs.has(job))

    assert.deepEqual(stale, [], `exemptions périmées : ${stale.join(', ')}`)
  })

  test('AI suggestions are generated before the fleet scan reads them', ({ assert }) => {
    // Contrat d'ordonnancement écrit en commentaire dans `start/scheduler.ts` :
    // les notifications « nouvelles suggestions IA » doivent partir avec la
    // fournée du matin. Inverser les deux heures les décalerait d'un jour, sans
    // rien casser de visible.
    const scheduled = new Map(scheduledJobs().map(({ job, cron }) => [job, cron]))
    const suggestions = scheduled.get('generate_ai_suggestions')
    const scan = scheduled.get('scan_fleet_notifications')

    assert.isDefined(suggestions)
    assert.isDefined(scan)
    assert.isBelow(
      hourOf(suggestions!),
      hourOf(scan!),
      'les suggestions IA doivent être générées avant le scan qui les notifie'
    )
  })
})
