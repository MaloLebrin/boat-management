import ProcessedStripeEvent from '#models/processed_stripe_event'
import SubscriptionService from '#services/subscription_service'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import type Stripe from 'stripe'

/**
 * Rétention des traces d'événements traités (#703).
 *
 * Stripe ne rejoue pas au-delà de trois jours ; trente jours laissent une marge
 * confortable pour diagnostiquer un rejeu après coup, sans laisser la table
 * croître indéfiniment.
 */
export const PROCESSED_EVENT_RETENTION_DAYS = 30

/**
 * Traitement idempotent des webhooks Stripe (#703).
 *
 * Stripe livre **au moins une fois**, jamais exactement une fois : il rejoue à
 * chaque réponse non-2xx, et parfois même après un 2xx. Rien ne gardait trace
 * des événements déjà traités — ni table, ni contrainte, ni garde — et chaque
 * livraison était rejouée intégralement.
 *
 * Si le traitement était jusqu'ici inoffensif en rejeu, c'était par **effet de
 * bord** : `SubscriptionService` passe par un `updateOrCreate` clé sur
 * `organizationId`, qui réécrit les mêmes valeurs. Personne n'avait conçu cette
 * idempotence, et rien ne la protégeait : il suffisait d'ajouter au chemin de
 * synchro une écriture non idempotente — un compteur, une ligne d'historique,
 * une notification, une écriture comptable — pour que le rejeu la duplique sans
 * qu'aucun test existant ne bronche.
 */
@inject()
export default class StripeWebhookService {
  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * Traite l'événement s'il ne l'a jamais été. Rend `true` s'il a été traité
   * ici, `false` si c'était un rejeu.
   *
   * La trace est écrite **avant** le traitement et dans la **même
   * transaction** : un `INSERT` séparé, commité avant, perdrait l'événement
   * pour de bon si le traitement échouait ensuite (marqué traité, jamais
   * appliqué) ; commité après, il laisserait une fenêtre où un rejeu concurrent
   * rejouerait tout. Ensemble, les deux issues sont exclues — l'échec du
   * traitement annule la trace, et Stripe rejouera.
   */
  async process(event: Stripe.Event): Promise<boolean> {
    return db.transaction(async (trx) => {
      if (!(await this.claim(event, trx))) {
        logger.info(
          { stripeEventId: event.id, type: event.type },
          'Stripe webhook event already processed, skipping'
        )
        return false
      }

      await this.dispatch(event, trx)
      return true
    })
  }

  /**
   * Réserve l'événement. `false` s'il était déjà enregistré.
   *
   * `ON CONFLICT DO NOTHING ... RETURNING id` plutôt qu'un `SELECT` suivi d'un
   * `INSERT` : deux livraisons simultanées du même `evt_…` passeraient toutes
   * deux la lecture, et la seconde casserait sur l'index unique — une 500, donc
   * un rejeu de plus. Ici, PostgreSQL tranche en une instruction : celle qui
   * insère reçoit une ligne, l'autre n'en reçoit aucune et sort proprement.
   */
  private async claim(event: Stripe.Event, trx: TransactionClientContract): Promise<boolean> {
    const inserted = await trx
      .insertQuery()
      .table(ProcessedStripeEvent.table)
      .insert({
        stripe_event_id: event.id,
        type: event.type,
        processed_at: DateTime.now().toSQL(),
      })
      .onConflict('stripe_event_id')
      .ignore()
      .returning('id')

    return inserted.length > 0
  }

  /**
   * Aiguillage des types traités. Le `switch` n'a volontairement pas de
   * `default` : un type non géré est acquitté sans effet, pour que Stripe cesse
   * de le rejouer.
   */
  private async dispatch(event: Stripe.Event, trx: TransactionClientContract): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.subscriptionService.syncFromCheckoutSession(
          event.data.object as Stripe.Checkout.Session,
          trx
        )
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.subscriptionService.syncFromSubscriptionEvent(
          event.data.object as Stripe.Subscription,
          trx
        )
        break
    }
  }

  /**
   * Purge les traces plus vieilles que la rétention. Rend le nombre de lignes
   * supprimées.
   */
  async purgeExpired(retentionDays = PROCESSED_EVENT_RETENTION_DAYS): Promise<number> {
    const cutoff = DateTime.now().minus({ days: retentionDays })

    // `delete()` rend `[count]` sur PostgreSQL.
    const deleted = await ProcessedStripeEvent.query()
      .where('processedAt', '<', cutoff.toISO())
      .delete()

    return Number(deleted[0] ?? 0)
  }
}
