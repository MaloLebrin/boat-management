import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import SimulatorLead from '#models/simulator_lead'

const validPayload = {
  email: 'test@example.com',
  boatType: 'sailboat',
  lengthM: 10,
  hullWear: 'good',
  engineWear: null,
  safetyWear: 'good',
  riggingWear: 'worn',
  totalMin: 3000,
  totalMax: 5000,
  locale: 'fr',
}

test.group('Simulator lead (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /simulator/lead stores lead and redirects back', async ({ client, assert }) => {
    const response = await client.post('/simulator/lead').form(validPayload)

    response.assertStatus(302)

    const lead = await SimulatorLead.findBy('email', 'test@example.com')
    assert.isNotNull(lead)
    assert.equal(lead!.boatType, 'sailboat')
    assert.equal(lead!.totalMin, 3000)
  })

  test('POST /simulator/lead upserts on same email', async ({ client, assert }) => {
    await client.post('/simulator/lead').form(validPayload)
    await client.post('/simulator/lead').form({ ...validPayload, totalMin: 4000, totalMax: 6000 })

    const leads = await SimulatorLead.query().where('email', 'test@example.com')
    assert.lengthOf(leads, 1)
    assert.equal(leads[0].totalMin, 4000)
  })

  test('POST /simulator/lead rejects invalid email and creates no record', async ({
    client,
    assert,
  }) => {
    await client.post('/simulator/lead').form({ ...validPayload, email: 'not-an-email' })

    const lead = await SimulatorLead.findBy('email', 'not-an-email')
    assert.isNull(lead)
  })
})
