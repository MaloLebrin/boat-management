import {
  MarinaClientNotFoundError,
  MooringContractLockedError,
  MooringContractNotFoundError,
  MooringContractOverlapError,
  SpotNotInPortError,
  SpotOutOfServiceError,
} from '#exceptions/marina_errors'
import Boat from '#models/boat'
import Client from '#models/client'
import MooringContract from '#models/mooring_contract'
import Organization from '#models/organization'
import type Port from '#models/port'
import InvoiceService from '#services/invoice_service'
import SpotService from '#services/spot_service'
import {
  MARINA_DEFAULT_TAX_RATE,
  MOORING_INVOICE_DUE_DAYS,
  MOORING_MAX_CATCH_UP_PERIODS,
} from '#shared/constants/marina'
import { addPeriods, contractRenewalDue, previousDay } from '#shared/helpers/marina'
import { toIsoDay } from '#shared/helpers/date'
import { formatDate } from '#shared/helpers/date_format'
import type { MooringContractInput, MooringContractRow } from '#shared/types/marina'
import { inject } from '@adonisjs/core'
import type { I18n } from '@adonisjs/i18n'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

/**
 * Contrats d'amarrage (#891) : un client, une place, une périodicité. Les
 * factures se génèrent en brouillon à chaque échéance, par le job quotidien.
 */
@inject()
export default class MooringContractService {
  constructor(
    private spotService: SpotService,
    private invoiceService: InvoiceService
  ) {}

  async getForPortOrFail(port: Port, contractId: number): Promise<MooringContract> {
    const contract = await MooringContract.query()
      .where('id', contractId)
      .where('portId', port.id)
      .where('organizationId', port.organizationId)
      .preload('spot')
      .first()
    if (!contract) throw new MooringContractNotFoundError()
    return contract
  }

  /**
   * Un contrat actif par place : deux titulaires sur la même place, c'est une
   * double facturation. Le client et le bateau sont résolus dans
   * l'organisation — un id étranger est refusé (client) ou ignoré (bateau).
   */
  async create(port: Port, payload: MooringContractInput): Promise<MooringContract> {
    const spot = await this.spotService.findInPort(port.id, payload.spotId)
    if (!spot || spot.organizationId !== port.organizationId) throw new SpotNotInPortError()
    if (spot.status === 'out_of_service') throw new SpotOutOfServiceError()

    const client = await Client.query()
      .where('id', payload.clientId)
      .where('organizationId', port.organizationId)
      .select('id')
      .first()
    if (!client) throw new MarinaClientNotFoundError()

    const boat = payload.boatId
      ? await Boat.query()
          .where('id', payload.boatId)
          .where('organizationId', port.organizationId)
          .select('id')
          .first()
      : null

    const active = await MooringContract.query()
      .where('spotId', spot.id)
      .where('status', 'active')
      .select('id')
      .first()
    if (active) throw new MooringContractOverlapError()

    const startsOn = toIsoDay(payload.startsOn)
    return await MooringContract.create({
      organizationId: port.organizationId,
      portId: port.id,
      spotId: spot.id,
      clientId: client.id,
      boatId: boat?.id ?? null,
      startsOn: DateTime.fromISO(startsOn),
      endsOn: payload.endsOn ? DateTime.fromISO(toIsoDay(payload.endsOn)) : null,
      periodicity: payload.periodicity,
      amount: payload.amount,
      nextInvoiceOn: DateTime.fromISO(startsOn),
      status: 'active',
      notes: payload.notes?.trim() || null,
    })
  }

  /** Résilier arrête la facturation ; l'historique et les factures restent. */
  async terminate(contract: MooringContract): Promise<MooringContract> {
    contract.status = 'terminated'
    contract.nextInvoiceOn = null
    await contract.save()
    return contract
  }

  async delete(contract: MooringContract): Promise<void> {
    if (contract.lastInvoiceId !== null) throw new MooringContractLockedError()
    await contract.delete()
  }

