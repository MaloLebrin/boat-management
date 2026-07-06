import { ClientNotFoundError } from '#exceptions/client_errors'
import Client from '#models/client'
import { toClientRow } from '#transformers/client_transformer'
import type Organization from '#models/organization'
import type {
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

export { ClientNotFoundError }

const VALID_STATUSES: ClientStatus[] = ['active', 'inactive', 'blacklisted']
const VALID_SORT_FIELDS: ClientSortField[] = ['lastName', 'createdAt', 'status']
const VALID_DIRECTIONS: ClientSortDirection[] = ['asc', 'desc']

function toTrimmedStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function toIntegerOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeStatus(value: unknown): ClientStatus | '' {
  if (typeof value === 'string' && VALID_STATUSES.includes(value as ClientStatus)) {
    return value as ClientStatus
  }
  return ''
}

function normalizeSort(value: unknown): ClientSortField {
  if (typeof value === 'string' && VALID_SORT_FIELDS.includes(value as ClientSortField)) {
    return value as ClientSortField
  }
  return 'lastName'
}

function normalizeDirection(value: unknown): ClientSortDirection {
  if (typeof value === 'string' && VALID_DIRECTIONS.includes(value as ClientSortDirection)) {
    return value as ClientSortDirection
  }
  return 'asc'
}

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

export default class ClientService {
  normalizeFilters(qs: Record<string, unknown>): ClientListFilters {
    const q = toTrimmedStringOrUndefined(qs.q) ?? ''
    const status = normalizeStatus(qs.status)
    const sort = normalizeSort(qs.sort)
    const direction = normalizeDirection(qs.direction)
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
      const needle = `%${filters.q}%`
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
    })
  }

  async update(client: Client, payload: UpdateClientPayload): Promise<Client> {
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
    await client.save()
    return client
  }

  async delete(client: Client): Promise<void> {
    await client.delete()
  }

  #toRow(client: Client): ClientRow {
    return toClientRow(client)
  }
}
