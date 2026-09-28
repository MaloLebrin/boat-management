import {
  CannotIssueCreditNoteError,
  CreditNoteAmountError,
  CreditNoteLinesRequiredError,
  InvoiceNotFoundError,
} from '#exceptions/invoice_errors'
import { UserNotInOrganizationError } from '#exceptions/organization_errors'
import type Organization from '#models/organization'
import InvoicePolicy from '#policies/invoice_policy'
import CreditNoteService from '#services/credit_note_service'
import InvoiceService from '#services/invoice_service'
import { canIssueCreditNote } from '#shared/helpers/invoice_lifecycle'
import { toInvoiceDetail } from '#transformers/invoice_transformer'
import { createCreditNoteValidator } from '#validators/invoice'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Avoirs (#877) : une facture émise ne se corrige pas, elle s'avoire. Écran
 * d'émission depuis la fiche facture, module CRM & Facturation requis (garde
 * posée sur le groupe de routes).
 */
@inject()
export default class CreditNotesController {
  constructor(
    private invoiceService: InvoiceService,
    private creditNoteService: CreditNoteService
  ) {}

  private async loadOrg(auth: HttpContext['auth']): Promise<Organization> {
    const user = auth.getUserOrFail()
    await user.load('organization')
    if (user.organization === null) throw new UserNotInOrganizationError()
    return user.organization
  }

  async create({ inertia, auth, bouncer, params, session, response, i18n }: HttpContext) {
    const org = await this.loadOrg(auth)
    await bouncer.with(InvoicePolicy).authorize('create')

    let invoice
    try {
      invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        return response.redirect('/invoices')
      }
      throw error
    }

    if (!canIssueCreditNote(invoice)) {
      session.flash('error', i18n.t('flash.invoices.cannotIssueCreditNote'))
      return response.redirect(`/invoices/${invoice.id}`)
    }

    const links = await this.invoiceService.getLinks(invoice)
    return inertia.render('invoices/credit_note', {
      invoice: toInvoiceDetail(invoice, links),
    })
  }

  async store({ request, auth, bouncer, params, session, response, i18n }: HttpContext) {
    const org = await this.loadOrg(auth)
    await bouncer.with(InvoicePolicy).authorize('create')

    const payload = await request.validateUsing(createCreditNoteValidator)

    try {
      const invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
      const creditNote = await this.creditNoteService.issue(
        invoice,
        payload,
        auth.getUserOrFail().id
      )
      session.flash('success', i18n.t('flash.invoices.creditNoteIssued'))
      return response.redirect(`/invoices/${creditNote.id}`)
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        return response.redirect('/invoices')
      }
      if (error instanceof CannotIssueCreditNoteError) {
        session.flash('error', i18n.t('flash.invoices.cannotIssueCreditNote'))
        return response.redirect(`/invoices/${params.id}`)
      }
      if (error instanceof CreditNoteAmountError) {
        session.flash('error', i18n.t('flash.invoices.creditNoteAmount'))
        return response.redirect().back()
      }
      if (error instanceof CreditNoteLinesRequiredError) {
        session.flash('error', i18n.t('flash.invoices.creditNoteLinesRequired'))
        return response.redirect().back()
      }
      throw error
    }
  }
}
