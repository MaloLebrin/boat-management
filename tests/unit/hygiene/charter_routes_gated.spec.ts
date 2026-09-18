import { test } from '@japa/runner'
import router from '@adonisjs/core/services/router'

/**
 * Garde d'exhaustivité du module Location (#694).
 *
 * Les 22 routes du domaine réservations — calendrier, états des lieux,
 * contrats — ne sont pas gardées une par une : elles héritent toutes du
 * `requireModulePlan({ feature: 'reservations' })` posé sur **le groupe**
 * (`start/routes/boats.ts`). Une route déclarée d'un cran trop haut, hors des
 * accolades, serait donc ouverte à toute organisation, et **aucun test ne le
 * dirait** : les specs du domaine emploient toutes `createCharterAdminUser()`,
 * qui a le module.
 *
 * Cette garde lit la table de routage plutôt que le fichier source, parce que
 * c'est elle qui décide à l'exécution : un middleware peut être posé sur la
 * route, sur son groupe ou sur un groupe parent, et seule la chaîne compilée
 * les réunit. Les middlewares **nommés** y restent introspectables, avec leurs
 * arguments (`{ feature: 'reservations' }`).
 *
 * Le pendant comportemental — ce que le refus fait vraiment, et qu'il n'écrit
 * rien — est dans `tests/functional/reservations/module_guard.spec.ts`.
 */

interface RouteFacts {
  pattern: string
  methods: string
  middleware: string[]
  moduleFeatures: string[]
}

/** Une route appartient au domaine si `reservations` est un de ses segments. */
const CHARTER_SEGMENT = /(^|\/)reservations(\/|$)/

function routeFacts(): RouteFacts[] {
  router.commit()

  return Object.values(router.toJSON())
    .flat()
    .map((route) => {
      const middleware: string[] = []
      const moduleFeatures: string[] = []

      for (const entry of (
        route.middleware as unknown as {
          all: () => Set<{ name?: string; args?: { feature?: string } }>
        }
      ).all()) {
        // Les middlewares de groupe anonymes (fonctions inline) n'ont pas de
        // nom : ils ne nous intéressent pas, seuls les nommés sont déclarés.
        if (!entry.name) continue
        middleware.push(entry.name)
        if (entry.name === 'requireModulePlan' && entry.args?.feature) {
          moduleFeatures.push(entry.args.feature)
        }
      }

      return {
        pattern: String(route.pattern),
        methods: route.methods.filter((method) => method !== 'HEAD').join(','),
        middleware,
        moduleFeatures,
      }
    })
}

function charterRoutes(): RouteFacts[] {
  return routeFacts().filter((route) => CHARTER_SEGMENT.test(route.pattern))
}

function label(route: RouteFacts): string {
  return `${route.methods} ${route.pattern}`
}

test.group('Hygiene — toute route du domaine réservations porte la garde de module', () => {
  test('la découverte trouve bien le domaine', ({ assert }) => {
    // Sans ce témoin, un prédicat qui ne matcherait plus rien rendrait tous les
    // autres tests de ce fichier verts sur un ensemble vide.
    const routes = charterRoutes()

    assert.isAbove(
      routes.length,
      19,
      `la découverte ne renvoie que ${routes.length} routes — le domaine en compte 22`
    )

    // Les trois sous-familles, pour qu'un prédicat qui n'attraperait plus que
    // le calendrier ne puisse pas passer pour exhaustif.
    for (const family of ['/inspection', '/contract', '/photos']) {
      assert.isTrue(
        routes.some((route) => route.pattern.includes(family)),
        `aucune route en « ${family} » : le prédicat de domaine a dérivé`
      )
    }
  })

  test('chacune est gardée par le module Location', ({ assert }) => {
    const ungated = charterRoutes()
      .filter((route) => !route.moduleFeatures.includes('reservations'))
      .map(label)

    assert.deepEqual(
      ungated,
      [],
      `routes du domaine réservations sans requireModulePlan({ feature: 'reservations' }) : ` +
        `${ungated.join(', ')} — les déplacer à l'intérieur du groupe gardé de start/routes/boats.ts`
    )
  })

  test('chacune exige aussi une session', ({ assert }) => {
    // `requireModulePlan` appelle `auth.getUserOrFail()` : sans `auth()` en
    // amont, un visiteur anonyme ne serait pas redirigé vers `/login` mais
    // provoquerait une erreur interne.
    const unauthenticated = charterRoutes()
      .filter((route) => !route.middleware.includes('auth'))
      .map(label)

    assert.deepEqual(
      unauthenticated,
      [],
      `routes du domaine réservations sans middleware.auth() : ${unauthenticated.join(', ')}`
    )
  })

  test('aucune ne se garde sur une autre fonctionnalité', ({ assert }) => {
    // Une faute de frappe dans `feature` ne casse rien à la compilation, et
    // `assertCanManage…` d'un autre module laisserait passer une organisation
    // qui n'a pas la Location.
    const mismatched = charterRoutes()
      .filter((route) => route.moduleFeatures.some((feature) => feature !== 'reservations'))
      .map((route) => `${label(route)} → ${route.moduleFeatures.join(', ')}`)

    assert.deepEqual(mismatched, [], `gardes de module incohérentes : ${mismatched.join(' ; ')}`)
  })

  test("la facture issue d'une réservation reste gardée par son propre module", ({ assert }) => {
    // `POST /invoices/from-reservation/:reservationId` parle de réservation
    // mais appartient au domaine facturation : elle est gardée par
    // `invoices`, et le prédicat de domaine ne doit pas l'attraper — sans quoi
    // le test précédent la déclarerait en faute.
    const bridge = routeFacts().find((route) =>
      route.pattern.includes('/invoices/from-reservation/')
    )

    assert.isDefined(bridge, 'le pont réservation → facture a disparu')
    assert.deepEqual(bridge!.moduleFeatures, ['invoices'])
    assert.isFalse(CHARTER_SEGMENT.test(bridge!.pattern))
  })
})
