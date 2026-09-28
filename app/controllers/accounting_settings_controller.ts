import { UserNotInOrganizationError } from '#exceptions/organization_errors'
import OrganizationPolicy from '#policies/organization_policy'
import AccountingSettingsService from '#services/accounting_settings_service'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { accountingSettingsValidator } from '#validators/export'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/** Comptes du FEC et SIREN (#879), depuis `/settings/billing`. */
@inject()
export default class AccountingSettingsController {
  constructor(private accountingSettingsService: AccountingSettingsService) {}

  async update({ request, auth, bouncer, session, response, i18n }: HttpContext) {
    const user = await auth.authenticate()
    await user.load('organization')
    if (user.organization === null) throw new UserNotInOrganizationError()
    await bouncer.with(OrganizationPolicy).authorize('manageBilling')

    const payload = await request.validateUsing(accountingSettingsValidator)
    await this.accountingSettingsService.update(user.organization, payload, user.id)

    session.flash('success', i18n.t('flash.settings.accountingUpdated'))
    return response.redirect(BILLING_SETTINGS_PATH)
  }
}
