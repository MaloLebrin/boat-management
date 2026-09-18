import { test } from '@japa/runner'
import router from '@adonisjs/core/services/router'

/**
 * Garde d'exhaustivité de la cartographie marina (#695).
 *
 * Les routes du domaine ne sont pas gardées une par une : elles héritent toutes
 * du `requirePortsPlan()` posé sur **le groupe** de `start/routes/ports.ts`. Une
 * route déclarée d'un cran trop haut, hors des accolades, serait donc ouverte à
 * n'importe quel plan — et aucune spec du domaine ne le dirait, puisqu'elles
 * emploient toutes `createEnterpriseAdminUser()`.
 *
 * Deux routes rendent ce risque concret : `PUT /spots/:id` et
 * `DELETE /spots/:id` **n'ont pas le préfixe `/ports`**. Une route « spots »
 * ajoutée demain dans un autre fichier passerait pour normale, et rien ne
 * signalerait qu'elle est sortie de la garde. C'est précisément le cas que ce
 * fichier surveille.
 *
 * Comme pour `charter_routes_gated.spec.ts` (#694), la lecture se fait sur la
 * **table de routage** et non sur le fichier source : un middleware peut être
 * posé sur la route, sur son groupe ou sur un groupe parent, et seule la chaîne
 * compilée les réunit.
 *
 * Le pendant comportemental — ce que le refus fait vraiment — vit dans
 * `tests/functional/ports/ports_plan_gating.spec.ts` et
 * `tests/functional/ports/marina_role_frontier.spec.ts`.
 */

interface RouteFacts {
  pattern: string
  methods: string
  middleware: string[]
}

/**
 * Une route appartient au domaine si `ports` ou `spots` est un de ses segments.
 *
 * `spots` est indispensable : les deux routes d'édition d'une place vivent hors
 * du préfixe `/ports`, c'est-à-dire hors de ce qu'un lecteur pressé regarderait.
 */
const MARINA_SEGMENT = /(^|\/)(ports|spots)(\/|$)/

function routeFacts(): RouteFacts[] {
  router.commit()

  return Object.values(router.toJSON())
    .flat()
    .map((route) => {
      const middleware: string[] = []

      for (const entry of (
        route.middleware as unknown as { all: () => Set<{ name?: string }> }
      ).all()) {
        // Les middlewares de groupe anonymes (fonctions inline) n'ont pas de
        // nom : seuls les nommés sont introspectables.
        if (!entry.name) continue
        middleware.push(entry.name)
      }

      return {
        pattern: String(route.pattern),
        methods: route.methods.filter((method) => method !== 'HEAD').join(','),
        middleware,
      }
    })
}

function marinaRoutes(): RouteFacts[] {
  return routeFacts().filter((route) => MARINA_SEGMENT.test(route.pattern))
}

function label(route: RouteFacts): string {
  return `${route.methods} ${route.pattern}`
}

test.group('Hygiene — toute route de la marina porte la garde de plan', () => {
  test('la découverte trouve bien le domaine', ({ assert }) => {
    // Sans ce témoin, un prédicat qui ne matcherait plus rien rendrait tous les
    // autres tests de ce fichier verts sur un ensemble vide.
    const routes = marinaRoutes()

    assert.isAbove(
      routes.length,
      17,
      `la découverte ne renvoie que ${routes.length} routes — le domaine en compte 19`
    )

    // Les quatre sous-familles. Un prédicat qui n'attraperait plus que les
    // ports ne pourrait pas passer pour exhaustif.
    for (const family of ['/pontoons', '/mouillages', '/position', 'spots']) {
      assert.isTrue(
        routes.some((route) => route.pattern.includes(family)),
        `aucune route en « ${family} » : le prédicat de domaine a dérivé`
      )
    }
  })

  test('les deux routes de place sans préfixe sont bien dans le lot', ({ assert }) => {
    // Le cœur de cette garde : ces deux-là ne portent pas `/ports`, elles
    // n'ont donc que le groupe pour les couvrir.
    const orphans = marinaRoutes()
      .filter((route) => route.pattern.startsWith('/spots/'))
      .map(label)
      .sort()

    assert.deepEqual(orphans, ['DELETE /spots/:id', 'PUT /spots/:id'])
  })

  test('chacune est gardée par le plan Entreprise', ({ assert }) => {
    const ungated = marinaRoutes()
      .filter((route) => !route.middleware.includes('requirePortsPlan'))
      .map(label)

    assert.deepEqual(
      ungated,
      [],
      `routes de la marina sans requirePortsPlan() : ${ungated.join(', ')} — ` +
        `les déplacer à l'intérieur du groupe gardé de start/routes/ports.ts`
    )
  })

  test('chacune exige aussi une session', ({ assert }) => {
    // `requirePortsPlan` lit l'organisation de l'utilisateur : sans `auth()` en
    // amont, un visiteur anonyme provoquerait une erreur interne au lieu d'être
    // redirigé vers `/login`.
    const unauthenticated = marinaRoutes()
      .filter((route) => !route.middleware.includes('auth'))
      .map(label)

    assert.deepEqual(
      unauthenticated,
      [],
      `routes de la marina sans middleware.auth() : ${unauthenticated.join(', ')}`
    )
  })

  test("l'amarrage d'un bateau, lui, échappe à la garde (constat #721)", ({ assert }) => {
    // `PATCH /boats/:id/assignment` écrit `boats.spot_id` : il touche donc une
    // place, mais il vit dans `start/routes/boats.ts`, hors du groupe gardé.
    // Une organisation redescendue en Starter garde ainsi la main sur ses
    // amarrages alors que toute la section /ports lui est fermée.
    //
    // **Constat figé, pas règle voulue** : si l'issue #721 tranche pour la
    // garde, ce test tombe et c'est exactement ce qu'on veut — il nomme alors
    // l'endroit à mettre à jour.
    const assignment = routeFacts().find((route) => route.pattern.includes('boats/:id/assignment'))

    assert.isDefined(assignment, "la route d'amarrage a disparu")
    assert.isFalse(MARINA_SEGMENT.test(assignment!.pattern))
    assert.notInclude(assignment!.middleware, 'requirePortsPlan')
  })
})
