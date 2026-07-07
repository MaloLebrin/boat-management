import { ClientAlreadyAnonymizedError, ClientNotFoundError } from '#exceptions/client_errors'
import Client from '#models/client'
import BoatReservation from '#models/boat_reservation'
import { toClientRow } from '#transformers/client_transformer'
import MediaService from '#services/media_service'
import { CloudinaryFolders } from '#services/cloudinary_service'
import {
  clampInt,
  escapeLike,
  normalizeEnum,
  toIntegerOrUndefined,
  toTrimmedStringOrUndefined,
} from '#shared/helpers/query'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type Organization from '#models/organization'
import type {
  ClientDataExport,
  ClientListFilters,
  ClientRow,
  ClientOption,
  ClientsPaginated,
  ClientStatus,
  ClientSortField,
  ClientSortDirection,
  CreateClientPayload,
  UpdateClientPayload,
} from '#shared/types/client'

export { ClientNotFoundError, ClientAlreadyAnonymizedError }

const VALID_STATUSES: ClientStatus[] = ['active', 'inactive', 'blacklisted']
const VALID_SORT_FIELDS: ClientSortField[] = ['lastName', 'createdAt', 'status']
const VALID_DIRECTIONS: ClientSortDirection[] = ['asc', 'desc']

function mapSortColumn(sort: ClientSortField): string {
  switch (sort) {
    case 'lastName':
      return 'last_name'
    case 'createdAt':
      return 'created_at'
    case 'status':
      return 'status'
  }
}

@inject()
export default class ClientService {
  constructor(private mediaService: MediaService) {}

  normalizeFilters(qs: Record<string, unknown>): ClientListFilters {
    const q = toTrimmedStringOrUndefined(qs.q) ?? ''
    const status = normalizeEnum(qs.status, VALID_STATUSES, '' as const)
    const sort = normalizeEnum(qs.sort, VALID_SORT_FIELDS, 'lastName' as const)
    const direction = normalizeEnum(qs.direction, VALID_DIRECTIONS, 'asc' as const)
    const page = clampInt(toIntegerOrUndefined(qs.page) ?? 1, 1, 10_000)
    const perPage = clampInt(toIntegerOrUndefined(qs.perPage) ?? 20, 1, 100)

    return { q, status, sort, direction, page, perPage }
  }

