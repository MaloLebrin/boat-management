import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import ProcessedStripeEvent from '#models/processed_stripe_event'
import PurgeProcessedStripeEvents from '#jobs/purge_processed_stripe_events'
import StripeWebhookService, {
  PROCESSED_EVENT_RETENTION_DAYS,
} from '#services/stripe_webhook_service'

/**
 * Purge des traces d'événements Stripe traités — cron quotidien 02:00 (#703).
 *
 * La déduplication par `event.id` n'a d'intérêt que le temps où Stripe peut
 * rejouer : trois jours au plus. Sans purge, la table grossirait indéfiniment
 * pour garder des lignes qui ne servent plus à rien.
 *
 * Deux façons de se tromper, symétriques :
 *
 * - purger trop peu ⇒ une table qui enfle sans fin, alors qu'elle est sur le
 *   chemin critique de chaque webhook (son index unique est consulté à chaque
 *   livraison) ;
 * - purger trop ⇒ la fenêtre de rejeu de Stripe n'est plus couverte, et un
 *   rejeu légitime serait retraité intégralement — ce que la déduplication
 *   existe précisément pour empêcher.
 *
 * Pas de `truncateDb()` ici : la suite `integration` enveloppe la totalité de
 * ses tests dans une **transaction globale** (`tests/bootstrap.ts`), annulée à
 * la fin. Un TRUNCATE par-dessus attendrait la fin de cette transaction et se
 * bloquerait indéfiniment. Chaque test préfixe donc ses `evt_…` et n'assertre
 * que sur les siens.
 */

async function seedEvent(eventId: string, daysAgo: number) {
  return ProcessedStripeEvent.create({
    stripeEventId: eventId,
    type: 'customer.subscription.updated',
    processedAt: DateTime.now().minus({ days: daysAgo }),
  })
}

/** Les traces restantes portant ce préfixe, triées. */
async function remainingIds(prefix: string): Promise<string[]> {
  const rows = await ProcessedStripeEvent.query()
    .select('id', 'stripe_event_id')
    .where('stripeEventId', 'like', `${prefix}%`)
    .orderBy('stripeEventId')

  return rows.map((row) => row.stripeEventId)
}

test.group('PurgeProcessedStripeEvents (cron 02:00)', () => {
  test('drops traces older than the retention and keeps the rest', async ({ assert }) => {
    await seedEvent('evt_window_today', 0)
    await seedEvent('evt_window_inside', PROCESSED_EVENT_RETENTION_DAYS - 1)
    await seedEvent('evt_window_outside', PROCESSED_EVENT_RETENTION_DAYS + 1)

    // Par le job, et non par le service : un `execute()` vidé de son corps
    // laisserait le service testé au vert et le cron sans effet.
    const job = await app.container.make(PurgeProcessedStripeEvents)
    await job.execute()

    assert.deepEqual(await remainingIds('evt_window_'), ['evt_window_inside', 'evt_window_today'])
  })

  test('covers the whole Stripe replay window — three days, by a wide margin', async ({
    assert,
  }) => {
    // Le seuil n'est pas arbitraire : Stripe ne rejoue pas au-delà de trois
    // jours. Une rétention plus courte rendrait la déduplication inopérante
    // pile sur les rejeus qu'elle doit attraper.
    assert.isAtLeast(PROCESSED_EVENT_RETENTION_DAYS, 7)

    await seedEvent('evt_replay_window', 3)

    const service = await app.container.make(StripeWebhookService)
    await service.purgeExpired()

    assert.deepEqual(await remainingIds('evt_replay_'), ['evt_replay_window'])
  })

  test('reports how many traces it removed', async ({ assert }) => {
    const service = await app.container.make(StripeWebhookService)
    // Point de départ net : les tests précédents partagent la transaction
    // globale de la suite, leurs lignes sont encore là.
    await service.purgeExpired()

    await seedEvent('evt_count_old_a', PROCESSED_EVENT_RETENTION_DAYS + 5)
    await seedEvent('evt_count_old_b', PROCESSED_EVENT_RETENTION_DAYS + 90)
    await seedEvent('evt_count_fresh', 1)

    // Le compte remonte dans le log du job : une purge silencieuse ne se
    // distingue pas d'une purge qui ne tourne plus.
    assert.equal(await service.purgeExpired(), 2)
    assert.deepEqual(await remainingIds('evt_count_'), ['evt_count_fresh'])

    // Idempotente : repasser ne supprime rien de plus.
    assert.equal(await service.purgeExpired(), 0)
  })
})
