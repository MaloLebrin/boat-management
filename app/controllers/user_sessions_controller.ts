import UserSessionService from '#services/user_session_service'
import {
  CannotRevokeCurrentSessionError,
  UserSessionNotFoundError,
} from '#exceptions/user_session_errors'
import { AUTH_SESSION_STARTED_AT_KEY } from '#shared/constants/auth'
import { newLoginNotificationValidator } from '#validators/user_session'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Appareils et sessions connectés (#885) — section de `/settings/me`.
 * La liste est rendue par `SettingsController.me`.
 */
@inject()
export default class UserSessionsController {
  constructor(private userSessionService: UserSessionService) {}

  /** Déconnecte une autre session (et son remember-me). */
  async destroy({ auth, params, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!this.userSessionService.isTracked(user)) {
      session.flash('error', i18n.t('flash.sessions.notFound'))
      return response.redirect().back()
    }

    try {
      await this.userSessionService.revoke(
        user,
        String(params.id),
        this.userSessionService.currentId(session)
      )
    } catch (error) {
      if (error instanceof CannotRevokeCurrentSessionError) {
        session.flash('error', i18n.t('flash.sessions.cannotRevokeCurrent'))
        return response.redirect().back()
      }
      if (error instanceof UserSessionNotFoundError) {
        session.flash('error', i18n.t('flash.sessions.notFound'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.sessions.revoked'))
    return response.redirect().back()
  }

  /** « Déconnecter partout sauf ici ». */
  async destroyOthers({ auth, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    if (this.userSessionService.isTracked(user)) {
      const validAfter = await this.userSessionService.revokeOthers(
        user,
        this.userSessionService.currentId(session)
      )
      // Même geste que le changement de mot de passe (#763) : la session
      // courante est réestampillée pour survivre à `sessionsValidAfter`.
      session.put(AUTH_SESSION_STARTED_AT_KEY, validAfter.toISO() ?? '')
    }

    session.flash('success', i18n.t('flash.sessions.othersRevoked'))
    return response.redirect().back()
  }

  /** Remember-me antérieurs au registre, rattachés à aucune session. */
  async destroyRemembered({ auth, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    if (this.userSessionService.isTracked(user)) {
      await this.userSessionService.revokeOrphanRememberMeTokens(user)
    }
    session.flash('success', i18n.t('flash.sessions.orphansRevoked'))
    return response.redirect().back()
  }

  async updateNotifications({ auth, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const { enabled } = await request.validateUsing(newLoginNotificationValidator)
    await this.userSessionService.setNotifyNewLogin(user, enabled)
    session.flash('success', i18n.t('flash.sessions.notifyUpdated'))
    return response.redirect().back()
  }
}
