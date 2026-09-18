import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import SimulatorShare from '#models/simulator_share'
import { assertFieldErrors, assertNoFieldErrors } from '#tests/support/validation'
import { assertPageContract } from '#tests/support/inertia_page'
import { computeSimulatorCosts } from '#shared/simulator_costs'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '#shared/types/simulator'

/**
 * `POST /simulator/share` — la seule route d'**écriture** du simulateur, et la
 * seule que `simulator_share.spec.ts` n'atteignait pas (#697).
 *
 * Elle est publique, non authentifiée, et crée une ligne qui devient
 * consultable par n'importe qui via `/simulateur/r/:token`. Les deux routes de
 * lecture étaient couvertes ; celle qui écrit ne l'était pas.
 *
 * Deux comportements mesurés ici sont encore **caractérisés, pas validés** —
 * ils portent chacun leur constat :
 *
 * - aucun throttle ne borne la route (#731) ;
 * - un jeton inconnu renvoie toujours vers la page FR (#732).
 *
 * Deux autres sont posés : la borne sur `locale` (#729), passée en validation
 * dans « ce que le validateur de partage refuse », et le recalcul du
 * `breakdown` (#730) — le serveur produit les montants à partir du seul
 * `input`, et le payload n'en porte plus.
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

/** Ce que le serveur rend pour `INPUT` — la seule source des montants stockés. */
const EXPECTED_BREAKDOWN: SimulatorCostBreakdown = computeSimulatorCosts(INPUT)

/**
 * Montants forgés : incohérents de bout en bout (coût minimum négatif, total
 * minimum mille fois supérieur au maximum). Envoyés en plus du payload attendu,
 * ils ne doivent laisser aucune trace — le serveur ne les lit pas (#730).
 */
const FORGED_BREAKDOWN: SimulatorCostBreakdown = {
  categories: [{ key: 'hull', minCost: -5, maxCost: 1 }],
  totalMin: 999_999,
  totalMax: 1,
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
      .json({ input: INPUT, locale: 'fr' })
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
    assert.deepEqual(props.breakdown, EXPECTED_BREAKDOWN)
  })

  test('deux créations donnent deux jetons distincts', async ({ client, assert }) => {
    // Le jeton vient de `randomBytes(6)`, pas d'un compteur ni d'un hachage du
    // contenu : deux partages du **même** bateau doivent rester séparables.
    const locations: string[] = []
    for (let index = 0; index < 2; index += 1) {
      const response = await client.post('/simulator/share').json({ input: INPUT }).redirects(0)
      locations.push(String(response.header('location')))
    }

    const rows = await SimulatorShare.all()
    const tokens = rows.map((row) => row.token)
    assert.lengthOf(new Set(tokens), 2, 'deux partages partagent le même jeton')
    assert.deepEqual(new Set(locations.map((l) => tokenOf(l))), new Set(tokens))
  })

  test('la locale absente retombe sur le français', async ({ client, assert }) => {
    const response = await client.post('/simulator/share').json({ input: INPUT }).redirects(0)

    assert.match(String(response.header('location')), /^\/simulateur\/r\//)
    const rows = await SimulatorShare.all()
    assert.equal(rows[0].locale, 'fr')
  })

  test("la locale 'en' rend le chemin anglais", async ({ client, assert }) => {
    const response = await client
      .post('/simulator/share')
      .json({ input: INPUT, locale: 'en' })
      .redirects(0)

    assert.match(String(response.header('location')), /^\/simulator\/r\//)
    const rows = await SimulatorShare.all()
    assert.equal(rows[0].locale, 'en')
  })
})

