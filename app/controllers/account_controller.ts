import AccountService from '#services/account_service'
import UserSessionService from '#services/user_session_service'
import {
  DemoAccountProtectedError,
  LastAdminOfActiveOrganizationError,
  MembershipNotFoundError,
  OnlyOrganizationError,
} from '#exceptions/account_errors'
import { LastAdminError } from '#exceptions/organization_errors'
import { AUTH_SESSION_RECORD_KEY } from '#shared/constants/auth'
import { formatDateLong } from '#shared/helpers/date_format'
import { deleteAccountValidator } from '#validators/account'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

/**
 * Gestion du compte en libre-service (#886) — zone dangereuse de
 * `/settings/me`, rendue par `SettingsController.me`.
 */
@inject()
export default class AccountController {
  constructor(
    private accountService: AccountService,
    private userSessionService: UserSessionService
  ) {}

  /** « Exporter mes données » : fichier JSON (portabilité, art. 20 RGPD). */
  async export({ auth, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    try {
      const data = await this.accountService.exportData(user)
      const filename = `fleetai-my-data-${DateTime.now().toISODate()}.json`
      response.header('Content-Type', 'application/json; charset=utf-8')
      response.header('Cache-Control', 'no-store')
      response.attachment(filename)
      return response.send(JSON.stringify(data, null, 2))
    } catch (error) {
      if (error instanceof DemoAccountProtectedError) {
        session.flash('error', i18n.t('flash.account.demoProtected'))
        return response.redirect().back()
      }
      throw error
    }
  }

  /** Quitter une organisation. */
  async leave({ auth, params, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    try {
      await this.accountService.leaveOrganization(user, Number(params.organizationId))
    } catch (error) {
      const key = this.#leaveErrorKey(error)
      if (key === null) throw error
      session.flash('error', i18n.t(key))
      return response.redirect().back()
    }
    session.flash('success', i18n.t('flash.account.left'))
    return response.redirect('/settings/me')
  }

  /** Demande de suppression du compte : coupe la session et renvoie au login. */
  async destroy({ auth, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const { password } = await request.validateUsing(deleteAccountValidator)

    if (!(await hash.verify(user.password, password))) {
      session.flashAll()
      session.flash('inputErrorsBag', {
        password: [i18n.t('validator.settings.wrongCurrentPassword')],
      })
      return response.redirect().back()
    }

    let purgeAt: DateTime
    try {
      purgeAt = await this.accountService.requestDeletion(user)
    } catch (error) {
      if (error instanceof LastAdminOfActiveOrganizationError) {
        session.flash(
          'error',
          i18n.t('flash.account.lastAdmin', { organizations: error.organizationNames.join(', ') })
        )
        return response.redirect().back()
      }
      if (error instanceof DemoAccountProtectedError) {
        session.flash('error', i18n.t('flash.account.demoProtected'))
        return response.redirect().back()
      }
      throw error
    }

    await this.userSessionService.end(this.userSessionService.currentId(session))
    session.forget(AUTH_SESSION_RECORD_KEY)
    await auth.use('web').logout()
    session.flash(
      'success',
      i18n.t('flash.account.deletionScheduled', {
        date: formatDateLong(purgeAt.toISO()!, i18n.locale),
      })
    )
    return response.redirect('/login')
  }

  #leaveErrorKey(error: unknown): string | null {
    if (error instanceof MembershipNotFoundError) return 'flash.account.membershipNotFound'
    if (error instanceof LastAdminError) return 'flash.account.leaveLastAdmin'
    if (error instanceof OnlyOrganizationError) return 'flash.account.leaveOnlyOrganization'
    if (error instanceof DemoAccountProtectedError) return 'flash.account.demoProtected'
    return null
  }
}
