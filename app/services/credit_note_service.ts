import {
  CannotIssueCreditNoteError,
  CreditNoteAmountError,
  CreditNoteLinesRequiredError,
  InvoiceNotFoundError,
} from '#exceptions/invoice_errors'
import Invoice from '#models/invoice'
import InvoiceLine from '#models/invoice_line'
import AuditLogService from '#services/audit_log_service'
import InvoiceService from '#services/invoice_service'
import { computeInvoiceTotals } from '#shared/helpers/invoice_totals'
import {
  canIssueCreditNote,
  creditableRemaining,
  roundMoney,
} from '#shared/helpers/invoice_lifecycle'
import type { CreateCreditNotePayload, InvoiceLineInput } from '#shared/types/invoice'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

/**
 * Avoirs (notes de crédit, #877).
 *
 * Une facture émise est figée (#717) : on ne la corrige pas, on émet un avoir
 * qui l'annule en tout ou partie. L'avoir est une pièce de la table `invoices`
 * (`kind = 'credit_note'`), numérotée dans sa propre séquence (`AV-`), liée à
 * sa facture par `credited_invoice_id`. Ses montants sont **positifs** : c'est
 * sa nature qui les retranche.
 *
 * - Émis directement (`sent`), jamais brouillon : il n'existe que pour
 *   corriger une pièce déjà émise.
 * - Il hérite du client, de la réservation, de la devise et du taux de TVA de
 *   la facture ; le motif est porté par `notes`.
 * - La somme des avoirs ne dépasse jamais le total de la facture. Quand elle
 *   l'atteint, la facture passe à `credited`.
 * - Son « paiement » (`paid_at` + moyen) est le **remboursement** du client,
 *   saisi par la route de paiement habituelle.
 */
@inject()
export default class CreditNoteService {
  constructor(
    private invoiceService: InvoiceService,
    private auditLogService: AuditLogService
  ) {}

  /** Somme TTC des avoirs émis sur une facture. */
  async creditedTotal(invoice: Invoice, trx?: TransactionClientContract): Promise<number> {
    const row = await db
      .from('invoices')
      .if(trx, (q) => q.useTransaction(trx!))
      .where('organization_id', invoice.organizationId)
      .where('kind', 'credit_note')
      .where('credited_invoice_id', invoice.id)
      .sum('total as total')
      .first()
    return roundMoney(Number.parseFloat(String(row?.total ?? '0')) || 0)
  }

  /**
   * Émet un avoir sur `invoice`. Sans `lines`, avoir total : les lignes de la
   * facture en miroir — refusé si un avoir a déjà été émis, le miroir
   * dépasserait alors le reste.
   */
  async issue(
    invoice: Invoice,
    payload: CreateCreditNotePayload,
    userId: number | null
  ): Promise<Invoice> {
    const { creditNote, fullyCredited } = await db.transaction(async (trx) => {
      // Verrou sur la facture : deux avoirs simultanés ne dépassent pas le reste.
      const locked = await Invoice.query({ client: trx })
        .where('id', invoice.id)
        .where('organizationId', invoice.organizationId)
        .forUpdate()
        .first()
      if (!locked) throw new InvoiceNotFoundError()
      if (!canIssueCreditNote(locked)) throw new CannotIssueCreditNoteError()

      const total = Number.parseFloat(locked.total)
      const alreadyCredited = await this.creditedTotal(locked, trx)
      const remaining = creditableRemaining(total, alreadyCredited)

      const lines = await this.#resolveLines(locked, payload.lines, alreadyCredited, trx)
      const taxRate = Number.parseFloat(locked.taxRate)
      const totals = computeInvoiceTotals(lines, taxRate)
      if (totals.total <= 0 || totals.total > remaining) throw new CreditNoteAmountError()

      const number = await this.invoiceService.allocateNumber(
        trx,
        locked.organizationId,
        'credit_note'
      )

      const note = await Invoice.create(
        {
          organizationId: locked.organizationId,
          clientId: locked.clientId,
          reservationId: locked.reservationId,
          creditedInvoiceId: locked.id,
          kind: 'credit_note',
          number,
          clientName: locked.clientName,
          status: 'sent',
          issuedAt: DateTime.now(),
          dueAt: null,
          paidAt: null,
          subtotal: String(totals.subtotal),
          taxRate: locked.taxRate,
          taxAmount: String(totals.taxAmount),
          total: String(totals.total),
          currency: locked.currency,
          notes: payload.reason.trim(),
        },
        { client: trx }
      )

      await InvoiceLine.createMany(
        lines.map((line, index) => ({
          invoiceId: note.id,
          label: line.label.trim(),
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          amount: String(totals.lines[index].amount),
          position: index,
        })),
        { client: trx }
      )

      // Avoir total : la facture est soldée par l'avoir. Son paiement éventuel
      // reste inscrit — le remboursement se suit sur l'avoir.
      const full = roundMoney(alreadyCredited + totals.total) >= total
      if (full) {
        locked.status = 'credited'
        await locked.useTransaction(trx).save()
      }

      return { creditNote: note, fullyCredited: full }
    })

    try {
      await this.auditLogService.log({
        organizationId: invoice.organizationId,
        userId,
        action: 'invoice.credit_note_issued',
        entityType: 'invoice',
        entityId: invoice.id,
        metadata: {
          invoiceNumber: invoice.number,
          creditNoteId: creditNote.id,
          creditNoteNumber: creditNote.number,
          total: creditNote.total,
          full: fullyCredited,
        },
      })
    } catch (error) {
      logger.error({ err: error, creditNoteId: creditNote.id }, 'Credit note audit log failed')
    }

    return creditNote
  }

  async #resolveLines(
    invoice: Invoice,
    lines: InvoiceLineInput[] | undefined,
    alreadyCredited: number,
    trx: TransactionClientContract
  ): Promise<InvoiceLineInput[]> {
    if (lines && lines.length > 0) return lines
    if (alreadyCredited > 0) throw new CreditNoteLinesRequiredError()

    const invoiceLines = await InvoiceLine.query({ client: trx })
      .where('invoiceId', invoice.id)
      .orderBy('position', 'asc')
    return invoiceLines.map((line) => ({
      label: line.label,
      quantity: Number.parseFloat(line.quantity),
      unitPrice: Number.parseFloat(line.unitPrice),
    }))
  }
}
