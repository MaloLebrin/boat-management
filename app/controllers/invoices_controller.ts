import InvoiceService, {
  InvoiceNotFoundError,
  NotAQuoteError,
  QuoteAlreadyConvertedError,
  CannotMarkPaidError,
} from '#services/invoice_service'
import InvoicePdfService from '#services/invoice_pdf_service'
import EmailQueueService from '#services/email_queue_service'
import BoatReservationService from '#services/boat_reservation_service'
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
    private pdfService: InvoicePdfService,
    private emailQueueService: EmailQueueService,
    private reservationService: BoatReservationService,
    private quotaService: QuotaService
  ) {}

  /** Écriture : exige le module Facturation actif (tier ou add-on #327). */
  private async loadOrgForWrite({
    auth,
    session,
    response,
    i18n,
  }: Pick<HttpContext, 'auth' | 'session' | 'response' | 'i18n'>): Promise<Organization | null> {
    const user = auth.getUserOrFail()
    await user.load('organization')

    try {
      await this.quotaService.assertCanManageInvoices(user.organization)
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

  /**
   * Lecture : autorisée si le module est actif OU si l'organisation possède déjà
   * des devis/factures — accès résiduel en lecture seule après résiliation
   * (#332, lot 5b). Les documents émis restent consultables/exportables.
   */
  private async loadOrgForRead({
    auth,
    session,
    response,
    i18n,
  }: Pick<HttpContext, 'auth' | 'session' | 'response' | 'i18n'>): Promise<{
    org: Organization
    canManage: boolean
  } | null> {
    const user = auth.getUserOrFail()
    await user.load('organization')
    const org = user.organization

    if (org === null) {
      session.flash('error', i18n.t('flash.quota.invoicesExceeded'))
      response.redirect('/')
      return null
    }

    const canManage = await this.quotaService.canManageInvoices(org)
    if (!canManage && !(await this.invoiceService.hasAnyForOrg(org.id))) {
      session.flash('error', i18n.t('flash.quota.invoicesExceeded'))
      response.redirect('/')
      return null
    }

    return { org, canManage }
  }

  async index({ inertia, auth, bouncer, request, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadOrgForRead({ auth, session, response, i18n })
    if (!loaded) return
    const { org, canManage: moduleActive } = loaded

    await bouncer.with(InvoicePolicy).authorize('create')

    const filters = this.invoiceService.normalizeFilters(request.qs())
    const invoices = await this.invoiceService.search(org, filters)
    const clientOptions = await this.invoiceService.listClientOptions(org)
    const canDelete = moduleActive && (await bouncer.with(InvoicePolicy).allows('delete'))

    return inertia.render('invoices/index', {
      invoices,
      filters,
      clientOptions,
      canDelete,
      readOnly: !moduleActive,
    })
  }

  async show({ inertia, auth, bouncer, params, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const loaded = await this.loadOrgForRead({ auth, session, response, i18n })
    if (!loaded) return
    const { org, canManage: moduleActive } = loaded

    await bouncer.with(InvoicePolicy).authorize('create')

    try {
      const invoice = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
      const links = await this.invoiceService.getLinks(invoice)
      const canDelete = moduleActive && (await bouncer.with(InvoicePolicy).allows('delete'))
      return inertia.render('invoices/show', {
        invoice: toInvoiceDetail(invoice, links),
        canDelete,
        readOnly: !moduleActive,
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

  async create({ inertia, auth, bouncer, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('create')

    const clientOptions = await this.invoiceService.listClientOptions(org)
    return inertia.render('invoices/form', { invoice: null, clientOptions })
  }

  async store({ request, response, auth, bouncer, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('create')

    const payload = await request.validateUsing(createInvoiceValidator)
    const invoice = await this.invoiceService.create(org, payload)

    session.flash('success', i18n.t('flash.invoices.created'))
    response.redirect(`/invoices/${invoice.id}`)
  }

  async edit({ inertia, auth, bouncer, params, session, response, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
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
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
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
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
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

  async downloadPdf({ request, response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    // PDF d'un document émis : autorisé en lecture seule après résiliation.
    const loaded = await this.loadOrgForRead({ auth, session, response, i18n })
    if (!loaded) return
    const { org } = loaded

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

    const { buffer, filename } = await this.pdfService.generate(invoice, org, i18n)

    const inline = request.input('inline') === '1'
    response.header('Content-Type', 'application/pdf')
    response.header(
      'Content-Disposition',
      inline ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`
    )
    response.header('Content-Length', String(buffer.length))
    return response.send(buffer)
  }

  async send({ response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('update')

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

    // Client must have an email
    if (!invoice.client?.email) {
      session.flash('error', i18n.t('flash.invoices.noClientEmail'))
      return response.redirect().back()
    }

    // Enqueue the email
    await this.emailQueueService.sendInvoice({
      invoiceId: invoice.id,
      organizationId: org.id,
      to: invoice.client.email,
      locale: i18n.locale,
    })

    // Transition draft -> sent
    if (invoice.status === 'draft') {
      invoice.status = 'sent'
      await invoice.save()
    }

    session.flash('success', i18n.t('flash.invoices.sent'))
    return response.redirect().back()
  }

  async convert({ response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('update')

    let quote
    try {
      quote = await this.invoiceService.getForOrganizationOrFail(org, Number(params.id))
    } catch (error) {
      if (error instanceof InvoiceNotFoundError) {
        session.flash('error', i18n.t('flash.invoices.notFound'))
        return response.redirect('/invoices')
      }
      throw error
    }

    try {
      const invoice = await this.invoiceService.convertToInvoice(quote)
      session.flash('success', i18n.t('flash.invoices.converted'))
      return response.redirect(`/invoices/${invoice.id}`)
    } catch (error) {
      if (error instanceof NotAQuoteError) {
        session.flash('error', i18n.t('flash.invoices.notAQuote'))
        return response.redirect().back()
      }
      if (error instanceof QuoteAlreadyConvertedError) {
        session.flash('error', i18n.t('flash.invoices.alreadyConverted'))
        return response.redirect().back()
      }
      throw error
    }
  }

  async markPaid({ response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('update')

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

    try {
      await this.invoiceService.markAsPaid(invoice)
    } catch (error) {
      if (error instanceof CannotMarkPaidError) {
        session.flash('error', i18n.t('flash.invoices.cannotMarkPaid'))
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', i18n.t('flash.invoices.paid'))
    return response.redirect().back()
  }

  async createFromReservation({ response, auth, bouncer, params, session, i18n }: HttpContext) {
    await auth.authenticate()
    const org = await this.loadOrgForWrite({ auth, session, response, i18n })
    if (!org) return

    await bouncer.with(InvoicePolicy).authorize('create')

    const reservation = await this.reservationService.findForOrganization(
      org.id,
      Number(params.reservationId)
    )
    if (!reservation) {
      session.flash('error', i18n.t('flash.reservation.notFound'))
      return response.redirect('/reservations')
    }

    const lineLabel = i18n.t('invoices.fromReservation.line', {
      boat: reservation.boat?.name ?? '',
      start: reservation.startsAt.toISODate() ?? '',
      end: reservation.endsAt.toISODate() ?? '',
    })

    const invoice = await this.invoiceService.createQuoteFromReservation(org, reservation, {
      lineLabel,
    })

    session.flash('success', i18n.t('flash.invoices.quoteFromReservation'))
    return response.redirect(`/invoices/${invoice.id}`)
  }
}
