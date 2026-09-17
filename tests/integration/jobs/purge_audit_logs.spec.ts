import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import PurgeAuditLogs from '#jobs/purge_audit_logs'
import { OrganizationFactory } from '#database/factories/organization_factory'
import type { PlanTier } from '#shared/types/plan'

/**
 * Purge des journaux d'audit — cron quotidien 03:00 (#699).
 *
 * C'est l'un des deux seuls crons du produit qui **détruisent** des données, et
 * il tournait sans aucun test. Deux façons de se tromper, symétriques et toutes
 * deux coûteuses :
 *
 * - purger trop peu ⇒ la rétention RGPD annoncée n'est pas tenue ;
 * - purger trop ⇒ des journaux d'audit disparaissent, et un journal d'audit
 *   n'existe justement que pour être relu après coup.
 *
 * Le plan décide (`PLAN_LIMITS[plan].auditLogRetentionDays`) : `0` efface tout,
 * `null` ne purge rien, un entier coupe à N jours.
 */

async function seedLog(organizationId: number, daysAgo: number) {
  const log = await AuditLog.create({
    organizationId,
    userId: null,
    action: 'boat.create',
    entityType: 'boat',
    entityId: 1,
    metadata: {},
  })

  // `createdAt` est piloté par un `@column.dateTime({ autoCreate: true })` :
  // il faut le réécrire explicitement pour dater le journal dans le passé.
  await AuditLog.query()
    .where('id', log.id)
    .update({ created_at: DateTime.now().minus({ days: daysAgo }).toSQL({ includeOffset: false }) })

  return log
}

async function purge() {
  const job = await app.container.make(PurgeAuditLogs)
  await job.execute()
}

async function remainingFor(organizationId: number) {
  return AuditLog.query().where('organizationId', organizationId)
}

test.group('PurgeAuditLogs (cron 03:00)', () => {
  test('a pro organization keeps the last 90 days and loses what is older', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' as PlanTier }).create()
    const fresh = await seedLog(org.id, 10)
    const justInside = await seedLog(org.id, 89)
    await seedLog(org.id, 120)

    await purge()

    const remaining = await remainingFor(org.id)
    assert.deepEqual(remaining.map((log) => log.id).sort(), [fresh.id, justInside.id].sort())
  })

  test('an enterprise organization never loses a line', async ({ assert }) => {
    // `auditLogRetentionDays: null` — rétention illimitée. Purger ici serait une
    // perte de données silencieuse pour le plan qui paie le plus cher.
    const org = await OrganizationFactory.merge({ plan: 'enterprise' as PlanTier }).create()
    await seedLog(org.id, 10)
    await seedLog(org.id, 4000)

    await purge()

    assert.lengthOf(await remainingFor(org.id), 2)
  })

  test('a starter organization loses everything, however recent', async ({ assert }) => {
    // `auditLogRetentionDays: 0` — le plan starter n'a pas accès au journal
    // d'audit (`canAccessAuditLog`), donc rien n'y est conservé. Comportement
    // volontaire, figé ici : un jour de rétention accidentel serait une
    // fonctionnalité offerte par erreur, et sa disparition passerait pour un bug.
    const org = await OrganizationFactory.merge({ plan: 'starter' as PlanTier }).create()
    await seedLog(org.id, 0)
    await seedLog(org.id, 1)

    await purge()

    assert.lengthOf(await remainingFor(org.id), 0)
  })

  test('purging one organization never touches another', async ({ assert }) => {
    const starter = await OrganizationFactory.merge({ plan: 'starter' as PlanTier }).create()
    const enterprise = await OrganizationFactory.merge({ plan: 'enterprise' as PlanTier }).create()
    await seedLog(starter.id, 0)
    await seedLog(enterprise.id, 4000)

    await purge()

    assert.lengthOf(await remainingFor(starter.id), 0)
    assert.lengthOf(await remainingFor(enterprise.id), 1)
  })
})