  async listForPort(port: Port, today: string): Promise<MooringContractRow[]> {
    const contracts = await MooringContract.query()
      .where('portId', port.id)
      .where('organizationId', port.organizationId)
      .preload('spot', (q) => q.select('id', 'name'))
      .preload('client', (q) => q.select('id', 'firstName', 'lastName'))
      .preload('boat', (q) => q.select('id', 'name'))
      .orderByRaw("case when status = 'active' then 0 else 1 end")
      .orderBy('startsOn', 'desc')
      .limit(200)

    return contracts.map((contract) => {
      const endsOn = contract.endsOn?.toISODate() ?? null
      return {
        id: contract.id,
        spotId: contract.spotId,
        spotName: contract.spot?.name ?? '',
        clientId: contract.clientId,
        clientName: contract.client?.fullName ?? null,
        boatId: contract.boatId,
        boatName: contract.boat?.name ?? null,
        startsOn: contract.startsOn.toISODate()!,
        endsOn,
        periodicity: contract.periodicity,
        amount: contract.amount,
        nextInvoiceOn: contract.nextInvoiceOn?.toISODate() ?? null,
        status: contract.status,
        lastInvoiceId: contract.lastInvoiceId,
        renewalDue: contract.status === 'active' && contractRenewalDue(endsOn, today),
        notes: contract.notes,
      }
    })
  }

  /**
   * Émet les factures échues de tous les contrats actifs (job quotidien).
   * Une facture par période, en brouillon, rattrapage borné : un contrat
   * démarré il y a trois mois reçoit ses trois mensualités. Chaque période est
   * sa propre transaction, verrouillée — deux passages concurrents ne
   * facturent pas deux fois la même échéance. Renvoie le nombre de factures.
   */
  async invoiceDueContracts(today: string, i18n: I18n): Promise<number> {
    const due = await MooringContract.query()
      .where('status', 'active')
      .whereNotNull('nextInvoiceOn')
      .where('nextInvoiceOn', '<=', today)
      .select('id')

    let created = 0
    for (const { id } of due) {
      for (let i = 0; i < MOORING_MAX_CATCH_UP_PERIODS; i++) {
        try {
          const invoiced = await this.#invoiceNextPeriod(id, today, i18n)
          if (!invoiced) break
          created++
        } catch (error) {
          logger.error({ err: error, contractId: id }, 'mooring contract invoicing failed')
          break
        }
      }
    }
    return created
  }

  async #invoiceNextPeriod(contractId: number, today: string, i18n: I18n): Promise<boolean> {
    return await db.transaction(async (trx) => {
      const contract = await MooringContract.query({ client: trx })
        .where('id', contractId)
        .forUpdate()
        .preload('spot', (q) => q.select('id', 'name'))
        .firstOrFail()

      const periodStart = contract.nextInvoiceOn?.toISODate() ?? null
      if (contract.status !== 'active' || periodStart === null || periodStart > today) return false

      const startsOn = contract.startsOn.toISODate()!
      const endsOn = contract.endsOn?.toISODate() ?? null
      // Rang de l'échéance depuis l'ancrage : on recalcule depuis le début du
      // contrat pour ne pas dériver d'un mois court au suivant.
      let rank = 0
      while (addPeriods(startsOn, contract.periodicity, rank) < periodStart) rank++
      const nextStart = addPeriods(startsOn, contract.periodicity, rank + 1)
      // `endsOn` est inclus : la dernière période s'arrête sur lui (facturée
      // en entier — pas de prorata, l'exploitant ajuste le brouillon s'il le veut).
      const periodEnd = endsOn !== null && endsOn < nextStart ? endsOn : previousDay(nextStart)

      const org = await Organization.findOrFail(contract.organizationId, { client: trx })
      const invoice = await this.invoiceService.create(
        org,
        {
          kind: 'invoice',
          clientId: contract.clientId,
          status: 'draft',
          issuedAt: DateTime.fromISO(periodStart),
          dueAt: DateTime.fromISO(periodStart).plus({ days: MOORING_INVOICE_DUE_DAYS }),
          taxRate: MARINA_DEFAULT_TAX_RATE,
          lines: [
            {
              label: i18n.t('ports.invoice.contractLine', {
                spot: contract.spot.name,
                from: formatDate(periodStart, i18n.locale),
                to: formatDate(periodEnd, i18n.locale),
              }),
              quantity: 1,
              unitPrice: contract.amount,
            },
          ],
        },
        null,
        trx
      )

      contract.useTransaction(trx)
      contract.lastInvoiceId = invoice.id
      contract.nextInvoiceOn =
        endsOn !== null && nextStart > endsOn ? null : DateTime.fromISO(nextStart)
      await contract.save()
      return true
    })
  }
}
