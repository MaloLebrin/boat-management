import InvoiceService, { InvoiceNotFoundError } from '#services/invoice_service'
import QuotaService from '#services/quota_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import InvoicePolicy from '#policies/invoice_policy'
import { createInvoiceValidator, updateInvoiceValidator } from '#validators/invoice'
import { toInvoiceDetail } from '#transformers/invoice_transformer'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type Organization from '#models/organization'

@inject()
export default class InvoicesController {
  constructor(
    private invoiceService: InvoiceService,
    private quotaService: QuotaService
  ) {}

  private async loadOrgAndAssertEnterprise({
    auth,
    session,
    response,
    i18n,
  }: Pick<HttpContext, 'auth' | 'session' | 'response' | 'i18n'>): Promise<Organization | null> {
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      this.quotaService.assertCanManageInvoices(user.organization)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        session.flash('error', i18n.t('flash.quota.invoicesExceeded'))
        response.redirect('/')
        return null
      }
      throw error
    }

    return user.organization
  }

  async index({ inertia, auth, bouncer, request, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('create')

    const filters = this.invoiceService.normalizeFilters(request.qs())
    const invoices = await this.invoiceService.search(org, filters)
    const clientOptions = await this.invoiceService.listClientOptions(org)
    const canDelete = await bouncer.with(InvoicePolicy).allows('delete')

    return inertia.render('invoices/index', { invoices, filters, clientOptions, canDelete })
  }

  async show({ inertia, auth, bouncer, params, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('create')

    try {
      const invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
      const canDelete = await bouncer.with(InvoicePolicy).allows('delete')
      return inertia.render('invoices/show', { invoice: toInvoiceDetail(invoice), canDelete })
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        response.redirect('/invoices')
        return
      }
      throw error
    }
  }

  async create({ inertia, auth, bouncer, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('create')

    const clientOptions = await this.invoiceService.listClientOptions(org)
    return inertia.render('invoices/form', { invoice: null, clientOptions })
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('create')

    const payload = await request.validateUsing(createInvoiceValidator)
    const invoice = await this.invoiceService.create(org, payload)

    session.flash('success', i18n.t('flash.invoices.created'))
    response.redirect(`/invoices/${invoice.id}`)
  }

  async edit({ inertia, auth, bouncer, params, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('update')

    try {
      const invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
      const clientOptions = await this.invoiceService.listClientOptions(org)
      return inertia.render('invoices/form', {
        invoice: toInvoiceDetail(invoice),
        clientOptions,
      })
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        response.redirect('/invoices')
        return
      }
      throw error
    }
  }

  async update({ request, response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('update')

    try {
      const invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
      const payload = await request.validateUsing(updateInvoiceValidator)
      await this.invoiceService.update(invoice, payload)
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        response.redirect('/invoices')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.invoices.updated'))
    response.redirect(`/invoices/${params.id}`)
  }

  async destroy({ response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgAndAssertEnterprise({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('delete')

    try {
      const invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
      await this.invoiceService.delete(invoice)
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        response.redirect('/invoices')
        return
      }
      throw error
    }

    session.flash('success', i18n.t('flash.invoices.deleted'))
    response.redirect('/invoices')
  }
}
