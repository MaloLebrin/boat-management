import { test } from '@japa/runner'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde d'exhaustivité du contrat de page Inertia (#689).
 *
 * Le dépôt compte 812 `assertStatus` mais n'épinglait le composant rendu que
 * pour 35 pages sur 84. Le reste des tests vérifie les **données** sans jamais
 * figer **quelle page** les reçoit : un contrôleur qui passerait de
 * `inertia.render('boats/show')` à un autre composant, à props égales,
 * traverserait la CI au vert.
 *
 * Pire, `@japa/api-client` suit cinq redirections par défaut : un GET protégé
 * qui redirige vers `/login` renvoie un **200 Inertia parfaitement valide pour
 * `auth/login`**. Lire `inertiaProps` ne le voit pas. Seul l'épinglage du
 * composant le voit.
 *
 * ⚠️ Cette garde **relit le disque** au lieu d'importer une liste depuis le
 * code testé. Une garde qui partagerait sa source avec sa cible hériterait de
 * ses angles morts — et resterait verte. Même intention que
 * `tests/unit/hygiene/ci_shards.spec.ts` (#687) et
 * `tests/unit/hygiene/policies_covered.spec.ts` (#690).
 */

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const APP_DIR = join(ROOT, 'app')
const ROUTES_DIR = join(ROOT, 'start')
const TESTS_DIR = join(ROOT, 'tests')

/**
 * Pages rendues mais volontairement non épinglées. Toute entrée porte son
 * motif : une exemption sans raison écrite est une régression déguisée.
 */
const EXEMPT = new Map<string, string>([
  [
    'home',
    'branche morte : `HomeController#index` rend `home` quand `auth.isAuthenticated` est faux, ' +
      'mais sa seule route est `/dashboard`, derrière `middleware.auth()` — la condition ne peut ' +
      "jamais être vraie. L'accueil public est servi par `marketing/home`. À supprimer côté " +
      'production, hors du périmètre de #689 qui ne touche pas au comportement.',
  ],
  [
    'errors/not_found',
    'inatteignable en test : les `statusPages` du handler ne sont montées que si ' +
      '`app.inProduction`. Vérifié — un GET sur une route inconnue rend du HTML nu, sans ' +
      "en-tête `x-inertia`, donc rien à épingler. Un test ici n'attesterait que de l'environnement.",
  ],
  [
    'errors/server_error',
    'même raison que `errors/not_found` : `renderStatusPages` est faux hors production. ' +
      '`errors/forbidden`, elle, est rendue explicitement par le handler (#458) et reste épinglée.',
  ],
])

/**
 * Les deux façons de rendre une page : depuis un contrôleur
 * (`inertia.render('boats/index', …)`) ou directement depuis une route
 * (`router.on('/design-system').renderInertia('design_system', …)`). Oublier la
 * seconde laisserait une page hors du périmètre de la garde sans que rien ne le
 * dise. La chaîne doit être un littéral simple.
 */
const RENDER_LITERAL = /(?:inertia\.render|renderInertia)\(\s*'([^']+)'/g
const RENDER_ANY = /inertia\.render\(|renderInertia\(/g

/**
 * Les deux façons d'épingler une page.
 *
 * `assertPageContract` est la forme complète (composant **et** props requises
 * dérivées du `defineProps`) et celle qu'emploient les specs de contrat. Mais
 * un `assertInertiaComponent('…')` littéral épingle bien l'identité de la page,
 * et 24 specs antérieurs à #689 l'utilisent légitimement : les compter évite de
 * réécrire des tests corrects pour satisfaire une garde. Ce que la garde
 * vérifie, c'est qu'une page **est** épinglée quelque part — pas qu'elle l'est
 * par un helper en particulier.
 */
const COMPONENT_LITERAL = /assertInertiaComponent\(\s*'([^']+)'/g
const COMPONENT_ANY = /assertInertiaComponent\(/g

function sourceFiles(dir: string, extension: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
}

function scan(files: string[], literal: RegExp, any: RegExp) {
  const names = new Set<string>()
  const nonLiteral: string[] = []

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const literalCount = [...source.matchAll(new RegExp(literal))].length
    const totalCount = [...source.matchAll(new RegExp(any))].length

    for (const [, name] of source.matchAll(new RegExp(literal))) names.add(name)

    // Un appel dont l'argument n'est pas un littéral échappe au scan : la garde
    // le déclarerait non couvert (faux négatif) ou, pire, raccrocherait le nom
    // d'un appel voisin. On le signale plutôt que de deviner.
    if (totalCount > literalCount) {
      nonLiteral.push(`${file.replace(ROOT, '')} (${totalCount - literalCount})`)
    }
  }

  return { names: [...names].sort(), nonLiteral }
}

/**
 * Nom de page d'un `assertPageContract(assert, <réponse>, 'page')`.
 *
 * Une regex ne suffit pas : prettier répartit l'appel sur plusieurs lignes et le
 * deuxième argument est souvent une expression entière
 * (`await client.get('/ports').loginAs(user).withInertia()`) qui contient
 * elle-même des littéraux. On parcourt donc l'appel à parenthèses équilibrées et
 * on retient le **premier littéral de profondeur 1** — les chaînes des appels
 * imbriqués sont plus profondes, et ne peuvent pas être confondues avec le nom
 * de la page.
 */
function contractNames(source: string): { names: string[]; nonLiteral: number } {
  const names: string[] = []
  let nonLiteral = 0

  for (const match of source.matchAll(/assertPageContract\(/g)) {
    const found = firstTopLevelString(source, match.index + match[0].length)
    if (found === null) nonLiteral++
    else names.push(found)
  }

  return { names, nonLiteral }
}

/** Premier littéral simple rencontré à la profondeur d'ouverture, ou `null`. */
function firstTopLevelString(source: string, start: number): string | null {
  let depth = 1

  for (let index = start; index < source.length; index++) {
    const char = source[index]

    if (char === '(' || char === '[' || char === '{') depth++
    else if (char === ')' || char === ']' || char === '}') {
      depth--
      if (depth === 0) return null
    } else if (char === "'" && depth === 1) {
      const end = source.indexOf("'", index + 1)
      if (end === -1) return null
      return source.slice(index + 1, end)
    }
  }

  return null
}

function rendered() {
  return scan(
    [...sourceFiles(APP_DIR, '.ts'), ...sourceFiles(ROUTES_DIR, '.ts')],
    RENDER_LITERAL,
    RENDER_ANY
  )
}

function pinned() {
  // Ce fichier-ci cite `assertPageContract(` dans ses commentaires et ses
  // regex : se scanner soi-même le ferait passer pour un appel non littéral.
  const self = fileURLToPath(import.meta.url)
  const files = sourceFiles(TESTS_DIR, '.spec.ts').filter((file) => file !== self)

  const byComponent = scan(files, COMPONENT_LITERAL, COMPONENT_ANY)
  const names = new Set(byComponent.names)
  const nonLiteral = [...byComponent.nonLiteral]

  for (const file of files) {
    const contracts = contractNames(readFileSync(file, 'utf8'))
    for (const name of contracts.names) names.add(name)
    if (contracts.nonLiteral > 0) {
      nonLiteral.push(`${file.replace(ROOT, '')} (${contracts.nonLiteral})`)
    }
  }

  return { names: [...names].sort(), nonLiteral: nonLiteral.sort() }
}

test.group('Hygiene — every Inertia page is pinned by a contract spec', () => {
  test('the render scan still finds the pages this guard assumes', ({ assert }) => {
    // Si la découverte se casse, tous les autres tests de ce fichier passent au
    // vert sur un ensemble vide.
    assert.isAbove(
      rendered().names.length,
      80,
      'le scan des inertia.render() ne renvoie presque rien — la regex a cessé de matcher'
    )
  })

  test('no controller renders a page under a non-literal name', ({ assert }) => {
    // Aucun aujourd'hui : c'est ce qui rend le scan exact, et ça doit le rester.
    // Un nom construit à l'exécution rendrait cette garde structurellement aveugle.
    assert.deepEqual(
      rendered().nonLiteral,
      [],
      'ces inertia.render() échappent au scan statique et rendraient la garde muette'
    )
  })

  test('no spec pins a page under a non-literal name', ({ assert }) => {
    assert.deepEqual(
      pinned().nonLiteral,
      [],
      'ces assertPageContract() passent un nom non littéral : la garde ne peut pas les compter'
    )
  })

  test('every rendered page is pinned by a contract spec', ({ assert }) => {
    const covered = new Set(pinned().names)
    const orphans = rendered()
      .names.filter((name) => !covered.has(name))
      .filter((name) => !EXEMPT.has(name))

    assert.deepEqual(
      orphans,
      [],
      `pages Inertia rendues mais jamais épinglées (${orphans.length}) : ${orphans.join(', ')}`
    )
  })

  test('every pinned page is still rendered somewhere', ({ assert }) => {
    // Une page supprimée doit emporter son spec : un contrat orphelin fige un
    // écran qui n'existe plus.
    const renderedNames = new Set(rendered().names)
    const orphans = pinned().names.filter((name) => !renderedNames.has(name))

    assert.deepEqual(orphans, [], `contrats sans page rendue : ${orphans.join(', ')}`)
  })

  test('every exemption names a page that is actually rendered', ({ assert }) => {
    // Une exemption périmée masque une page redevenue testable.
    const renderedNames = new Set(rendered().names)
    const stale = [...EXEMPT.keys()].filter((name) => !renderedNames.has(name))

    assert.deepEqual(stale, [], `exemptions périmées : ${stale.join(', ')}`)
  })
})
