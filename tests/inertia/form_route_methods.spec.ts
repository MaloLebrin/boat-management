import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { routes } from '@generated/registry'

/**
 * Garde statique pour #449.
 *
 * `<Form route="…">` d'Inertia reprend `methods[0]` de la route nommée. La page
 * « mot de passe oublié » pointait sur `password.forgot`, qui nomme la route
 * **GET** `/forgot-password` : la soumission partait donc en GET, l'email
 * atterrissait en query string (fuite dans l'historique et les logs), la route
 * POST n'était jamais appelée et aucun email de réinitialisation n'était envoyé.
 *
 * Les deux routes partagent le même chemin — une lecture d'URL ne voit pas la
 * différence. Seule la résolution du nom vers son verbe l'attrape, et le
 * registre généré (`.adonisjs/client/registry`) est exactement la source que le
 * composant `<Form>` interroge au runtime.
 */
const ROOT = resolve(__dirname, '../..')
const INERTIA = resolve(ROOT, 'inertia')

const registry = routes as Record<string, { methods: readonly string[]; pattern: string }>

/** Chemins relatifs de tous les composants et pages Vue de `inertia/`. */
function vueFiles(): string[] {
  return readdirSync(INERTIA, { recursive: true, encoding: 'utf8' }).filter((file) =>
    file.endsWith('.vue')
  )
}

/** Noms de route passés à un `<Form route="…">`, fichier par fichier. */
function formRouteNames(source: string): string[] {
  return [...source.matchAll(/<Form\b[^>]*?\sroute="([\w.]+)"/g)].map((match) => match[1])
}

function isReadOnly(methods: readonly string[]): boolean {
  return methods.every((method) => method === 'GET' || method === 'HEAD')
}

describe('<Form route="…"> résout vers une route mutante (#449)', () => {
  test('the generated registry is loaded and non-empty', () => {
    expect(Object.keys(registry).length).toBeGreaterThan(0)
  })

  test('no <Form> in inertia/ submits to a read-only route', () => {
    const offenders: string[] = []

    for (const file of vueFiles()) {
      const source = readFileSync(resolve(INERTIA, file), 'utf8')

      for (const name of formRouteNames(source)) {
        const route = registry[name]

        if (!route) {
          offenders.push(`${file}: route="${name}" est inconnue du registre`)
          continue
        }

        if (isReadOnly(route.methods)) {
          offenders.push(
            `${file}: route="${name}" (${route.methods.join('/')} ${route.pattern}) — ` +
              'la soumission partirait en GET, les champs fuiteraient en query string'
          )
        }
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([])
  })

  test('the forgot-password form targets the POST route, not its GET twin', () => {
    const source = readFileSync(resolve(INERTIA, 'pages/auth/forgot_password.vue'), 'utf8')
    const names = formRouteNames(source)

    expect(names).toHaveLength(1)
    expect(registry[names[0]].methods[0]).toBe('POST')
    expect(registry[names[0]].pattern).toBe('/forgot-password')
  })

  // Méta-test : sans lui, la garde ci-dessus passerait aussi le jour où le piège
  // disparaîtrait du registre — on veut savoir que les deux routes homonymes
  // existent bel et bien sur le même chemin.
  test('a GET route still shares the /forgot-password path — the trap is real', () => {
    expect(registry['password.forgot'].pattern).toBe('/forgot-password')
    expect(isReadOnly(registry['password.forgot'].methods)).toBe(true)
  })
})
