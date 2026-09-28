import { randomBytes } from 'node:crypto'
import {
  InvoiceNotPayableError,
  OnlinePaymentsUnavailableError,
  PaymentLinkNotFoundError,
} from '#exceptions/billing_errors'
import Invoice from '#models/invoice'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import AuditLogService from '#services/audit_log_service'
import CreditNoteService from '#services/credit_note_service'
import NotificationService from '#services/notification_service'
import QuotaService from '#services/quota_service'
import StripeService from '#services/stripe_service'
import { invoiceBalanceDue, isInvoicePayableOnline } from '#shared/helpers/invoice_lifecycle'
import { formatCurrency } from '#shared/helpers/number_format'
import { toCents } from '#shared/helpers/reservation_payment'
import type {
  InvoiceCheckoutMetadata,
  OnlinePaymentsAccountState,
  OnlinePaymentsSettings,
  PublicInvoicePayment,
} from '#shared/types/online_payment'
import env from '#start/env'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import i18nManager from '@adonisjs/i18n/services/main'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import type Stripe from 'stripe'

/** Longueur du jeton de `/pay/:token` : 32 octets aléatoires, en base64url. */
const PAYMENT_TOKEN_BYTES = 32

/**
 * Paiement en ligne des factures par le client final (#876).
 *
 * L'organisation connecte **son** compte Stripe (Connect Standard) ; chaque
 * facture envoyée reçoit un jeton opaque, et la page publique `/pay/:token`
 * ouvre une session Checkout **sur le compte connecté** — l'argent va chez le
 * loueur, jamais chez FleetAi. Le webhook « comptes connectés » confirme le
 * paiement et règle la facture (`paymentMethod = 'online'`).
 */
@inject()
export default class OnlinePaymentService {
  constructor(
    private stripeService: StripeService,
    private quotaService: QuotaService,
    private auditLogService: AuditLogService,
    private notificationService: NotificationService,
    private creditNoteService: CreditNoteService
  ) {}

  // ── Compte connecté ──────────────────────────────────────────────────────

  accountState(org: Organization): OnlinePaymentsAccountState {
    if (!org.stripeConnectAccountId) return 'none'
    return org.stripeConnectChargesEnabled ? 'active' : 'pending'
  }

  async settingsFor(org: Organization, canManage: boolean): Promise<OnlinePaymentsSettings> {
    return {
      available:
        this.stripeService.isConfigured() && (await this.quotaService.canManageInvoices(org)),
      state: this.accountState(org),
      canManage,
    }
  }

  /**
   * Vrai si les factures de l'organisation peuvent être réglées en ligne :
   * module Facturation actif et compte connecté activé par Stripe.
   */
  async canAcceptOnlinePayments(org: Organization): Promise<boolean> {
    return this.accountState(org) === 'active' && (await this.quotaService.canManageInvoices(org))
  }

  /**
   * Crée le compte connecté s'il n'existe pas encore, puis rend l'URL
   * d'onboarding Stripe vers laquelle rediriger l'administrateur.
   */
  async startOnboarding(org: Organization, user: { id: number; email: string }): Promise<string> {
    if (!this.stripeService.isConfigured() || !(await this.quotaService.canManageInvoices(org))) {
      throw new OnlinePaymentsUnavailableError()
    }

    if (!org.stripeConnectAccountId) {
      org.stripeConnectAccountId = await this.stripeService.createConnectedAccount(org, user.email)
      org.stripeConnectChargesEnabled = false
      org.stripeConnectDetailsSubmitted = false
      await org.save()

      await this.auditLogService.log({
        organizationId: org.id,
        userId: user.id,
        action: 'online_payments.connect',
        entityType: 'organization',
        entityId: org.id,
      })
    }

    const appUrl = env.get('APP_URL')
    return this.stripeService.createAccountLink({
      accountId: org.stripeConnectAccountId,
      refreshUrl: `${appUrl}/settings/billing/online-payments/refresh`,
      returnUrl: `${appUrl}/settings/billing/online-payments/return`,
    })
  }

  /** Relit l'état du compte chez Stripe (retour d'onboarding). */
  async refreshAccountStatus(org: Organization): Promise<void> {
    if (!org.stripeConnectAccountId) return
    const account = await this.stripeService.retrieveAccount(org.stripeConnectAccountId)
    this.applyAccount(org, account)
    await org.save()
  }

