import OrganizationPolicy from '#policies/organization_policy'
import TwoFactorService from '#services/two_factor_service'
import {
  TwoFactorAlreadyEnabledError,
  TwoFactorNotEnabledError,
  TwoFactorSetupMissingError,
} from '#exceptions/two_factor_errors'
import {
  disableTwoFactorValidator,
  organizationTwoFactorPolicyValidator,
  twoFactorCodeValidator,
} from '#validators/two_factor'
import { AUTH_SESSION_STARTED_AT_KEY } from '#shared/constants/auth'
import { TWO_FACTOR_RECOVERY_CODES_FLASH_KEY } from '#shared/constants/two_factor'
import { inject } from '@adonisjs/core'
import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Double authentification depuis `/settings/me` (#884) — activation,
 * désactivation, codes de secours — et politique d'organisation depuis
 * `/settings/org`.
 *
 * Chaque action répond par une redirection Inertia ; le QR code et les codes
 * de secours sont relus par `SettingsController.me`.
 */
@inject()
export default class TwoFactorSettingsController {
  constructor(private twoFactorService: TwoFactorService) {}

  /** Démarre l'activation : le QR code apparaît au rechargement. */
  async store({ auth, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    try {
      await this.twoFactorService.beginSetup(user)
    } catch (error) {
      if (!(error instanceof TwoFactorAlreadyEnabledError)) throw error
      session.flash('error', i18n.t('flash.twoFactor.alreadyEnabled'))
    }
    return response.redirect().back()
  }

  /** Confirme avec un premier code : la 2FA devient active. */
  async confirm({ auth, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const { code } = await request.validateUsing(twoFactorCodeValidator)

    let result: Awaited<ReturnType<TwoFactorService['confirmSetup']>>
    try {
      result = await this.twoFactorService.confirmSetup(user, code)
    } catch (error) {
      if (error instanceof TwoFactorAlreadyEnabledError) {
        session.flash('error', i18n.t('flash.twoFactor.alreadyEnabled'))
        return response.redirect().back()
      }
      if (error instanceof TwoFactorSetupMissingError) {
        session.flash('error', i18n.t('flash.twoFactor.setupMissing'))
        return response.redirect().back()
      }
      throw error
    }

    if (result === null) return this.#invalidCode(session, i18n, response)

    // Les autres sessions viennent d'être révoquées (#763) : on réestampille
    // celle-ci pour ne pas déconnecter celui qui vient d'activer.
    session.put(AUTH_SESSION_STARTED_AT_KEY, result.validAfter.toISO() ?? '')
    session.flash(TWO_FACTOR_RECOVERY_CODES_FLASH_KEY, result.recoveryCodes)
    session.flash('success', i18n.t('flash.twoFactor.enabled'))
    return response.redirect().back()
  }

  /** Abandonne une activation non confirmée. */
  async cancel({ auth, response }: HttpContext) {
    await this.twoFactorService.cancelSetup(auth.getUserOrFail())
    return response.redirect().back()
  }

  /** Désactive : mot de passe **et** second facteur. */
  async destroy({ auth, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const { password, code } = await request.validateUsing(disableTwoFactorValidator)

    if (!(await hash.verify(user.password, password))) {
      session.flashAll()
      session.flash('inputErrorsBag', {
        password: [i18n.t('validator.settings.wrongCurrentPassword')],
      })
      return response.redirect().back()
    }

    try {
      if (!(await this.twoFactorService.disable(user, code))) {
        return this.#invalidCode(session, i18n, response)
      }
    } catch (error) {
      if (!(error instanceof TwoFactorNotEnabledError)) throw error
      session.flash('error', i18n.t('flash.twoFactor.notEnabled'))
      return response.redirect().back()
    }

    session.flash('success', i18n.t('flash.twoFactor.disabled'))
    return response.redirect().back()
  }

  /** Nouveau jeu de codes de secours, affiché une fois. */
  async regenerateRecoveryCodes({ auth, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    const { code } = await request.validateUsing(twoFactorCodeValidator)

    let codes: string[] | null
    try {
      codes = await this.twoFactorService.regenerateRecoveryCodes(user, code)
    } catch (error) {
      if (!(error instanceof TwoFactorNotEnabledError)) throw error
      session.flash('error', i18n.t('flash.twoFactor.notEnabled'))
      return response.redirect().back()
    }
    if (codes === null) return this.#invalidCode(session, i18n, response)

    session.flash(TWO_FACTOR_RECOVERY_CODES_FLASH_KEY, codes)
    session.flash('success', i18n.t('flash.twoFactor.recoveryRegenerated'))
    return response.redirect().back()
  }

  /** Politique d'organisation (`/settings/org`) — `organization.manage`. */
  async updateOrganizationPolicy({ auth, bouncer, request, response, session, i18n }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with(OrganizationPolicy).authorize('manageOrganization')
    await user.load('organization')

    const { requireTwoFactor, graceDays } = await request.validateUsing(
      organizationTwoFactorPolicyValidator
    )
    await this.twoFactorService.setOrganizationPolicy(user.organization, user, {
      requireTwoFactor: requireTwoFactor ?? false,
      graceDays: graceDays ?? 0,
    })

    session.flash(
      'success',
      i18n.t(requireTwoFactor ? 'flash.twoFactor.policyEnabled' : 'flash.twoFactor.policyDisabled')
    )
    return response.redirect().back()
  }

  #invalidCode(
    session: HttpContext['session'],
    i18n: HttpContext['i18n'],
    response: HttpContext['response']
  ) {
    session.flashAll()
    session.flash('inputErrorsBag', { code: [i18n.t('validator.twoFactor.invalidCode')] })
    return response.redirect().back()
  }
}
