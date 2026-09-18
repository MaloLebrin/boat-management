import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import SimulatorShare from '#models/simulator_share'
import { assertFieldErrors, assertNoFieldErrors } from '#tests/support/validation'
import { assertPageContract } from '#tests/support/inertia_page'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '#shared/types/simulator'

/**
 * `POST /simulator/share` — la seule route d'**écriture** du simulateur, et la
 * seule que `simulator_share.spec.ts` n'atteignait pas (#697).
 *
 * Elle est publique, non authentifiée, et crée une ligne qui devient
 * consultable par n'importe qui via `/simulateur/r/:token`. Les deux routes de
 * lecture étaient couvertes ; celle qui écrit ne l'était pas.
 *
 * Trois comportements mesurés ici sont encore **caractérisés, pas validés** —
 * ils portent chacun leur constat :
 *
 * - le `breakdown` n'est jamais recalculé côté serveur (#730) ;
 * - aucun throttle ne borne la route (#731) ;
 * - un jeton inconnu renvoie toujours vers la page FR (#732).
 *
 * La borne sur `locale` (#729), elle, est posée : les deux cas correspondants
 * sont passés en validation dans « ce que le validateur de partage refuse ».
 */

const INPUT: SimulatorBoatInput = {
  boatType: 'sailboat',
  lengthM: 12,
  yearBuilt: 2010,
  navigationCategory: 'B',
  hasDedicatedEngine: true,
  hullWear: 'good',
  engineWear: 'good',
  safetyWear: 'good',
  riggingWear: 'worn',
  winteringZone: 'sea',
}

const BREAKDOWN: SimulatorCostBreakdown = {
  categories: [
    { key: 'hull', minCost: 400, maxCost: 900 },
    { key: 'engine', minCost: 250, maxCost: 600 },
  ],
  totalMin: 650,
  totalMax: 1500,
}

/** Le chemin de lecture porte le jeton : c'est lui qui prouve la création. */
function tokenOf(location: string | undefined): string {
  const token = String(location).split('/').pop()
  if (token === undefined || token.length === 0) {
    throw new Error(`redirection sans jeton exploitable : ${location}`)
  }
  return token
}

test.group('Simulateur — la création de partage', (group) => {
  group.each.setup(() => truncateDb())

  test('un visiteur anonyme crée un partage consultable', async ({ client, assert }) => {
    const created = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: BREAKDOWN, locale: 'fr' })
      .redirects(0)

    created.assertStatus(302)
    assertNoFieldErrors(assert, created)
    const location = created.header('location')
    assert.match(
      String(location),
      /^\/simulateur\/r\/[\da-f]{12}$/,
      'le chemin de retour doit être la lecture localisée, jeton compris'
    )

    const rows = await SimulatorShare.all()
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].token, tokenOf(location))
    assert.equal(rows[0].locale, 'fr')

    // Le jeton rendu est vraiment exploitable : c'est le seul aller-retour qui
    // relie les deux moitiés de la fonctionnalité.
    const read = await client.get(String(location)).withInertia()
    // `derive: false` : la page déclare ses props via un type nommé, que le
    // parseur de `assertPageContract` ne résout pas. Les quatre props sont
    // figées juste en dessous, une par une.
    assertPageContract(assert, read, 'marketing/simulator_share', { derive: false })
    const props = read.inertiaProps as {
      token: string
      input: SimulatorBoatInput
      breakdown: SimulatorCostBreakdown
      locale: string
    }
    assert.equal(props.token, rows[0].token)
    assert.deepEqual(props.input, INPUT)
    assert.deepEqual(props.breakdown, BREAKDOWN)
  })

  test('deux créations donnent deux jetons distincts', async ({ client, assert }) => {
    // Le jeton vient de `randomBytes(6)`, pas d'un compteur ni d'un hachage du
    // contenu : deux partages du **même** bateau doivent rester séparables.
    const locations: string[] = []
    for (let index = 0; index < 2; index += 1) {
      const response = await client
        .post('/simulator/share')
        .json({ input: INPUT, breakdown: BREAKDOWN })
        .redirects(0)
      locations.push(String(response.header('location')))
    }

    const rows = await SimulatorShare.all()
    const tokens = rows.map((row) => row.token)
    assert.lengthOf(new Set(tokens), 2, 'deux partages partagent le même jeton')
    assert.deepEqual(new Set(locations.map((l) => tokenOf(l))), new Set(tokens))
  })

  test('la locale absente retombe sur le français', async ({ client, assert }) => {
    const response = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: BREAKDOWN })
      .redirects(0)

    assert.match(String(response.header('location')), /^\/simulateur\/r\//)
    const rows = await SimulatorShare.all()
    assert.equal(rows[0].locale, 'fr')
  })

  test("la locale 'en' rend le chemin anglais", async ({ client, assert }) => {
    const response = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: BREAKDOWN, locale: 'en' })
      .redirects(0)

    assert.match(String(response.header('location')), /^\/simulator\/r\//)
    const rows = await SimulatorShare.all()
    assert.equal(rows[0].locale, 'en')
  })
})

