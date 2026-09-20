import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import ContactMessage from '#models/contact_message'
import SimulatorLead from '#models/simulator_lead'
import SimulatorShare from '#models/simulator_share'
import PurgePublicFormData from '#jobs/purge_public_form_data'
import ContactMessageService from '#services/contact_message_service'
import SimulatorLeadService from '#services/simulator_lead_service'
import SimulatorShareService from '#services/simulator_share_service'
import {
  CONTACT_MESSAGE_RETENTION_DAYS,
  SIMULATOR_LEAD_RETENTION_DAYS,
  SIMULATOR_SHARE_LIFETIME_DAYS,
} from '#shared/constants/data_retention'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '#shared/types/simulator'

/**
 * Purge des données de formulaires publics — cron quotidien 00:30 (#775).
 *
 * Ces trois tables sont écrites **sans authentification** depuis le site
 * public. Les throttles bornent le débit, pas le cumul : rien n'empêchait la
 * croissance sur la durée, et les deux premières portent des adresses e-mail
 * alors que l'app publie une politique de confidentialité.
 *
 * Pas de `truncateDb()` : la suite `integration` enveloppe tous ses tests dans
 * une transaction globale (`tests/bootstrap.ts`), annulée à la fin. Un
 * TRUNCATE par-dessus attendrait la fin de cette transaction et se bloquerait.
 * Chaque test préfixe donc ses lignes et n'assertre que sur les siennes.
 */

const INPUT: SimulatorBoatInput = { boatType: 'sailboat', lengthM: 10 } as SimulatorBoatInput
const BREAKDOWN: SimulatorCostBreakdown = {
  totalMin: 1000,
  totalMax: 2000,
} as SimulatorCostBreakdown

async function seedContact(email: string, daysAgo: number) {
  const message = await ContactMessage.create({
    subject: 'general',
    firstName: 'Purge',
    lastName: 'Test',
    email,
    organization: null,
    fleetSize: null,
    message: 'contenu',
    locale: 'fr',
    ipAddress: null,
  })
  // `createdAt` est en `autoCreate` : il faut l'écrire en base après coup.
  await ContactMessage.query()
    .where('id', message.id)
    .update({ created_at: DateTime.now().minus({ days: daysAgo }).toSQL() })
  return message
}

async function remainingContacts(prefix: string): Promise<string[]> {
  const rows = await ContactMessage.query().where('email', 'like', `${prefix}%`).orderBy('email')
  return rows.map((row) => row.email)
}

async function seedLead(email: string, updatedDaysAgo: number) {
  const lead = await SimulatorLead.create({
    email,
    boatType: 'sailboat',
    lengthM: 10,
    totalMin: 1000,
    totalMax: 2000,
    locale: 'fr',
  })
  await SimulatorLead.query()
    .where('id', lead.id)
    .update({ updated_at: DateTime.now().minus({ days: updatedDaysAgo }).toSQL() })
  return lead
}

async function remainingLeads(prefix: string): Promise<string[]> {
  const rows = await SimulatorLead.query().where('email', 'like', `${prefix}%`).orderBy('email')
  return rows.map((row) => row.email)
}

async function seedShare(token: string, expiresInDays: number) {
  return SimulatorShare.create({
    token,
    input: INPUT,
    breakdown: BREAKDOWN,
    locale: 'fr',
    expiresAt: DateTime.now().plus({ days: expiresInDays }),
  })
}

async function remainingShares(prefix: string): Promise<string[]> {
  const rows = await SimulatorShare.query().where('token', 'like', `${prefix}%`).orderBy('token')
  return rows.map((row) => row.token)
}

