import SendPushNotification from '#jobs/send_push_notification'
import Notification from '#models/notification'
import User from '#models/user'
import EmailQueueService from '#services/email_queue_service'
import {
  DEFAULT_NOTIFICATION_TIMEZONE,
  NOTIFICATION_DIGEST_HOUR,
  isQuietHour,
  isUrgentNotification,
  notificationFamilyOf,
} from '#shared/constants/notifications'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import { DateTime } from 'luxon'

/** Destinataire d'un canal sortant : les seules colonnes utiles. */
type Recipient = Pick<
  User,
  | 'id'
  | 'email'
  | 'fullName'
  | 'locale'
  | 'anonymizedAt'
  | 'notificationTimezone'
  | 'notificationQuietHours'
  | 'notificationEmailDigest'
>

/**
 * Canaux sortants d'une notification (#888) : push (heures calmes comprises)
 * et e-mail (immédiat ou mis en attente du résumé quotidien). Appelé par
 * `NotificationService.create()` une fois la préférence lue — un canal coupé
 * n'arrive jamais ici. Chaque envoi est dans son propre `try/catch` côté
 * appelant : un canal en échec ne fait pas échouer la notification.
 */
export default class NotificationDispatcherService {
  async recipient(userId: number): Promise<Recipient | null> {
    return User.query()
      .select(
        'id',
        'email',
        'fullName',
        'locale',
        'anonymizedAt',
        'notificationTimezone',
        'notificationQuietHours',
        'notificationEmailDigest'
      )
      .where('id', userId)
      .first()
  }

  /** Heure locale du destinataire, fuseau invalide ramené à celui de l'app. */
  localNow(recipient: Pick<Recipient, 'notificationTimezone'>, now = DateTime.now()): DateTime {
    const local = now.setZone(recipient.notificationTimezone)
    return local.isValid ? local : now.setZone(DEFAULT_NOTIFICATION_TIMEZONE)
  }

  /** Push, sauf pendant les heures calmes du destinataire (la notif reste in-app). */
  async push(notification: Notification, recipient: Recipient, now = DateTime.now()) {
    if (recipient.notificationQuietHours && isQuietHour(this.localNow(recipient, now).hour)) {
      return false
    }
    await SendPushNotification.dispatch({
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.actionUrl,
      type: notification.type,
    })
    return true
  }

  /**
   * E-mail tout de suite, ou mis en attente du résumé quand le destinataire
   * l'a demandé — une notification urgente n'attend jamais.
   */
  async email(notification: Notification, recipient: Recipient): Promise<void> {
    if (recipient.anonymizedAt !== null) return
    if (recipient.notificationEmailDigest && !isUrgentNotification(notification.severity)) {
      notification.emailDigestPending = true
      await notification.save()
      return
    }
    const emailQueue = await app.container.make(EmailQueueService)
    await emailQueue.sendNotification({
      notificationId: notification.id,
      to: recipient.email,
      name: recipient.fullName,
      locale: recipient.locale,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.actionUrl,
      unsubscribeUrl: this.unsubscribeUrl(recipient.id, notification.type),
    })
  }

  /** Lien signé de désinscription en un clic de la famille du type. */
  unsubscribeUrl(userId: number, type: Notification['type']): string {
    const path = router.urlBuilder.signedUrlFor(
      'notifications.unsubscribe',
      { userId, family: notificationFamilyOf(type) },
      { purpose: 'notification_unsubscribe' }
    )
    return `${env.get('APP_URL')}${path}`
  }

  /**
   * Résumés quotidiens (#888) : le job tourne toutes les heures et sert les
   * destinataires pour qui il est {@link NOTIFICATION_DIGEST_HOUR}h. Une
   * notification n'est plus « en attente » une fois le résumé mis en file.
   */
  async sendDigests(now = DateTime.now()): Promise<number> {
    const userIds = await Notification.query().where('emailDigestPending', true).distinct('userId')
    let sent = 0
    for (const { userId } of userIds) {
      try {
        const recipient = await this.recipient(userId)
        if (!recipient) continue
        const local = this.localNow(recipient, now)
        if (local.hour !== NOTIFICATION_DIGEST_HOUR) continue

        const pending = await Notification.query()
          .select('id', 'title', 'body', 'actionUrl')
          .where('userId', userId)
          .where('emailDigestPending', true)
          .orderBy('createdAt', 'asc')
          .orderBy('id', 'asc')
        if (recipient.anonymizedAt === null && pending.length > 0) {
          const emailQueue = await app.container.make(EmailQueueService)
          await emailQueue.sendNotificationDigest({
            userId,
            to: recipient.email,
            name: recipient.fullName,
            locale: recipient.locale,
            date: local.toISODate()!,
            entries: pending.map((n) => ({ title: n.title, body: n.body, actionUrl: n.actionUrl })),
          })
          sent++
        }
        await Notification.query()
          .whereIn(
            'id',
            pending.map((n) => n.id)
          )
          .update({ emailDigestPending: false })
      } catch (error) {
        logger.error({ err: error, userId }, 'Notification digest failed')
      }
    }
    return sent
  }
}
