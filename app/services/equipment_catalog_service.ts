import EquipmentBrand from '#models/equipment_brand'
import EquipmentModel from '#models/equipment_model'
import { normalizeCatalogText } from '#shared/helpers/boat_catalog'
import { catalogTokenNgrams } from '#shared/helpers/engine_catalog'
import { escapeLike } from '#shared/helpers/query'
import type {
  EquipmentBrandOption,
  EquipmentModelOption,
  ListEquipmentBrandsOptions,
  ListEquipmentModelsOptions,
} from '#shared/types/equipment_catalog'
import { inject } from '@adonisjs/core'

const DEFAULT_BRAND_LIMIT = 300
const DEFAULT_MODEL_LIMIT = 500

/**
 * Catalogue de marques et modèles d'équipements génériques (#577), décalque de
 * `EngineCatalogService` (#573).
 *
 * La catégorie **priorise** les marques, elle ne les filtre jamais : une marque
 * absente de la catégorie de l'équipement saisi doit rester proposée, et une
 * saisie hors catalogue reste acceptée telle quelle par le formulaire.
 */
@inject()
export default class EquipmentCatalogService {
  /**
   * Marques du catalogue, celles de `category` d'abord puis l'ordre
   * alphabétique. `q` restreint sur le nom ou le slug.
   */
  async listBrands(options: ListEquipmentBrandsOptions = {}): Promise<EquipmentBrandOption[]> {
    const query = EquipmentBrand.query()
      .select(['id', 'slug', 'name', 'country', 'categories', 'aliases'])
      .where('isActive', true)
      .orderBy('name', 'asc')
      .limit(options.limit ?? DEFAULT_BRAND_LIMIT)

    if (options.q) {
      const needle = `%${escapeLike(options.q)}%`
      query.where((sub) => {
        sub.whereILike('name', needle).orWhereILike('slug', needle)
      })
    }

    const brands = await query
    const rows = brands.map((brand) => this.toBrandOption(brand))

    if (!options.category) return rows

    const category = options.category
    // Tri applicatif plutôt qu'un `ORDER BY` sur le jsonb : le corpus tient en
    // une centaine de lignes et la requête reste lisible.
    return rows.sort((a, b) => {
      const aInCategory = a.categories.includes(category) ? 0 : 1
      const bInCategory = b.categories.includes(category) ? 0 : 1
      if (aInCategory !== bInCategory) return aInCategory - bInCategory
      return a.name.localeCompare(b.name)
    })
  }

  /** Modèles d'une marque, ordre alphabétique. */
  async listModels(options: ListEquipmentModelsOptions): Promise<EquipmentModelOption[]> {
    const query = EquipmentModel.query()
      .select([
        'id',
        'slug',
        'name',
        'category',
        'productionStartYear',
        'productionEndYear',
        'equipmentBrandId',
      ])
      .where('equipmentBrandId', options.brandId)
      .orderBy('name', 'asc')
      .limit(options.limit ?? DEFAULT_MODEL_LIMIT)

    if (options.q) {
      const needle = `%${escapeLike(options.q)}%`
      query.whereILike('name', needle)
    }

    const models = await query
    return models.map((model) => ({
      id: model.id,
      slug: model.slug,
      name: model.name,
      category: model.category,
      productionStartYear: model.productionStartYear,
      productionEndYear: model.productionEndYear,
    }))
  }

  /**
   * Bloc de props du formulaire d'équipement : les marques, les modèles de la
   * marque courante, et l'identifiant de cette marque.
   *
   * `rawBrandId` vient du rechargement partiel
   * `router.reload({ only: ['equipmentCatalogModels'], data: { equipmentBrandId } })`.
   * À l'édition il est absent au premier rendu : on rapproche alors la marque
   * déjà saisie sur l'équipement, pour que la liste des modèles soit utile dès
   * l'ouverture du formulaire, sans aller-retour supplémentaire.
   */
  async formProps(rawBrandId: unknown, freeTextBrand?: string | null) {
    const brands = await this.listBrands()

    const requestedId = Number(rawBrandId)
    if (Number.isInteger(requestedId) && requestedId > 0) {
      return {
        equipmentBrands: brands,
        equipmentCatalogBrandId: requestedId,
        equipmentCatalogModels: await this.listModels({ brandId: requestedId }),
      }
    }

    const brand = await this.resolveBrand(freeTextBrand)
    if (!brand) {
      return { equipmentBrands: brands, equipmentCatalogBrandId: null, equipmentCatalogModels: [] }
    }

    return {
      equipmentBrands: brands,
      equipmentCatalogBrandId: brand.id,
      equipmentCatalogModels: await this.listModels({ brandId: brand.id }),
    }
  }

  /**
   * Rapproche une saisie libre (`Garmin`, `VHF ICOM`, `waeco`,
   * `Raymarine Axiom 9`) d'une marque du catalogue via son slug, son nom puis
   * ses alias. Renvoie `null` quand elle n'en fait pas partie — la valeur reste
   * alors stockée telle quelle, c'est l'invariant de l'épic.
   */
  async resolveBrand(freeText: string | null | undefined): Promise<EquipmentBrand | null> {
    if (!freeText) return null
    const needle = normalizeCatalogText(freeText)
    if (!needle) return null

    const brands = await EquipmentBrand.query().select([
      'id',
      'slug',
      'name',
      'country',
      'categories',
      'aliases',
    ])

    // Première passe : égalité stricte, comme `EngineCatalogService`. Elle
    // seule sait rattacher un alias qui n'est pas un mot de la saisie
    // (`waeco` → Dometic).
    const byKey = new Map<string, EquipmentBrand>()
    for (const brand of brands) {
      for (const candidate of [brand.slug, brand.name, ...(brand.aliases ?? [])]) {
        const key = normalizeCatalogText(candidate)
        // Première marque déclarée gagne : un alias ambigu ne doit pas dépendre
        // de l'ordre d'insertion en base.
        if (key && !byKey.has(key)) byKey.set(key, brand)
      }
    }

    const exact = byKey.get(needle)
    if (exact) return exact

    // Seconde passe : la marque noyée dans une saisie plus large. Les n-grammes
    // sont ordonnés du plus long au plus court, donc `Indel Webasto` tombe sur
    // Indel Webasto et non sur Webasto.
    for (const ngram of catalogTokenNgrams(freeText)) {
      const match = byKey.get(ngram)
      if (match) return match
    }

    return null
  }

  private toBrandOption(brand: EquipmentBrand): EquipmentBrandOption {
    return {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      country: brand.country,
      categories: brand.categories ?? [],
      aliases: brand.aliases ?? [],
    }
  }
}
