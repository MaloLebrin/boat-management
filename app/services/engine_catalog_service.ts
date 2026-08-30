import EngineBrand from '#models/engine_brand'
import EngineModel from '#models/engine_model'
import { normalizeCatalogText } from '#shared/helpers/boat_catalog'
import { catalogTokenNgrams } from '#shared/helpers/engine_catalog'
import { escapeLike } from '#shared/helpers/query'
import type {
  EngineBrandOption,
  EngineModelOption,
  ListEngineBrandsOptions,
  ListEngineModelsOptions,
} from '#shared/types/engine_catalog'
import { inject } from '@adonisjs/core'

const DEFAULT_BRAND_LIMIT = 300
const DEFAULT_MODEL_LIMIT = 500

/**
 * Catalogue de marques et modèles de motorisation (#573).
 *
 * La famille **priorise** les marques, elle ne les filtre jamais : un motoriste
 * absent de la famille du moteur saisi doit rester proposé, et une saisie hors
 * catalogue reste acceptée telle quelle par le formulaire.
 */
@inject()
export default class EngineCatalogService {
  /**
   * Marques du catalogue, celles de `family` d'abord puis l'ordre
   * alphabétique. `q` restreint sur le nom ou le slug.
   */
  async listBrands(options: ListEngineBrandsOptions = {}): Promise<EngineBrandOption[]> {
    const query = EngineBrand.query()
      .select(['id', 'slug', 'name', 'country', 'families', 'aliases'])
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

    if (!options.family) return rows

    const family = options.family
    // Tri applicatif plutôt qu'un `ORDER BY` sur le jsonb : le corpus tient en
    // quelques dizaines de lignes et la requête reste lisible.
    return rows.sort((a, b) => {
      const aInFamily = a.families.includes(family) ? 0 : 1
      const bInFamily = b.families.includes(family) ? 0 : 1
      if (aInFamily !== bInFamily) return aInFamily - bInFamily
      return a.name.localeCompare(b.name)
    })
  }

  /** Modèles d'une marque, ordre alphabétique. */
  async listModels(options: ListEngineModelsOptions): Promise<EngineModelOption[]> {
    const query = EngineModel.query()
      .select([
        'id',
        'slug',
        'name',
        'modelCode',
        'family',
        'powerHp',
        'strokeType',
        'fuel',
        'productionStartYear',
        'productionEndYear',
        'engineBrandId',
      ])
      .where('engineBrandId', options.brandId)
      .orderBy('name', 'asc')
      .limit(options.limit ?? DEFAULT_MODEL_LIMIT)

    if (options.q) {
      const needle = `%${escapeLike(options.q)}%`
      query.where((sub) => {
        sub.whereILike('name', needle).orWhereILike('modelCode', needle)
      })
    }

    const models = await query
    return models.map((model) => ({
      id: model.id,
      slug: model.slug,
      name: model.name,
      modelCode: model.modelCode,
      family: model.family,
      powerHp: model.powerHp,
      strokeType: model.strokeType,
      fuel: model.fuel,
      productionStartYear: model.productionStartYear,
      productionEndYear: model.productionEndYear,
    }))
  }

  /**
   * Bloc de props du formulaire moteur : les marques, les modèles de la marque
   * courante, et l'identifiant de cette marque.
   *
   * `rawBrandId` vient du rechargement partiel
   * `router.reload({ only: ['engineCatalogModels'], data: { engineBrandId } })`.
   * À l'édition il est absent au premier rendu : on rapproche alors la marque
   * déjà saisie sur le moteur, pour que la liste des modèles soit utile dès
   * l'ouverture du formulaire, sans aller-retour supplémentaire.
   */
  async formProps(rawBrandId: unknown, freeTextBrand?: string | null) {
    const brands = await this.listBrands()

    const requestedId = Number(rawBrandId)
    if (Number.isInteger(requestedId) && requestedId > 0) {
      return {
        engineBrands: brands,
        engineCatalogBrandId: requestedId,
        engineCatalogModels: await this.listModels({ brandId: requestedId }),
      }
    }

    const brand = await this.resolveBrand(freeTextBrand)
    if (!brand) {
      return { engineBrands: brands, engineCatalogBrandId: null, engineCatalogModels: [] }
    }

    return {
      engineBrands: brands,
      engineCatalogBrandId: brand.id,
      engineCatalogModels: await this.listModels({ brandId: brand.id }),
    }
  }

  /**
   * Rapproche une saisie libre (`Yamaha`, `EVINRUDE 6cv`, `VP`,
   * `Volvo Penta D2-40`) d'une marque du catalogue via son slug, son nom puis
   * ses alias. Renvoie `null` quand elle n'en fait pas partie — la valeur reste
   * alors stockée telle quelle, c'est l'invariant de l'épic.
   *
   * Remplace la cascade de `if` codée en dur de `resolveSparePartsBrand()`
   * (#517), qui ne connaissait que trois marques.
   */
  async resolveBrand(freeText: string | null | undefined): Promise<EngineBrand | null> {
    if (!freeText) return null
    const needle = normalizeCatalogText(freeText)
    if (!needle) return null

    const brands = await EngineBrand.query().select([
      'id',
      'slug',
      'name',
      'country',
      'families',
      'aliases',
    ])

    // Première passe : égalité stricte, comme `BoatCatalogService.resolveBrand`.
    // Elle seule sait rattacher un alias qui n'est pas un mot de la saisie
    // (`VP` → Volvo Penta).
    const byKey = new Map<string, EngineBrand>()
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
    // sont ordonnés du plus long au plus court, donc `Mercury MerCruiser` tombe
    // sur MerCruiser et non sur Mercury-Mariner.
    for (const ngram of catalogTokenNgrams(freeText)) {
      const match = byKey.get(ngram)
      if (match) return match
    }

    return null
  }

  private toBrandOption(brand: EngineBrand): EngineBrandOption {
    return {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      country: brand.country,
      families: brand.families ?? [],
      aliases: brand.aliases ?? [],
    }
  }
}
