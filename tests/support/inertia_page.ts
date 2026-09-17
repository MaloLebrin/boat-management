import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Assert } from '@japa/assert'
import type { ApiResponse } from '@japa/api-client'
import type { InertiaPages } from '@adonisjs/inertia/types'

/**
 * Le contrat d'une page Inertia : quel composant, et avec quelles props (#689).
 *
 * ## Pourquoi épingler le composant, et pas seulement lire les props
 *
 * `@japa/api-client` délègue à superagent, qui **suit cinq redirections par
 * défaut**. Un GET protégé qui redirige vers `/login` est donc suivi, les
 * en-têtes `x-inertia` sont rejoués sur la destination, et le test reçoit un
 * **200 Inertia parfaitement valide pour `auth/login`**. `assertStatus(200)`
 * passe. Lire `response.inertiaProps` passe. Seul l'épinglage du composant
 * rattrape le coup — c'est la raison d'être de ce fichier, et la raison pour
 * laquelle les 121 lectures d'`inertiaProps` du dépôt ne suffisent pas.
 *
 * ## Pourquoi dériver les props plutôt que les recopier
 *
 * Une liste de props écrite à la main dans un spec peut diverger du
 * `defineProps` de la page sans que rien ne le signale — c'est exactement la
 * dérive que #689 veut empêcher. En lisant le `.vue` sur le disque, renommer
 * une prop côté contrôleur casse le test sans que personne ait à toucher au
 * spec.
 *
 * ⚠️ Comme les gardes de #687 et #690, cette fabrique **relit le disque** :
 * une assertion qui partage sa source avec sa cible hérite de ses angles morts.
 *
 * ## Pourquoi pas `assertInertiaPropsContains`
 *
 * Elle s'appuie sur `containSubset` de chai, dont la comparaison finale est
 * `actualValue === expectedValue`. Donc `{ maProp: undefined }` passe **même
 * quand la clé est absente** : elle ne sait pas asserter une présence. D'où
 * `Object.prototype.hasOwnProperty` ci-dessous.
 */

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const PAGES_DIR = join(ROOT, 'inertia/pages')

export interface PageContractOptions {
  /**
   * Props à ne pas exiger, chacune justifiée à l'appel. Réservé aux cas où le
   * contrôleur omet légitimement une prop que la page déclare requise.
   */
  ignore?: string[]
  /**
   * `false` pour n'épingler que le composant, sans dériver les props. Réservé
   * aux pages dont le `defineProps` renvoie à un type nommé (toutes les pages
   * marketing), et dont les props sont déjà figées par les snapshots de
   * `tests/functional/marketing/props_snapshot.spec.ts`.
   */
  derive?: boolean
}

/**
 * Props requises déclarées par une page, lues dans son `defineProps`.
 *
 * Une page sans `defineProps` n'a pas de contrat de props — c'est un cas légitime
 * (11 pages du dépôt), pas une erreur. En revanche un `defineProps<TypeNommé>`
 * que ce parseur ne sait pas résoudre **lève**, plutôt que de rendre une liste
 * vide : une fabrique qui n'exige rien en silence est pire que pas de fabrique.
 */
export function requiredPropsOf(component: string): string[] {
  const source = readFileSync(join(PAGES_DIR, `${component}.vue`), 'utf8')

  const start = source.indexOf('defineProps<')
  if (start === -1) return []

  const afterGeneric = source.slice(start + 'defineProps<'.length)
  if (!afterGeneric.trimStart().startsWith('{')) {
    throw new Error(
      `${component}.vue déclare ses props via un type nommé : ce parseur ne sait pas le résoudre. ` +
        `Passer { derive: false } à assertPageContract et figer les props autrement.`
    )
  }

  const block = balancedBlock(afterGeneric.slice(afterGeneric.indexOf('{')))
  const required: string[] = []
  let depth = 0

  for (const line of block.split('\n')) {
    const match = /^\s*(\w+)(\??)\s*:/.exec(line)
    // Seules les clés de premier niveau sont des props ; celles d'un type objet
    // imbriqué (`members: { id: number }[]`) n'en sont pas.
    if (depth === 0 && match && match[2] !== '?') required.push(match[1])

    for (const char of line) {
      if (char === '{' || char === '[' || char === '(') depth++
      if (char === '}' || char === ']' || char === ')') depth--
    }
  }

  return required
}

/** Contenu d'un bloc `{ … }`, accolades extérieures exclues. */
function balancedBlock(source: string): string {
  let depth = 0

  for (let index = 0; index < source.length; index++) {
    if (source[index] === '{') depth++
    if (source[index] === '}') {
      depth--
      if (depth === 0) return source.slice(1, index)
    }
  }

  throw new Error('bloc defineProps non refermé')
}

/**
 * Épingle la page rendue et vérifie que le serveur envoie bien toutes les props
 * que le composant déclare requises.
 *
 * Le paramètre `component` est typé `keyof InertiaPages` (union générée dans
 * `.adonisjs/server/pages.d.ts`) : une faute de frappe sur un nom de page ne
 * compile pas, au lieu de produire un test qui n'épingle rien là où on croit.
 */
export function assertPageContract(
  assert: Assert,
  response: ApiResponse,
  component: keyof InertiaPages,
  options: PageContractOptions = {}
): void {
  // Une redirection suivie donne un 200 sur une *autre* page : le statut seul ne
  // prouve rien, mais l'assertion de composant qui suit, si.
  response.assertStatus(200)
  response.assertInertiaComponent(component)

  if (options.derive === false) return

  const props = response.inertiaProps as Record<string, unknown>
  // Les props différées (#463) sont absentes de la réponse initiale par
  // construction. Le page object les nomme, donc on les lit plutôt que d'exiger
  // une liste tenue à la main, qui divergerait du contrôleur.
  const deferred = new Set(Object.values(deferredPropsOf(response)).flat())
  const ignored = new Set(options.ignore ?? [])

  const missing = requiredPropsOf(component)
    .filter((name) => !deferred.has(name) && !ignored.has(name))
    .filter((name) => !Object.prototype.hasOwnProperty.call(props, name))

  assert.deepEqual(
    missing,
    [],
    `${component} : le contrôleur n'envoie pas ces props que la page déclare requises — ${missing.join(', ')}`
  )
}

function deferredPropsOf(response: ApiResponse): Record<string, string[]> {
  const body = response.body() as { deferredProps?: Record<string, string[]> }
  return body.deferredProps ?? {}
}