  async search(org: Organization, filters: ClientListFilters): Promise<ClientsPaginated> {
    const query = Client.query()
      .where('organizationId', org.id)
      .select([
        'id',
        'organization_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'address',
        'navigation_permit_number',
        'navigation_permit_type',
        'status',
        'notes',
        'gdpr_consent_at',
        'created_at',
        'updated_at',
      ])

    if (filters.q) {
      const needle = `%${escapeLike(filters.q)}%`
      query.where((sub) => {
        sub
          .whereILike('first_name', needle)
          .orWhereILike('last_name', needle)
          .orWhereILike('email', needle)
      })
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    query.orderBy(mapSortColumn(filters.sort), filters.direction).orderBy('id', 'desc')

    const paginator = await query.paginate(filters.page, filters.perPage)

    return {
      data: paginator.all().map((client) => this.#toRow(client)),
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        lastPage: paginator.lastPage,
      },
    }
  }

  async getForOrganizationOrFail(org: Organization, id: number): Promise<Client> {
    const client = await Client.query().where('id', id).where('organizationId', org.id).first()

    if (!client) throw new ClientNotFoundError()
    return client
  }

  /**
   * Lightweight client options for a selector (id + full name + status), sorted
   * by name. Used by the reservation form (#275).
   */
  async listOptions(organizationId: number): Promise<ClientOption[]> {
    const clients = await Client.query()
      .where('organizationId', organizationId)
      .orderBy('last_name', 'asc')
      .orderBy('first_name', 'asc')
      .select('id', 'first_name', 'last_name', 'status')

    return clients.map((c) => ({ id: c.id, fullName: c.fullName, status: c.status }))
  }

  async create(org: Organization, payload: CreateClientPayload): Promise<Client> {
    return await Client.create({
      organizationId: org.id,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      address: payload.address?.trim() || null,
      navigationPermitNumber: payload.navigationPermitNumber?.trim() || null,
      navigationPermitType: payload.navigationPermitType ?? null,
      status: payload.status ?? 'active',
      notes: payload.notes?.trim() || null,
      gdprConsentAt: payload.gdprConsent ? DateTime.now() : null,
    })
  }

  async update(client: Client, payload: UpdateClientPayload): Promise<Client> {
    // An anonymized client is frozen: its PII was intentionally destroyed and
    // must not be re-populated (#276).
    if (client.anonymizedAt !== null) {
      throw new ClientAlreadyAnonymizedError()
    }

    // Preserve-if-absent: only fields present in the payload are written, so a
    // partial update never wipes a value the caller didn't touch (an explicit
    // null clears it). Consistent with the navigation-log fix (#180).
    client.firstName = payload.firstName.trim()
    client.lastName = payload.lastName.trim()
    if (payload.email !== undefined) client.email = payload.email?.trim() || null
    if (payload.phone !== undefined) client.phone = payload.phone?.trim() || null
    if (payload.address !== undefined) client.address = payload.address?.trim() || null
    if (payload.navigationPermitNumber !== undefined) {
      client.navigationPermitNumber = payload.navigationPermitNumber?.trim() || null
    }
    if (payload.navigationPermitType !== undefined) {
      client.navigationPermitType = payload.navigationPermitType ?? null
    }
    if (payload.status !== undefined) client.status = payload.status
    if (payload.notes !== undefined) client.notes = payload.notes?.trim() || null
    // GDPR consent: stamp once (keep the original date if already given), clear on false.
    if (payload.gdprConsent !== undefined) {
      if (payload.gdprConsent) {
        client.gdprConsentAt = client.gdprConsentAt ?? DateTime.now()
      } else {
        client.gdprConsentAt = null
      }
    }
    await client.save()
    return client
  }

  async delete(org: Organization, client: Client): Promise<void> {
    // Cleanup attached documents (Cloudinary + storage quota) before deleting the row.
    await this.mediaService.deleteAllForEntity(
      'client',
      client.id,
      CloudinaryFolders.clientDocuments(org.slug, client.id),
      org
    )
    await client.delete()
  }

  /**
   * GDPR right-to-erasure (#276). Neutralizes the client's PII, deletes its
   * documents, and anonymizes the denormalized snapshots on past reservations
   * while keeping referential integrity (`client_id` is preserved). Idempotent:
   * a no-op once the client is already anonymized.
   */
  async anonymize(org: Organization, client: Client): Promise<Client> {
    if (client.anonymizedAt !== null) return client

    // External cleanup first (Cloudinary + storage quota).
    await this.mediaService.deleteAllForEntity(
      'client',
      client.id,
      CloudinaryFolders.clientDocuments(org.slug, client.id),
      org
    )

    await db.transaction(async (trx) => {
      client.useTransaction(trx)
      client.firstName = 'Client'
      client.lastName = 'anonymisé'
      client.email = null
      client.phone = null
      client.address = null
      client.navigationPermitNumber = null
      client.navigationPermitType = null
      client.notes = null
      client.gdprConsentAt = null
      client.anonymizedAt = DateTime.now()
      await client.save()

      // Anonymize the denormalized text snapshot on linked reservations; keep
      // the FK so history remains attributable to a (now anonymized) record.
      await BoatReservation.query({ client: trx })
        .where('organizationId', org.id)
        .where('clientId', client.id)
        .update({ clientName: 'Client anonymisé', clientEmail: null, clientPhone: null })
    })

    return client
  }

  /**
   * GDPR data-portability export (#276): the client, its reservation history
   * and its documents metadata as a plain serializable object.
   */
  async exportData(org: Organization, client: Client): Promise<ClientDataExport> {
    const reservations = await BoatReservation.query()
      .where('organizationId', org.id)
      .where('clientId', client.id)
      .preload('boat', (q) => q.select(['id', 'name']))
      .orderBy('starts_at', 'desc')

    const documents = await this.mediaService.listForEntity('client', client.id)

    return {
      client: toClientRow(client),
      reservations: reservations.map((r) => ({
        id: r.id,
        boatName: r.boat?.name ?? '',
        startsAt: r.startsAt?.toISO() ?? null,
        endsAt: r.endsAt?.toISO() ?? null,
        status: r.status,
        totalPrice:
          r.totalPrice !== null && r.totalPrice !== undefined ? String(r.totalPrice) : null,
      })),
      documents: documents.map((m) => ({
        id: m.id,
        originalFilename: m.originalFilename,
        format: m.format,
        bytes: m.bytes,
        caption: m.caption,
      })),
      exportedAt: DateTime.now().toISO() ?? '',
    }
  }

  #toRow(client: Client): ClientRow {
    return toClientRow(client)
  }
}
