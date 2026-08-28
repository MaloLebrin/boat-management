import { BoatEquipmentNotFoundError } from '#exceptions/boat_errors'
import {
  EngineNotSparePartsEligibleError,
  RepairCartItemNotFoundError,
  SparePartNotFoundError,
} from '#exceptions/spare_parts_errors'
import Boat from '#models/boat'
import BoatEngine from '#models/boat_engine'
import BoatEngineRepairCartItem from '#models/boat_engine_repair_cart_item'
import type User from '#models/user'
import {
  ALL_SPARE_PART_KEYS,
  SPARE_PART_CATALOG_INDEX,
} from '#shared/constants/spare_parts/spare_parts_content'
import { isSparePartsEligibleEngine } from '#shared/helpers/spare_parts'
import type { RepairCartItemRow, SparePartsEngineRow } from '#shared/types/spare_parts'
import { toRepairCartItemRow, toSparePartsEngineRow } from '#transformers/spare_parts_transformer'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { inject } from '@adonisjs/core'

export {
  BoatEquipmentNotFoundError,
  EngineNotSparePartsEligibleError,
  RepairCartItemNotFoundError,
  SparePartNotFoundError,
}

const MAX_CART_QUANTITY = 99

@inject()
export default class BoatEngineSparePartsService {
  /**
   * Moteurs éligibles à l'identification de pièces (hors-bord) de
   * l'organisation du user, avec la taille du panier de réparation.
   */
  async listEligibleEnginesForUser(user: User): Promise<SparePartsEngineRow[]> {
    if (user.organizationId === null) return []

    const boats = await Boat.query()
      .where('organizationId', user.organizationId)
      .select(['id', 'name'])
      .preload('engines', (query) =>
        query.select(['id', 'boatId', 'brand', 'model', 'kind', 'status'])
      )

    const eligible = boats.flatMap((boat) =>
      boat.engines
        .filter((engine) => isSparePartsEligibleEngine(engine))
        .map((engine) => ({ boat, engine }))
    )
    if (eligible.length === 0) return []

    const items = await BoatEngineRepairCartItem.query()
      .whereIn(
        'boatEngineId',
        eligible.map(({ engine }) => engine.id)
      )
      .select(['boatEngineId'])

    const cartCounts = new Map<number, number>()
    for (const item of items) {
      cartCounts.set(item.boatEngineId, (cartCounts.get(item.boatEngineId) ?? 0) + 1)
    }

    return eligible.map(({ boat, engine }) =>
      toSparePartsEngineRow(engine, boat, cartCounts.get(engine.id) ?? 0)
    )
  }

  /** Charge un moteur éligible du bateau, en vérifiant le scoping org. */
  async getEligibleEngineOrFail(user: User, boat: Boat, engineId: number): Promise<BoatEngine> {
    assertBoatInUserOrg(user, boat)

    const engine = await BoatEngine.query().where('id', engineId).where('boatId', boat.id).first()
    if (!engine) throw new BoatEquipmentNotFoundError()
    if (!isSparePartsEligibleEngine(engine)) throw new EngineNotSparePartsEligibleError()

    return engine
  }

  /** Lignes du panier de réparation d'un moteur déjà chargé et scopé. */
  async getCartItems(engine: BoatEngine): Promise<RepairCartItemRow[]> {
    const items = await BoatEngineRepairCartItem.query()
      .where('boatEngineId', engine.id)
      .orderBy('createdAt', 'asc')
      .select(['id', 'boatEngineId', 'partKey', 'quantity', 'reference', 'createdAt'])

    return items.map((item) => toRepairCartItemRow(item))
  }

  /**
   * Ajoute une pièce du catalogue au panier. Une pièce déjà présente voit sa
   * quantité incrémentée : les pièces identifiées « s'accumulent ».
   */
  async addCartItem(user: User, boat: Boat, engineId: number, partKey: string): Promise<void> {
    const engine = await this.getEligibleEngineOrFail(user, boat, engineId)

    if (!ALL_SPARE_PART_KEYS.has(partKey)) throw new SparePartNotFoundError()

    const existing = await BoatEngineRepairCartItem.query()
      .where('boatEngineId', engine.id)
      .where('partKey', partKey)
      .first()

    if (existing) {
      existing.quantity = Math.min(existing.quantity + 1, MAX_CART_QUANTITY)
      await existing.save()
      return
    }

    await BoatEngineRepairCartItem.create({ boatEngineId: engine.id, partKey, quantity: 1 })
  }

  async updateCartItem(
    user: User,
    boat: Boat,
    engineId: number,
    itemId: number,
    payload: { quantity?: number; reference?: string | null }
  ): Promise<void> {
    const engine = await this.getEligibleEngineOrFail(user, boat, engineId)

    const item = await BoatEngineRepairCartItem.query()
      .where('id', itemId)
      .where('boatEngineId', engine.id)
      .first()
    if (!item) throw new RepairCartItemNotFoundError()

    if (payload.quantity !== undefined) item.quantity = payload.quantity
    if (payload.reference !== undefined) item.reference = payload.reference

    await item.save()
  }

  async removeCartItem(user: User, boat: Boat, engineId: number, itemId: number): Promise<void> {
    const engine = await this.getEligibleEngineOrFail(user, boat, engineId)

    const deleted = await BoatEngineRepairCartItem.query()
      .where('id', itemId)
      .where('boatEngineId', engine.id)
      .delete()
    if (Number(deleted) === 0) throw new RepairCartItemNotFoundError()
  }

  /**
   * Liste de réparation exportable en CSV (séparateur `;`, compatible tableurs
   * FR). Les libellés passent par `translate` (locale de la requête) ; les
   * intitulés catalogue EN sont littéraux.
   */
  async buildCartCsv(engine: BoatEngine, translate: (key: string) => string): Promise<string> {
    const items = await BoatEngineRepairCartItem.query()
      .where('boatEngineId', engine.id)
      .orderBy('createdAt', 'asc')
      .select(['id', 'boatEngineId', 'partKey', 'quantity', 'reference', 'createdAt'])

    const header = [
      translate('parts.cart.export.headers.assembly'),
      translate('parts.cart.export.headers.part'),
      translate('parts.cart.export.headers.catalogName'),
      translate('parts.cart.export.headers.reference'),
      translate('parts.cart.export.headers.quantity'),
    ]

    const rows = items.map((item) => {
      const entry = SPARE_PART_CATALOG_INDEX.get(item.partKey)
      return [
        entry?.assemblyLabelKey
          ? translate(entry.assemblyLabelKey)
          : translate('parts.unreferenced.title'),
        entry ? translate(entry.labelKey) : item.partKey,
        entry?.catalogName ?? '',
        item.reference ?? '',
        String(item.quantity),
      ]
    })

    const escapeCell = (cell: string) => `"${cell.replaceAll('"', '""')}"`
    return [header, ...rows].map((row) => row.map(escapeCell).join(';')).join('\r\n')
  }
}