  /**
   * Oublie le compte connecté. Le compte Standard appartient au loueur : il
   * n'est pas supprimé chez Stripe, FleetAi cesse seulement de s'en servir.
   * Les liens de paiement déjà envoyés deviennent indisponibles.
   */
  async disconnect(org: Organization, userId: number): Promise<void> {
    if (!org.stripeConnectAccountId) return

    org.stripeConnectAccountId = null
    org.stripeConnectChargesEnabled = false
    org.stripeConnectDetailsSubmitted = false
    await org.save()

    await this.auditLogService.log({
      organizationId: org.id,
      userId,
      action: 'online_payments.disconnect',
      entityType: 'organization',
      entityId: org.id,
    })
  }

  /** `account.updated` : Stripe pousse l'avancement de l'onboarding. */
  async syncAccount(account: Stripe.Account, trx: TransactionClientContract): Promise<void> {
    const org = await Organization.query({ client: trx })
      .where('stripeConnectAccountId', account.id)
      .first()
    if (!org) return

    this.applyAccount(org, account)
    await org.useTransaction(trx).save()
  }

  private applyAccount(org: Organization, account: Stripe.Account): void {
    org.stripeConnectChargesEnabled = Boolean(account.charges_enabled)
    org.stripeConnectDetailsSubmitted = Boolean(account.details_submitted)
  }

  // ── Lien de paiement ─────────────────────────────────────────────────────

  paymentUrl(token: string): string {
    return `${env.get('APP_URL')}/pay/${token}`
  }

  /**
   * URL de paiement à montrer (fiche, e-mail, PDF) : seulement tant que la
   * facture est payable et que l'organisation encaisse en ligne.
   */
  async paymentUrlFor(invoice: Invoice, org: Organization): Promise<string | null> {
    if (!invoice.paymentToken || !isInvoicePayableOnline(invoice)) return null
    if (!(await this.canAcceptOnlinePayments(org))) return null
    return this.paymentUrl(invoice.paymentToken)
  }

  /**
   * Pose le jeton de paiement d'une facture payable, si l'organisation
   * encaisse en ligne. Idempotent : un jeton existant est conservé, pour
   * qu'un lien déjà envoyé reste valable. Rend l'URL, ou `null`.
   */
  async ensurePaymentLink(invoice: Invoice, org: Organization): Promise<string | null> {
    if (!isInvoicePayableOnline(invoice)) return null
    if (!(await this.canAcceptOnlinePayments(org))) return null

    if (!invoice.paymentToken) {
      invoice.paymentToken = randomBytes(PAYMENT_TOKEN_BYTES).toString('base64url')
      await invoice.save()
    }
    return this.paymentUrl(invoice.paymentToken)
  }