test.group('Simulateur — le breakdown vient du serveur', (group) => {
  group.each.setup(() => truncateDb())

  test('les montants stockés sont ceux du calculateur, pas ceux du payload', async ({
    client,
    assert,
  }) => {
    // La route est publique et non authentifiée : accepter les montants de
    // l'appelant revenait à laisser forger un lien qui attribue à FleetAi une
    // estimation qu'elle n'a pas produite (#730).
    const created = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: FORGED_BREAKDOWN })
      .redirects(0)

    created.assertStatus(302)
    const rows = await SimulatorShare.all()
    assert.deepEqual(
      rows[0].breakdown,
      EXPECTED_BREAKDOWN,
      'le breakdown stocké vient du payload et non du calculateur'
    )
    assert.notDeepEqual(rows[0].breakdown, FORGED_BREAKDOWN)
  })

  test('la page de lecture ne sert jamais les montants forgés', async ({ client, assert }) => {
    const created = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: FORGED_BREAKDOWN })
      .redirects(0)

    const read = await client.get(String(created.header('location'))).withInertia()
    const props = read.inertiaProps as { breakdown: SimulatorCostBreakdown }
    assert.deepEqual(props.breakdown, EXPECTED_BREAKDOWN)
    // Le cas qui se voyait le plus : un total minimum supérieur au maximum,
    // affiché tel quel sous la mise en page du simulateur.
    assert.isAtMost(props.breakdown.totalMin, props.breakdown.totalMax)
  })

  test('un partage sans breakdown dans le payload est accepté', async ({ client, assert }) => {
    // C'est désormais la forme normale : la page n'envoie plus que l'`input` et
    // la locale.
    const created = await client.post('/simulator/share').json({ input: INPUT }).redirects(0)

    created.assertStatus(302)
    assertNoFieldErrors(assert, created)
    const rows = await SimulatorShare.all()
    assert.deepEqual(rows[0].breakdown, EXPECTED_BREAKDOWN)
  })

  test('deux inputs différents donnent deux breakdowns différents', async ({ client, assert }) => {
    // Le breakdown suit vraiment l'`input` : il n'est pas figé sur une valeur
    // par défaut du serveur.
    const bigger: SimulatorBoatInput = { ...INPUT, lengthM: 18, hullWear: 'to_replace' }
    for (const input of [INPUT, bigger]) {
      await client.post('/simulator/share').json({ input }).redirects(0)
    }

    const rows = await SimulatorShare.all()
    const totals = rows.map((row) => row.breakdown.totalMax)
    assert.lengthOf(new Set(totals), 2)
    assert.includeMembers(totals, [
      EXPECTED_BREAKDOWN.totalMax,
      computeSimulatorCosts(bigger).totalMax,
    ])
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
      .json({ input: { ...INPUT, boatType: 'submarine' } })
      .redirects(0)

    assertFieldErrors(assert, response, ['input.boatType'])
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
      .json({ input: INPUT, locale: 'zz-ZZ-nope!' })
      .redirects(0)

    assertFieldErrors(assert, response, ['locale'])
    assert.lengthOf(await SimulatorShare.all(), 0)
  })

  test('#729 — une locale bidon plus courte est refusée elle aussi', async ({ client, assert }) => {
    // La page de lecture déclare `locale: 'en' | 'fr'` dans ses props : rien
    // d'autre ne doit pouvoir être stocké, même de longueur acceptable.
    const response = await client
      .post('/simulator/share')
      .json({ input: INPUT, locale: 'zz-ZZ' })
      .redirects(0)

    assertFieldErrors(assert, response, ['locale'])
    assert.lengthOf(await SimulatorShare.all(), 0)
  })

  test('une longueur hors bornes est refusée', async ({ client, assert }) => {
    const response = await client
      .post('/simulator/share')
      .json({ input: { ...INPUT, lengthM: 250 } })
      .redirects(0)

    assertFieldErrors(assert, response, ['input.lengthM'])
    assert.lengthOf(await SimulatorShare.all(), 0)
  })
})

test.group('Simulateur — les deux frontières que la route ne tient pas', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * Caractérisation : ces cas figent le comportement **actuel**, pas le
   * comportement souhaitable. Chacun tombera le jour où son constat sera
   * traité — c'est le signal qu'on veut.
   */

  test('#731 — dix créations à la suite passent toutes', async ({ client, assert }) => {
    // `/contact`, `/diagnosis-ai` et `/parts-ai` portent chacune un throttle.
    // Les trois POST publics du simulateur n'en ont aucun.
    for (let index = 0; index < 10; index += 1) {
      const response = await client.post('/simulator/share').json({ input: INPUT }).redirects(0)
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
