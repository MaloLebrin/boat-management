import NotificationPreference from '#models/notification_preference'
import OrganizationMembership from '#models/organization_membership'
import User from '#models/user'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_NOTIFICATION_TIMEZONE,
  NOTIFICATION_FAMILIES,
  isNotificationFamily,
  notificationFamilyOf,
} from '#shared/constants/notifications'
import type { OrgRole } from '#shared/types/organization'
import type {
  NotificationChannelPreferences,
  NotificationFamily,
  NotificationPreferenceMatrix,
  NotificationPreferencesProps,
  NotificationType,
  UpdateNotificationPreferencesPayload,
} from '#shared/types/notification'
import encryption from '@adonisjs/core/services/encryption'
import db from '@adonisjs/lucid/services/db'
import { IANAZone } from 'luxon'

const UNSUBSCRIBE_PURPOSE = 'notification_unsubscribe'

/**
 * Préférences de notifications (#888) : la matrice familles × canaux d'un
 * utilisateur, ses défauts de rôle, et les réglages transverses (heures
 * calmes, résumé quotidien). Lue par `NotificationService.create()` avant
 * chaque canal.
 */
export default class NotificationPreferenceService {
  /**
   * Défauts du rôle tenu dans l'organisation de la notification. Sans
   * adhésion connue, rien n'est filtré (défauts admin) : c'est l'émetteur qui
   * a choisi son destinataire.
   */
  async #roleIn(userId: number, organizationId: number | null): Promise<OrgRole> {
    if (organizationId === null) return 'admin'
    const membership = await OrganizationMembership.query()
      .select('role')
      .where('userId', userId)
      .where('organizationId', organizationId)
      .first()
    return membership?.role ?? 'admin'
  }

  #merge(role: OrgRole, rows: NotificationPreference[]): NotificationPreferenceMatrix {
    const defaults = DEFAULT_NOTIFICATION_PREFERENCES[role]
    const matrix = {} as NotificationPreferenceMatrix
    for (const family of NOTIFICATION_FAMILIES) {
      const row = rows.find((r) => r.family === family)
      matrix[family] = row
        ? { inApp: row.inApp, push: row.push, email: row.email }
        : { ...defaults[family] }
    }
    return matrix
  }

  async matrixFor(
    userId: number,
    organizationId: number | null
  ): Promise<NotificationPreferenceMatrix> {
    const [role, rows] = await Promise.all([
      this.#roleIn(userId, organizationId),
      NotificationPreference.query().where('userId', userId),
    ])
    return this.#merge(role, rows)
  }

  /** Canaux ouverts pour un type donné, préférence de la famille comprise. */
  async channelsFor(
    userId: number,
    organizationId: number,
    type: NotificationType
  ): Promise<NotificationChannelPreferences> {
    const family = notificationFamilyOf(type)
    const [row, role] = await Promise.all([
      NotificationPreference.query().where('userId', userId).where('family', family).first(),
      this.#roleIn(userId, organizationId),
    ])
    if (row) return { inApp: row.inApp, push: row.push, email: row.email }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES[role][family] }
  }

  async settingsFor(user: User): Promise<NotificationPreferencesProps> {
    return {
      families: await this.matrixFor(user.id, user.organizationId),
      quietHours: user.notificationQuietHours,
      emailDigest: user.notificationEmailDigest,
      timezone: user.notificationTimezone,
    }
  }

  /** Enregistre toute la matrice : chaque famille reçoit sa ligne. */
  async update(user: User, payload: UpdateNotificationPreferencesPayload): Promise<void> {
    await db.transaction(async (trx) => {
      await NotificationPreference.updateOrCreateMany(
        ['userId', 'family'],
        NOTIFICATION_FAMILIES.map((family) => ({
          userId: user.id,
          family,
          ...payload.families[family],
        })),
        { client: trx }
      )
      user.useTransaction(trx)
      user.notificationQuietHours = payload.quietHours
      user.notificationEmailDigest = payload.emailDigest
      user.notificationTimezone = IANAZone.isValidZone(payload.timezone)
        ? payload.timezone
        : DEFAULT_NOTIFICATION_TIMEZONE
      await user.save()
    })
  }

  /**
   * Jeton de désinscription en un clic (#888) : (utilisateur, famille) signés
   * par le `MessageVerifier` de l'app, sans expiration. Indépendant du routeur,
   * il se fabrique aussi depuis un job de file.
   */
  unsubscribeToken(userId: number, family: NotificationFamily): string {
    return encryption.getMessageVerifier().sign({ userId, family }, undefined, UNSUBSCRIBE_PURPOSE)
  }

  /** Destinataire d'un jeton valide : un compte non anonymisé et une famille connue. */
  async resolveUnsubscribeToken(
    token: string
  ): Promise<{ user: User; family: NotificationFamily } | null> {
    const payload = encryption
      .getMessageVerifier()
      .unsign<{ userId?: unknown; family?: unknown }>(token, UNSUBSCRIBE_PURPOSE)
    if (!payload || typeof payload.userId !== 'number' || !isNotificationFamily(payload.family)) {
      return null
    }
    const user = await User.query().where('id', payload.userId).whereNull('anonymizedAt').first()
    return user ? { user, family: payload.family } : null
  }

  /**
   * Désinscription en un clic depuis un e-mail : coupe l'e-mail de la famille,
   * les deux autres canaux gardent leur valeur (posée ou par défaut).
   */
  async unsubscribeEmail(user: User, family: NotificationFamily): Promise<void> {
    const matrix = await this.matrixFor(user.id, user.organizationId)
    const current = matrix[family]
    await NotificationPreference.updateOrCreate(
      { userId: user.id, family },
      { ...current, email: false }
    )
  }
}