  /** Reste à régler d'une facture, net des avoirs émis sur elle (#877). */
  async #amountDue(invoice: Invoice): Promise<number> {
    return invoiceBalanceDue(invoice, await this.creditNoteService.creditedTotal(invoice))
  }

  private async findByToken(token: string): Promise<{ invoice: Invoice; org: Organization }> {
    const invoice = await Invoice.query()
      .where('paymentToken', token)
      .preload('client')
      .preload('organization')
      .first()
    if (!invoice) throw new PaymentLinkNotFoundError()
    return { invoice, org: invoice.organization }
  }

  /** Props de la page publique : ce que la facture montre, sans plus. */
  async publicView(token: string, returnedFromCheckout: boolean): Promise<PublicInvoicePayment> {
    const { invoice, org } = await this.findByToken(token)

    let state: PublicInvoicePayment['state'] = 'unavailable'
    if (invoice.status === 'paid') state = 'paid'
    else if (isInvoicePayableOnline(invoice) && (await this.canAcceptOnlinePayments(org))) {
      state = 'payable'
    }

    return {
      token,
      state,
      organizationName: org.name,
      number: invoice.number,
      clientName: invoice.clientName,
      // Payable : le reste à régler, net des avoirs déjà émis (#877).
      total:
        state === 'payable' ? await this.#amountDue(invoice) : Number.parseFloat(invoice.total),
      currency: invoice.currency,
      issuedAt: invoice.issuedAt?.toISODate() ?? null,
      dueAt: invoice.dueAt?.toISODate() ?? null,
      returnedFromCheckout,
    }
  }

  /**
   * Ouvre une session Checkout sur le compte connecté pour le reste à régler
   * de la facture (net des avoirs, #877), et rend l'URL Stripe vers laquelle
   * rediriger le client.
   */
  async createCheckout(token: string): Promise<string> {
    const { invoice, org } = await this.findByToken(token)

    if (!isInvoicePayableOnline(invoice)) throw new InvoiceNotPayableError()
    if (!(await this.canAcceptOnlinePayments(org)) || !org.stripeConnectAccountId) {
      throw new OnlinePaymentsUnavailableError()
    }

    const metadata: InvoiceCheckoutMetadata = {
      invoice_id: String(invoice.id),
      organization_id: String(org.id),
    }
    const url = this.paymentUrl(token)
    const i18n = i18nManager.locale(i18nManager.defaultLocale)

    const session = await this.stripeService.createInvoiceCheckoutSession({
      accountId: org.stripeConnectAccountId,
      amountCents: toCents(await this.#amountDue(invoice)) ?? 0,
      currency: invoice.currency,
      productName: i18n.t('invoices.onlinePayment.checkoutProduct', {
        number: invoice.number,
        orgName: org.name,
      }),
      customerEmail: invoice.client?.email ?? null,
      successUrl: `${url}?status=success`,
      cancelUrl: url,
      metadata: { ...metadata },
    })

    invoice.stripeCheckoutSessionId = session.id
    await invoice.save()

    return session.url
  }

  // ── Webhook « comptes connectés » ────────────────────────────────────────

  /**
   * `checkout.session.completed` / `checkout.session.async_payment_succeeded`
   * d'un compte connecté : règle la facture.
   *
   * La facture est cherchée **dans l'organisation qui possède le compte
   * émetteur de l'événement** : des métadonnées qui désigneraient la facture
   * d'une autre organisation ne trouvent rien. Une session pas encore payée
   * (prélèvement SEPA en cours) attend l'événement asynchrone.
   */
  async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    accountId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    if (session.mode !== 'payment' || session.payment_status !== 'paid') return

    const invoiceId = Number(session.metadata?.invoice_id)
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) return

    const org = await Organization.query({ client: trx })
      .where('stripeConnectAccountId', accountId)
      .first()
    if (!org) {
      logger.warn({ accountId, invoiceId }, 'Online payment for an unknown connected account')
      return
    }

    const invoice = await Invoice.query({ client: trx })
      .where('id', invoiceId)
      .where('organizationId', org.id)
      .forUpdate()
      .first()
    if (!invoice) {
      logger.warn({ accountId, invoiceId }, 'Online payment for an unknown invoice')
      return
    }

    // Déjà réglée (rejeu, ou paiement saisi à la main entre-temps) : rien à
    // écrire. Annulée ou entièrement avoirée (#877) : l'argent est chez le
    // loueur, qui rembourse depuis Stripe — la facture, elle, ne revit pas.
    if (
      invoice.status === 'paid' ||
      invoice.status === 'cancelled' ||
      invoice.status === 'credited'
    ) {
      logger.warn(
        { invoiceId, status: invoice.status, sessionId: session.id },
        'Online payment received for an invoice that is not payable'
      )
      return
    }

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null)

    invoice.status = 'paid'
    invoice.paidAt = DateTime.now()
    invoice.paymentMethod = 'online'
    invoice.stripeCheckoutSessionId = session.id
    invoice.stripePaymentIntentId = paymentIntentId
    await invoice.useTransaction(trx).save()

    // Journal et notification une fois la transaction validée : un échec
    // plus loin annulerait le règlement, pas une trace déjà écrite.
    trx.after('commit', async () => {
      try {
        await this.afterPaid(invoice, org, paymentIntentId)
      } catch (error) {
        logger.error({ err: error, invoiceId: invoice.id }, 'Online payment follow-up failed')
      }
    })
  }

  private async afterPaid(
    invoice: Invoice,
    org: Organization,
    paymentIntentId: string | null
  ): Promise<void> {
    await this.auditLogService.log({
      organizationId: org.id,
      userId: null,
      action: 'invoice.paid_online',
      entityType: 'invoice',
      entityId: invoice.id,
      metadata: { number: invoice.number, total: invoice.total, paymentIntentId },
    })

    const i18n = i18nManager.locale(i18nManager.defaultLocale)
    const params = {
      number: invoice.number,
      clientName: invoice.clientName ?? '—',
      amount: formatCurrency(Number.parseFloat(invoice.total), i18n.locale, {
        currency: invoice.currency,
      }),
    }
    const admins = await OrganizationMembership.query()
      .where('organizationId', org.id)
      .where('role', 'admin')

    await Promise.all(
      admins.map((admin) =>
        this.notificationService.create({
          userId: admin.userId,
          organizationId: org.id,
          type: 'invoice.paid_online',
          severity: 'success',
          title: i18n.t('notifications.messages.invoice.paid_online.title', params),
          body: i18n.t('notifications.messages.invoice.paid_online.body', params),
          actionUrl: `/invoices/${invoice.id}`,
          metadata: { invoiceId: invoice.id },
        })
      )
    )
  }
}
