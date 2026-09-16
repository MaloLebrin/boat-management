import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { SimulatorLeadFactory } from '#database/factories/simulator_lead_factory'
import SendSimulatorNurturingJob from '#jobs/send_simulator_nurturing_job'
import SendSimulatorReportJob from '#jobs/send_simulator_report_job'
import type { SendEmailPayload } from '#jobs/send_email'
import type QueueDedupService from '#services/queue_dedup_service'

/**
 * Les deux emails du simulateur public (rapport immédiat, relances J+3 et J+7)
 * doivent être rédigés — et leurs montants formatés — dans la langue du lead.
 * La relance J+7 formatait ses montants en `fr-FR` quelle que soit la langue.
 */

/** Le corps de l'email au lieu d'une file d'attente : les jobs n'appellent que `enqueueUnique`. */
function fakeDedup() {
  const enqueued: SendEmailPayload[] = []
  const dedup = {
    enqueueUnique: async ({ payload }: { payload: SendEmailPayload }) => {
      enqueued.push(payload)
    },
  } as unknown as QueueDedupService
  return { dedup, enqueued }
}

/** Les espaces insécables (fines ou non) d'ICU deviennent des espaces simples. */
const ICU_SPACES = new RegExp('[\u00a0\u202f]', 'g')

function plain(value: string): string {
  return value.replace(ICU_SPACES, ' ')
}

async function runNurturing(locale: string) {
  const lead = await SimulatorLeadFactory.merge({ locale, totalMin: 1200, totalMax: 3400 }).create()
  const { dedup, enqueued } = fakeDedup()
  const payload = { leadId: lead.id }
  class TestJob extends SendSimulatorNurturingJob {
    get payload() {
      return payload
    }
  }
  await new TestJob(dedup).execute()
  return { lead, enqueued }
}

async function runReport(locale: string) {
  const lead = await SimulatorLeadFactory.merge({
    locale,
    boatType: 'sailboat',
    lengthM: 10,
    riggingWear: 'good',
  }).create()
  const { dedup, enqueued } = fakeDedup()
  const payload = { leadId: lead.id }
  class TestJob extends SendSimulatorReportJob {
    get payload() {
      return payload
    }
  }
  await new TestJob(dedup).execute()
  return { lead, enqueued }
}

test.group('Simulateur — relances J+3 / J+7 (SendSimulatorNurturingJob)', (group) => {
  group.each.setup(() => truncateDb())

  test('un lead anglophone reçoit des relances en anglais, montants au format anglais', async ({
    assert,
  }) => {
    const { lead, enqueued } = await runNurturing('en')

    assert.lengthOf(enqueued, 2)
    const [d3, d7] = enqueued
    assert.equal(d3.to, lead.email)
    assert.equal(d3.subject, '3 tips to reduce your boat maintenance costs')
    assert.include(d3.html, 'Anticipate small repairs')
    assert.notInclude(d3.html, 'Anticipez')

    assert.equal(d7.subject, 'Your boat maintenance estimate — still available')
    assert.include(plain(d7.text), 'between €1,200 and €3,400 per year')
    assert.include(plain(d7.html ?? ''), '€1,200')
    assert.notInclude(plain(d7.text), '1 200 €')
  })

  test('un lead francophone reçoit des relances en français, montants au format français', async ({
    assert,
  }) => {
    const { enqueued } = await runNurturing('fr')

    const [d3, d7] = enqueued
    assert.equal(d3.subject, "3 conseils pour réduire les coûts d'entretien de votre bateau")
    assert.include(d3.html, 'Anticipez les petites réparations')
    assert.equal(d7.subject, "Votre estimation d'entretien bateau — toujours disponible")
    assert.include(plain(d7.text), 'entre 1 200 € et 3 400 € par an')
  })
})

test.group('Simulateur — rapport (SendSimulatorReportJob)', (group) => {
  group.each.setup(() => truncateDb())

  test('le rapport suit la langue du lead : libellés et montants', async ({ assert }) => {
    const en = await runReport('en')
    const fr = await runReport('fr')

    assert.lengthOf(en.enqueued, 1)
    assert.equal(en.enqueued[0].subject, 'Your boat maintenance report — FleetAi')
    assert.include(en.enqueued[0].text, 'Your cost estimation report')
    assert.include(en.enqueued[0].html, 'Rigging')
    assert.match(plain(en.enqueued[0].html ?? ''), /€\d{1,3}(,\d{3})*/)

    assert.equal(fr.enqueued[0].subject, "Votre rapport d'entretien bateau — FleetAi")
    assert.include(fr.enqueued[0].html, 'Gréement')
    assert.match(plain(fr.enqueued[0].html ?? ''), /\d{1,3}( \d{3})* €/)
  })
})
