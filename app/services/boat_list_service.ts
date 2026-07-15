import Boat from '#models/boat'
import BoatMaintenanceBadgeService from '#services/boat_maintenance_badge_service'
import {
  clampInt,
  escapeLike,
  normalizeEnum,
  toBooleanFlag,
  toIntegerOrUndefined,
  toTrimmedStringOrUndefined,
} from '#shared/helpers/query'
import type {
  BoatListDirection,
  BoatListItem,
  BoatListQuery,
  BoatListSort,
  BoatSerializedRow,
} from '#shared/types/boat'
import type User from '#models/user'
import { inject } from '@adonisjs/core'

export type { BoatListDirection, BoatListItem, BoatListQuery, BoatListSort }

const VALID_SORTS: BoatListSort[] = ['name', 'recent']
const VALID_DIRECTIONS: BoatListDirection[] = ['asc', 'desc']

@inject()
export default class BoatListService {
  constructor(private badgeService: BoatMaintenanceBadgeService) {}

  normalizeQuery(raw: Record<string, unknown>): Required<BoatListQuery> {
    const q = toTrimmedStringOrUndefined(raw.q) ?? ''
    const type = toTrimmedStringOrUndefined(raw.type) ?? ''
    const propulsionType = toTrimmedStringOrUndefined(raw.propulsionType) ?? ''

    const hasEngine = toBooleanFlag(raw.hasEngine)
    const hasSails = toBooleanFlag(raw.hasSails)
    const hasRig = toBooleanFlag(raw.hasRig)

    const sort = normalizeEnum(raw.sort, VALID_SORTS, 'recent' as const)
    const direction = normalizeEnum(
      raw.direction,
      VALID_DIRECTIONS,
      sort === 'name' ? 'asc' : 'desc'
    )

    const page = clampInt(toIntegerOrUndefined(raw.page) ?? 1, 1, 10_000)
    const perPage = clampInt(toIntegerOrUndefined(raw.perPage) ?? 20, 5, 100)

    return { q, type, propulsionType, hasEngine, hasSails, hasRig, sort, direction, page, perPage }
  }

  async listNamesForOrg(user: User): Promise<{ id: number; name: string }[]> {
    if (user.organizationId === null) return []
    const boats = await Boat.query()
      .where('organizationId', user.organizationId)
      .select(['id', 'name'])
      .orderBy('name', 'asc')
    return boats.map((b) => ({ id: b.id, name: b.name }))
  }

  async listForUser(user: User, rawQuery: Record<string, unknown>) {
    if (user.organizationId === null) {
      return {
        boats: {
          data: [] as BoatListItem[],
          meta: { total: 0, perPage: 20, currentPage: 1, lastPage: 1 },
        },
        filters: this.normalizeQuery(rawQuery),
      }
    }

    const filters = this.normalizeQuery(rawQuery)

    const query = Boat.query()
      .where('organizationId', user.organizationId)
      .select(['id', 'name', 'registrationNumber', 'type', 'propulsionType', 'updatedAt'])

    if (filters.q) {
      const needle = `%${escapeLike(filters.q)}%`
      query.where((sub) => {
        sub.whereILike('name', needle).orWhereILike('registrationNumber', needle)
      })
    }

    if (filters.type) query.where('type', filters.type)
    if (filters.propulsionType) query.where('propulsionType', filters.propulsionType)

    // Filtres de présence d'équipement (cartes du tableau de bord) : on cible
    // les bateaux qui possèdent réellement l'équipement, pas un type de propulsion.
    if (filters.hasEngine) query.has('engines')
    if (filters.hasSails) query.has('sails')
    if (filters.hasRig) query.has('rig')

    if (filters.sort === 'name') {
      query.orderBy('name', filters.direction).orderBy('id', 'desc')
    } else {
      query.orderBy('updatedAt', filters.direction).orderBy('id', 'desc')
    }

    const paginator = await query.paginate(filters.page, filters.perPage)

    const serialized = paginator.serialize()
    const boatIds = ((serialized.data as BoatSerializedRow[]) ?? [])
      .map((b) => Number(b.id))
      .filter((id) => id > 0)

    const badges = await this.badgeService.getForBoatIds(user.organizationId, boatIds)
    return {
      boats: {
        data: ((serialized.data as BoatSerializedRow[]) ?? []).map((b) => ({
          id: b.id,
          name: b.name,
          registrationNumber: b.registrationNumber ?? null,
          type: b.type ?? null,
          propulsionType: b.propulsionType ?? null,
          updatedAt: b.updatedAt ?? null,
          maintenance: badges.get(Number(b.id)) ?? {
            urgentCount: 0,
            upcomingCount: 0,
            nextDueAt: null,
          },
        })) as BoatListItem[],
        meta: serialized.meta,
      },
      filters,
    }
  }
}