test.group('PurgePublicFormData (cron 00:30)', () => {
  test('supprime les lignes au-delà de la rétention et garde le reste', async ({ assert }) => {
    await seedContact('contact-window-fresh@purge.test', 1)
    await seedContact('contact-window-inside@purge.test', CONTACT_MESSAGE_RETENTION_DAYS - 1)
    await seedContact('contact-window-outside@purge.test', CONTACT_MESSAGE_RETENTION_DAYS + 1)

    await seedLead('lead-window-fresh@purge.test', 1)
    await seedLead('lead-window-inside@purge.test', SIMULATOR_LEAD_RETENTION_DAYS - 1)
    await seedLead('lead-window-outside@purge.test', SIMULATOR_LEAD_RETENTION_DAYS + 1)

    await seedShare('sharewindowlive', 30)
    await seedShare('sharewindowdead', -1)

    // Par le job, et non par les services : un `execute()` vidé de son corps
    // laisserait les services au vert et le cron sans effet.
    const job = await app.container.make(PurgePublicFormData)
    await job.execute()

    assert.deepEqual(await remainingContacts('contact-window-'), [
      'contact-window-fresh@purge.test',
      'contact-window-inside@purge.test',
    ])
    assert.deepEqual(await remainingLeads('lead-window-'), [
      'lead-window-fresh@purge.test',
      'lead-window-inside@purge.test',
    ])
    assert.deepEqual(await remainingShares('sharewindow'), ['sharewindowlive'])
  })

  test("la rétention d'un lead court depuis son dernier contact, pas depuis le premier", async ({
    assert,
  }) => {
    // Le cas que `createdAt` aurait raté : un prospect inscrit il y a trois
    // ans qui refait une simulation aujourd'hui. `create()` est un
    // `updateOrCreate` clé sur l'e-mail — il réécrit la ligne existante.
    const lead = await seedLead('lead-revisit@purge.test', SIMULATOR_LEAD_RETENTION_DAYS + 400)
    await SimulatorLead.query()
      .where('id', lead.id)
      .update({
        created_at: DateTime.now()
          .minus({ days: SIMULATOR_LEAD_RETENTION_DAYS + 400 })
          .toSQL(),
      })

    const service = await app.container.make(SimulatorLeadService)
    await service.create({
      email: 'lead-revisit@purge.test',
      boatType: 'sailboat',
      lengthM: 10,
      totalMin: 1000,
      totalMax: 2000,
      locale: 'fr',
    })

    assert.equal(await service.purgeExpired(), 0)
    assert.deepEqual(await remainingLeads('lead-revisit'), ['lead-revisit@purge.test'])

    // Et l'inverse : sans nouvelle visite, la ligne part.
    await seedLead('lead-stale@purge.test', SIMULATOR_LEAD_RETENTION_DAYS + 1)
    assert.equal(await service.purgeExpired(), 1)
    assert.deepEqual(await remainingLeads('lead-stale'), [])
  })

  test('un partage échu est illisible avant même le passage du cron', async ({ assert }) => {
    const service = await app.container.make(SimulatorShareService)

    await seedShare('sharereadlive', 1)
    await seedShare('sharereaddead', -1)

    // La date fait foi à la **lecture**, pas seulement à la purge : sinon un
    // lien expiré resterait ouvert jusqu'au cron de minuit.
    assert.isNotNull(await service.findByToken('sharereadlive'))
    assert.isNull(await service.findByToken('sharereaddead'))

    // La ligne est toujours là — c'est bien la lecture qui refuse.
    assert.deepEqual(await remainingShares('sharereaddead'), ['sharereaddead'])
  })

  test("un partage neuf porte l'échéance annoncée et un jeton de 32 hexa", async ({ assert }) => {
    const service = await app.container.make(SimulatorShareService)
    const share = await service.create(INPUT, BREAKDOWN, 'fr')

    // `randomBytes(16)` : 32 caractères hexadécimaux, contre 12 auparavant.
    assert.match(share.token, /^[0-9a-f]{32}$/)

    const days = share.expiresAt.diff(DateTime.now(), 'days').days
    assert.closeTo(days, SIMULATOR_SHARE_LIFETIME_DAYS, 1)
  })

  test('remonte le nombre de lignes supprimées et reste idempotent', async ({ assert }) => {
    const contactService = await app.container.make(ContactMessageService)
    const shareService = await app.container.make(SimulatorShareService)

    // Point de départ net : les tests précédents partagent la transaction
    // globale de la suite, leurs lignes sont encore là.
    await contactService.purgeExpired()
    await shareService.purgeExpired()

    await seedContact('contact-count-a@purge.test', CONTACT_MESSAGE_RETENTION_DAYS + 5)
    await seedContact('contact-count-b@purge.test', CONTACT_MESSAGE_RETENTION_DAYS + 90)
    await seedContact('contact-count-fresh@purge.test', 1)
    await seedShare(`sharecount${randomUUID().slice(0, 8)}`, -5)

    // Le compte remonte dans le log du job : une purge silencieuse ne se
    // distingue pas d'une purge qui ne tourne plus.
    assert.equal(await contactService.purgeExpired(), 2)
    assert.equal(await shareService.purgeExpired(), 1)
    assert.deepEqual(await remainingContacts('contact-count-'), ['contact-count-fresh@purge.test'])

    // Repasser ne supprime rien de plus.
    assert.equal(await contactService.purgeExpired(), 0)
    assert.equal(await shareService.purgeExpired(), 0)
  })
})
