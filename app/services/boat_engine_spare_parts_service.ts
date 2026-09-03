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
import EngineCatalogService from '#services/engine_catalog_service'
import EnginePartReferenceService from '#services/engine_part_reference_service'
import {
  ALL_SPARE_PART_KEYS,
  SPARE_PART_CATALOG_INDEX,
} from '#shared/constants/spare_parts/spare_parts_content'
import { isSparePartsEligibleEngine } from '#shared/helpers/spare_parts'
import type {
  RepairCartItemRow,
  SparePartReferenceRow,
  SparePartsEngineProps,
  SparePartsEngineRow,
} from '#shared/types/spare_parts'
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
  constructor(
    private engineCatalogService: EngineCatalogService,
    private partReferenceService: EnginePartReferenceService
  ) {}

  /**
   * Moteurs de l'organisation du user éligibles à l'identification de pièces,
   * avec la taille du panier de réparation.
   *
   * L'éligibilité vient de la **famille de motorisation** depuis #574 : un
   * in-bord diesel a désormais sa nomenclature, là où #517 ne servait que les
   * hors-bord.
   */
  async listEligibleEnginesForUser(user: User): Promise<SparePartsEngineRow[]> {
    if (user.organizationId === null) return []

    const boats = await Boat.query()
      .where('organizationId', user.organizationId)
      .select(['id', 'name'])
      .preload('engines', (query) =>
        query.select([
          'id',
          'boatId',
          'brand',
          'model',
          'serialNumber',
          'kind',
          'fuel',
          'strokeType',
          'family',
          'status',
        ])
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

  /**
   * Projection du moteur vers les écrans « pièces détachées », avec sa marque
   * **rapprochée du catalogue côté serveur** (#573).
   *
   * `EngineCatalogService.resolveBrand()` interroge la base : les composants
   * pièces détachées ne peuvent pas l'appeler eux-mêmes, ils reçoivent donc le
   * slug résolu et le traduisent en marque du corpus #517 avec le helper pur
   * `sparePartsBrandFromCatalogSlug()`. `catalogBrandSlug` vaut `null` pour une
   * saisie hors catalogue, cas que les écrans savent déjà traiter.
   *
   * Extraite du contrôleur (#634) : la page d'identification, la page
   * d'ensemble et le chat IA servent exactement la même forme.
   */
  async getEngineProps(engine: BoatEngine): Promise<SparePartsEngineProps> {
    const catalogBrand = await this.engineCatalogService.resolveBrand(engine.brand)
    const catalogModel = await this.engineCatalogService.resolveModelForEngine(engine)

    // Un code plaque partagé par plusieurs modèles est exactement le cas que la
    // mise en garde « le numéro de série départage les variantes » vise (#575) :
    // l'écran le dit alors explicitement, au lieu de s'en tenir au général.
    const modelCode = catalogModel?.modelCode ?? engine.model
    const modelCodeMatches = await this.engineCatalogService.countModelsForModelCode(modelCode)

    return {
      id: engine.id,
      brand: engine.brand,
      model: engine.model,
      catalogBrandSlug: catalogBrand?.slug ?? null,
      // Motif de décodage des références de la marque (#575), `null` quand elle
      // n'en déclare pas : la carte « décoder une référence » ne s'affiche
      // alors pas du tout, comme pour toute marque non-Yamaha avant #575.
      referencePattern: catalogBrand?.referencePattern ?? null,
      modelCodeMatches,
      serialNumber: engine.serialNumber,
      kind: engine.kind,
      // Famille de motorisation (#574) : c'est elle qui décide des ensembles
      // affichés, les écrans la reçoivent telle quelle.
      family: engine.family,
      status: engine.status,
    }
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

    // Référence pré-remplie quand le couple (modèle, pièce) en a une (#575).
    // Elle reste modifiable : la colonne est la même que celle que l'utilisateur
    // saisissait à la main depuis #517, et le panneau du panier l'édite comme
    // avant. Aucune référence connue → `null`, écran strictement inchangé.
    const known = await this.referenceFor(engine, partKey)

    await BoatEngineRepairCartItem.create({
      boatEngineId: engine.id,
      partKey,
      quantity: 1,
      reference: known?.reference ?? null,
    })
  }

  /**
   * Références constructeur connues pour le moteur, indexées par clé de pièce.
   *
   * Le modèle du catalogue est celui **rattaché** au moteur, ou celui que la
   * saisie libre permet de rapprocher — un moteur hors catalogue rend une carte
   * vide, et les écrans retombent sur les liens revendeurs.
   */
  async getPartReferences(engine: BoatEngine): Promise<SparePartReferenceRow[]> {
    const model = await this.engineCatalogService.resolveModelForEngine(engine)
    const references = await this.partReferenceService.forEngineModel(model?.id ?? null)
    return [...references.values()]
  }

  private async referenceFor(
    engine: BoatEngine,
    partKey: string
  ): Promise<SparePartReferenceRow | null> {
    const model = await this.engineCatalogService.resolveModelForEngine(engine)
    return this.partReferenceService.forEngineModelPart(model?.id ?? null, partKey)
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

    // Le modèle est résolu une fois pour tout l'export : un panier de vingt
    // lignes ne doit pas déclencher vingt rapprochements de catalogue.
    const model = await this.engineCatalogService.resolveModelForEngine(engine)
    const references = await this.partReferenceService.forEngineModel(model?.id ?? null)

    const header = [
      translate('parts.cart.export.headers.assembly'),
      translate('parts.cart.export.headers.part'),
      translate('parts.cart.export.headers.catalogName'),
      translate('parts.cart.export.headers.reference'),
      // Une référence ne voyage jamais sans sa source, export compris (#575).
      translate('parts.cart.export.headers.referenceSource'),
      translate('parts.cart.export.headers.quantity'),
    ]

    const rows = items.map((item) => {
      const entry = SPARE_PART_CATALOG_INDEX.get(item.partKey)
      const known = references.get(item.partKey)
      // La source du catalogue ne vaut que pour **cette** référence : dès que
      // l'utilisateur en saisit une autre, c'est sa saisie qui est la source.
      const source =
        item.reference === null
          ? ''
          : known && known.reference === item.reference
            ? known.sourceLabel
            : translate('parts.cart.export.manualSource')

      return [
        entry?.assemblyLabelKey
          ? translate(entry.assemblyLabelKey)
          : translate('parts.unreferenced.title'),
        entry ? translate(entry.labelKey) : item.partKey,
        entry?.catalogName ?? '',
        item.reference ?? '',
        source,
        String(item.quantity),
      ]
    })

    const escapeCell = (cell: string) => `"${cell.replaceAll('"', '""')}"`
    return [header, ...rows].map((row) => row.map(escapeCell).join(';')).join('\r\n')
  }
}