test.group('Simulateur — ce que le validateur de partage refuse', (group) => {
  group.each.setup(() => truncateDb())

  test('un type de bateau hors énumération est refusé sans rien écrire', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/simulator/share')
      .json({ input: { ...INPUT, boatType: 'submarine' }, breakdown: BREAKDOWN })
      .redirects(0)

    assertFieldErrors(assert, response, ['input.boatType'])
    assert.lengthOf(await SimulatorShare.all(), 0)
  })

  test('un breakdown sans totaux est refusé', async ({ client, assert }) => {
    const response = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: { categories: [] } })
      .redirects(0)

    assertFieldErrors(assert, response, ['breakdown.totalMin', 'breakdown.totalMax'])
    assert.lengthOf(await SimulatorShare.all(), 0)
  })

  test('#729 — une locale de onze caractères est refusée avant l’insertion', async ({
    client,
    assert,
  }) => {
    // La colonne est un `varchar(10)` : sans borne côté validateur, la
    // contrainte de schéma était atteinte **après** la validation et remontait
    // en 500 de base de données sur une route publique.
    const response = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: BREAKDOWN, locale: 'zz-ZZ-nope!' })
      .redirects(0)

    assertFieldErrors(assert, response, ['locale'])
    assert.lengthOf(await SimulatorShare.all(), 0)
  })

  test('#729 — une locale bidon plus courte est refusée elle aussi', async ({ client, assert }) => {
    // La page de lecture déclare `locale: 'en' | 'fr'` dans ses props : rien
    // d'autre ne doit pouvoir être stocké, même de longueur acceptable.
    const response = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: BREAKDOWN, locale: 'zz-ZZ' })
      .redirects(0)

    assertFieldErrors(assert, response, ['locale'])
    assert.lengthOf(await SimulatorShare.all(), 0)
  })

  test('une longueur hors bornes est refusée', async ({ client, assert }) => {
    const response = await client
      .post('/simulator/share')
      .json({ input: { ...INPUT, lengthM: 250 }, breakdown: BREAKDOWN })
      .redirects(0)

    assertFieldErrors(assert, response, ['input.lengthM'])
    assert.lengthOf(await SimulatorShare.all(), 0)
  })
})

test.group('Simulateur — les trois frontières que la route ne tient pas', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * Caractérisation : ces cas figent le comportement **actuel**, pas le
   * comportement souhaitable. Chacun tombera le jour où son constat sera
   * traité — c'est le signal qu'on veut.
   */

  test('#730 — le serveur stocke les montants de l’appelant sans les recalculer', async ({
    client,
    assert,
  }) => {
    // `shared/simulator_costs.ts` est disponible côté serveur ; il n'est pas
    // appelé. Un lien forgé affiche n'importe quel montant sous la page du
    // simulateur FleetAi — un total minimum supérieur au maximum compris.
    const forged: SimulatorCostBreakdown = {
      categories: [{ key: 'hull', minCost: -5, maxCost: 1 }],
      totalMin: 999_999,
      totalMax: 1,
    }

    const created = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: forged })
      .redirects(0)

    created.assertStatus(302)
    const rows = await SimulatorShare.all()
    assert.deepEqual(rows[0].breakdown, forged, 'le breakdown stocké a été recalculé ou corrigé')

    const read = await client.get(String(created.header('location'))).withInertia()
    const props = read.inertiaProps as { breakdown: SimulatorCostBreakdown }
    assert.deepEqual(props.breakdown, forged)
  })

  test('#731 — dix créations à la suite passent toutes', async ({ client, assert }) => {
    // `/contact`, `/diagnosis-ai` et `/parts-ai` portent chacune un throttle.
    // Les trois POST publics du simulateur n'en ont aucun.
    for (let index = 0; index < 10; index += 1) {
      const response = await client
        .post('/simulator/share')
        .json({ input: INPUT, breakdown: BREAKDOWN })
        .redirects(0)
      response.assertStatus(302)
    }

    assert.lengthOf(await SimulatorShare.all(), 10)
  })

  test('#732 — un jeton inconnu renvoie vers la page FR, même en anglais', async ({ client }) => {
    const response = await client.get('/simulator/r/deadbeef0000').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/fr/simulateur-cout-entretien')
  })
})
