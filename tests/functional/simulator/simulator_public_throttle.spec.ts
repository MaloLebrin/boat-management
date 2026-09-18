import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import SimulatorShare from '#models/simulator_share'
import SimulatorLead from '#models/simulator_lead'
import type { SimulatorBoatInput } from '#shared/types/simulator'

/**
 * Les trois POST publics du simulateur (#731).
 *
 * `/contact`, `/diagnosis-ai` et `/parts-ai` portent chacune un throttle ; les
 * trois routes du simulateur n'en avaient aucun, alors qu'elles écrivent toutes
 * en base sans authentification — et que `/simulator/lead` déclenche en plus
 * deux jobs d'e-mail.
 *
 * Chaque route porte son **propre compteur** : une rafale sur l'une ne doit pas
 * consommer le budget des autres. C'est le second point mesuré ici.
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

const BREAKDOWN = {
  categories: [{ key: 'hull', minCost: 400, maxCost: 900 }],
  totalMin: 400,
  totalMax: 900,
}

const SESSION_BOAT = {
  boatType: 'sailboat',
  lengthM: 9.5,
  yearBuilt: 2005,
  navigationCategory: 'B',
  hasDedicatedEngine: 'true',
  hullWear: 'good',
  engineWear: 'good',
  safetyWear: 'new',
  riggingWear: 'worn',
}

const LEAD = {
  email: 'visiteur@example.com',
  boatType: 'sailboat',
  lengthM: 12,
  totalMin: 650,
  totalMax: 1500,
}

/** Débits déclarés dans `start/limiter.ts` — la borne mesurée ici. */
const SHARE_LIMIT = 6
const SESSION_LIMIT = 6
const LEAD_LIMIT = 5

test.group('Simulateur — le throttle des POST publics', (group) => {
  group.each.setup(() => truncateDb())

  test('POST /simulator/share refuse au-delà de son quota', async ({ client, assert }) => {
    for (let index = 0; index < SHARE_LIMIT; index += 1) {
      const passing = await client
        .post('/simulator/share')
        .json({ input: INPUT, breakdown: BREAKDOWN })
        .redirects(0)
      passing.assertStatus(302)
    }

    const refused = await client
      .post('/simulator/share')
      .json({ input: INPUT, breakdown: BREAKDOWN })
      .redirects(0)

    refused.assertStatus(429)
    assert.lengthOf(
      await SimulatorShare.all(),
      SHARE_LIMIT,
      'la requête refusée a tout de même écrit une ligne'
    )
  })

  test('POST /simulator/session refuse au-delà de son quota', async ({ client }) => {
    for (let index = 0; index < SESSION_LIMIT; index += 1) {
      const passing = await client.post('/simulator/session').form(SESSION_BOAT).redirects(0)
      passing.assertStatus(302)
    }

    const refused = await client.post('/simulator/session').form(SESSION_BOAT).redirects(0)
    refused.assertStatus(429)
  })

  test('POST /simulator/lead refuse au-delà de son quota', async ({ client, assert }) => {
    // Le plus strict des trois : il crée un prospect **et** déclenche
    // `send_simulator_report_job` puis `send_simulator_nurturing_job`.
    for (let index = 0; index < LEAD_LIMIT; index += 1) {
      const passing = await client
        .post('/simulator/lead')
        .form({ ...LEAD, email: `visiteur${index}@example.com` })
        .redirects(0)
      passing.assertStatus(302)
    }

    const refused = await client.post('/simulator/lead').form(LEAD).redirects(0)

    refused.assertStatus(429)
    assert.lengthOf(
      await SimulatorLead.all(),
      LEAD_LIMIT,
      'la requête refusée a tout de même créé un prospect'
    )
  })

  test('les trois routes ne se volent pas leur budget', async ({ client, assert }) => {
    // Compteurs séparés : épuiser `share` ne doit fermer ni `session` ni `lead`.
    for (let index = 0; index <= SHARE_LIMIT; index += 1) {
      await client
        .post('/simulator/share')
        .json({ input: INPUT, breakdown: BREAKDOWN })
        .redirects(0)
    }

    const session = await client.post('/simulator/session').form(SESSION_BOAT).redirects(0)
    const lead = await client.post('/simulator/lead').form(LEAD).redirects(0)

    session.assertStatus(302)
    lead.assertStatus(302)
    assert.lengthOf(await SimulatorLead.all(), 1)
  })
})
