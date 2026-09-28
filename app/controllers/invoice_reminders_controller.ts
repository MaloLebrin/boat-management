import {
  CannotRemindInvoiceError,
  InvoiceNotFoundError,
  InvoiceReminderRecipientError,
} from '#exceptions/invoice_errors'
import { UserNotInOrganizationError } from '#exceptions/organization_errors'
import type Organization from '#models/organization'
import InvoicePolicy from '#policies/invoice_policy'
import OrganizationPolicy from '#policies/organization_policy'
import InvoiceReminderService from '#services/invoice_reminder_service'
import InvoiceService from '#services/invoice_service'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import {
  updateInvoiceRemindersSettingsValidator,
  updateInvoiceRemindersValidator,
} from '#validators/invoice'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Relances des factures en retard (#878) : « Relancer maintenant » et « ne
 * plus relancer » depuis la fiche facture (module CRM & Facturation requis,
 * garde posée sur le groupe de routes), réglages depuis `/settings/billing`.
 */
@inject()
export default class InvoiceRemindersController {
  constructor(
    private invoiceService: InvoiceService,
    private invoiceReminderService: InvoiceReminderService
  ) {}

  private async loadOrg(auth: HttpContext['auth']): Promise<Organization> {
    const user = auth.getUserOrFail()
    await user.load('organization')
    if (user.organization === null) throw new UserNotInOrganizationError()
    return user.organization
  }

  async store({ auth, bouncer, params, session, response, i18n }: HttpContext) {
    const org = await this.loadOrg(auth)
    await bouncer.with(InvoicePolicy).authorize('update')

    try {
      const invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
      await this.invoiceReminderService.sendNow(invoice, org, auth.getUserOrFail().id, i18n.locale)
      session.flash('success', i18n.t('flash.invoices.reminderSent'))
      return response.redirect().back()
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        return response.redirect('/invoices')
      }
      if (error instanceof CannotRemindInvoiceError) {
        session.flash('error', i18n.t('flash.invoices.cannotRemind'))
        return response.redirect().back()
      }
      if (error instanceof InvoiceReminderRecipientError) {
        session.flash(
          'error',
          i18n.t('flash.invoices.reminderNoRecipient', {
            reason: i18n.t(`invoices.reminders.skipReason.${error.reason}`),
          })
        )
        return response.redirect().back()
      }
      throw error
    }
  }

  async update({ request, auth, bouncer, params, session, response, i18n }: HttpContext) {
    const org = await this.loadOrg(auth)
    await bouncer.with(InvoicePolicy).authorize('update')
    const { disabled } = await request.validateUsing(updateInvoiceRemindersValidator)

    try {
      const invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
      await this.invoiceReminderService.setDisabled(invoice, disabled, auth.getUserOrFail().id)
      session.flash(
        'success',
        i18n.t(disabled ? 'flash.invoices.remindersDisabled' : 'flash.invoices.remindersEnabled')
      )
      return response.redirect().back()
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        return response.redirect('/invoices')
      }
      if (error instanceof CannotRemindInvoiceError) {
        session.flash('error', i18n.t('flash.invoices.cannotRemind'))
        return response.redirect().back()
      }
      throw error
    }
  }

  /** Réglages de l'organisation : réservés à `subscription.manage`, comme le compte Stripe. */
  async updateSettings({ request, auth, bouncer, session, response, i18n }: HttpContext) {
    const org = await this.loadOrg(auth)
    await bouncer.with(OrganizationPolicy).authorize('manageBilling')
    const payload = await request.validateUsing(updateInvoiceRemindersSettingsValidator)

    await this.invoiceReminderService.updateSettings(org, payload, auth.getUserOrFail().id)
    session.flash('success', i18n.t('flash.settings.invoiceRemindersUpdated'))
    return response.redirect(BILLING_SETTINGS_PATH)
  }
}
