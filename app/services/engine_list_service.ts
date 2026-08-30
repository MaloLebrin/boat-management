import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import { toEngineListItem } from '#transformers/engine_list_transformer'
import {
  clampInt,
  escapeLike,
  normalizeEnum,
  toIntegerOrUndefined,
  toTrimmedStringOrUndefined,
} from '#shared/helpers/query'
import {
  ENGINE_LIST_DIRECTIONS,
  ENGINE_LIST_SORTS,
  type EngineListBoatOption,
  type EngineListFilters,
  type EngineListResult,
  type EngineListSummary,
  type EngineSerializedRow,
} from '#shared/types/engine'
import { ENGINE_FAMILIES } from '#shared/types/engine_catalog'
import { equipmentStatuses } from '#validators/boat_equipment'
import { engineKinds } from '#validators/boat'
import type User from '#models/user'

const EMPTY_SUMMARY: EngineListSummary = {
  total: 0,
  operational: 0,
  inMaintenance: 0,
  outOfService: 0,
}

/**
 * Inventaire moteur transverse (#598).
 *
 * `boat_engines` ne porte pas d'`organizationId` : le scoping multi-tenant passe
 * par `boat_id → boats.organization_id`. Plutôt qu'une jointure — qui rendrait
 * `id`, `name` et `updated_at` ambigus dans le `select` d'un
 * `ModelQueryBuilder` —, le service charge d'abord le référentiel des bateaux
 * de l'organisation (déjà nécessaire pour le filtre « bateau ») et borne la
 * requête moteur avec `whereIn('boatId', …)`. Le nom du bateau est ensuite
 * rapproché en mémoire, sans `preload` par ligne paginée.
 */
export default class EngineListService {
  normalizeQuery(raw: Record<string, unknown>): EngineListFilters {
    const q = toTrimmedStringOrUndefined(raw.q) ?? ''

    // Vocabulaires fermés : une valeur inconnue est ignorée plutôt que
    // transmise telle quelle à la requête (#571).
    const kind = normalizeEnum(raw.kind, engineKinds, '')
    const status = normalizeEnum(raw.status, equipmentStatuses, '')
    const family = normalizeEnum(raw.family, ENGINE_FAMILIES, '')

    // `0` = tous les bateaux ; la valeur est de toute façon revalidée contre
    // les bateaux de l'organisation avant d'atteindre la requête.
    const boatId = Math.max(0, toIntegerOrUndefined(raw.boatId) ?? 0)

    const sort = normalizeEnum(raw.sort, ENGINE_LIST_SORTS, 'recent' as const)
    const direction = normalizeEnum(
      raw.direction,
      ENGINE_LIST_DIRECTIONS,
      sort === 'brand' ? 'asc' : 'desc'
    )

    const page = clampInt(toIntegerOrUndefined(raw.page) ?? 1, 1, 10_000)
    const perPage = clampInt(toIntegerOrUndefined(raw.perPage) ?? 20, 5, 100)

    return { q, boatId, kind, status, family, sort, direction, page, perPage }
  }

  /** Bateaux de l'organisation, triés par nom — options du filtre « bateau ». */
  private async boatOptionsForUser(user: User): Promise<EngineListBoatOption[]> {
    if (user.organizationId === null) return []
    const boats = await Boat.query()
      .where('organizationId', user.organizationId)
      .select(['id', 'name'])
      .orderBy('name', 'asc')
    return boats.map((boat) => ({ id: boat.id, name: boat.name }))
  }

  async listForUser(user: User, rawQuery: Record<string, unknown>): Promise<EngineListResult> {
    const filters = this.normalizeQuery(rawQuery)
    const boatOptions = await this.boatOptionsForUser(user)

    const emptyResult: EngineListResult = {
      engines: {
        data: [],
        meta: { total: 0, perPage: filters.perPage, currentPage: 1, lastPage: 1 },
      },
      filters,
      boatOptions,
      summary: EMPTY_SUMMARY,
    }

    if (boatOptions.length === 0) return emptyResult

    const boatNames = new Map(boatOptions.map((boat) => [boat.id, boat.name]))

    // Un `boatId` qui n'appartient pas à l'organisation ne doit pas restreindre
    // silencieusement à « rien » : il est traité comme absent, et le filtre
    // renvoyé au front est corrigé pour que le select ne reste pas sur une
    // valeur fantôme.
    const scopedBoatIds = boatNames.has(filters.boatId)
      ? [filters.boatId]
      : boatOptions.map((b) => b.id)
    if (!boatNames.has(filters.boatId)) filters.boatId = 0

    const query = BoatEngine.query()
      .whereIn('boatId', scopedBoatIds)
      .select([
        'id',
        'boatId',
        'brand',
        'model',
        'serialNumber',
        'kind',
        'fuel',
        'family',
        'status',
        'powerHp',
        'hours',
        'updatedAt',
      ])

    if (filters.q) {
      const needle = `%${escapeLike(filters.q)}%`
      // Le nom du bateau fait partie de la recherche : il est rapproché sur le
      // référentiel déjà chargé, la requête ne portant que sur `boat_engines`.
      const matchingBoatIds = boatOptions
        .filter((boat) => boat.name.toLowerCase().includes(filters.q.toLowerCase()))
        .map((boat) => boat.id)
        .filter((id) => scopedBoatIds.includes(id))

      query.where((sub) => {
        sub
          .whereILike('brand', needle)
          .orWhereILike('model', needle)
          .orWhereILike('serialNumber', needle)
        if (matchingBoatIds.length > 0) sub.orWhereIn('boatId', matchingBoatIds)
      })
    }

    if (filters.kind) query.where('kind', filters.kind)
    if (filters.status) query.where('status', filters.status)
    if (filters.family) query.where('family', filters.family)

    if (filters.sort === 'brand') {
      query.orderBy('brand', filters.direction).orderBy('model', filters.direction)
    } else if (filters.sort === 'hours') {
      query.orderBy('hours', filters.direction)
    } else {
      query.orderBy('updatedAt', filters.direction)
    }
    // Départage stable : deux moteurs jumeaux partagent marque, modèle et
    // souvent le même `updatedAt` — sans quoi la pagination peut répéter ou
    // sauter une ligne d'une page à l'autre.
    query.orderBy('id', 'desc')

    const paginator = await query.paginate(filters.page, filters.perPage)
    const serialized = paginator.serialize()

    const data = ((serialized.data as EngineSerializedRow[]) ?? []).map((row) =>
      toEngineListItem(row, boatNames.get(Number(row.boatId)) ?? '')
    )

    return {
      engines: { data, meta: serialized.meta },
      filters,
      boatOptions,
      summary: await this.summaryForBoats(scopedBoatIds),
    }
  }

  /**
   * Compteurs par statut sur l'ensemble des moteurs du périmètre — indépendants
   * de la recherche et de la page en cours, pour rester un indicateur de flotte.
   */
  private async summaryForBoats(boatIds: number[]): Promise<EngineListSummary> {
    const rows = await BoatEngine.query()
      .whereIn('boatId', boatIds)
      .select('status')
      .count('* as total')
      .groupBy('status')

    const counts = new Map<string, number>()
    for (const row of rows) {
      counts.set(row.status, Number(row.$extras.total ?? 0))
    }

    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0)
    return {
      total,
      operational: counts.get('operational') ?? 0,
      inMaintenance: counts.get('in_maintenance') ?? 0,
      outOfService: (counts.get('out_of_service') ?? 0) + (counts.get('retired') ?? 0),
    }
  }
}
