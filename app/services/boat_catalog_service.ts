import BoatBrand from '#models/boat_brand'
import BoatModel from '#models/boat_model'
import { escapeLike } from '#shared/helpers/query'
import { normalizeCatalogText } from '#shared/helpers/boat_catalog'
import type {
  BoatBrandOption,
  BoatModelOption,
  ListBrandsOptions,
  ListModelsOptions,
} from '#shared/types/boat_catalog'
import { inject } from '@adonisjs/core'

const DEFAULT_BRAND_LIMIT = 600
const DEFAULT_MODEL_LIMIT = 500

/**
 * Catalogue de marques et modèles de bateau (#571).
 *
 * La catégorie **priorise** les marques, elle ne les filtre jamais : un
 * chantier absent de la catégorie choisie doit rester proposé, et une saisie
 * hors catalogue reste acceptée telle quelle par le formulaire.
 */
@inject()
export default class BoatCatalogService {
  /**
   * Marques du catalogue, celles de `category` d'abord puis l'ordre
   * alphabétique. `q` restreint sur le nom ou le slug.
   */
  async listBrands(options: ListBrandsOptions = {}): Promise<BoatBrandOption[]> {
    const query = BoatBrand.query()
      .select(['id', 'slug', 'name', 'country', 'categories'])
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
    // quelques centaines de lignes et la requête reste lisible.
    return rows.sort((a, b) => {
      const aInCategory = a.categories.includes(category) ? 0 : 1
      const bInCategory = b.categories.includes(category) ? 0 : 1
      if (aInCategory !== bInCategory) return aInCategory - bInCategory
      return a.name.localeCompare(b.name)
    })
  }

  /** Modèles d'une marque, ordre alphabétique. */
  async listModels(options: ListModelsOptions): Promise<BoatModelOption[]> {
    const query = BoatModel.query()
      .select([
        'id',
        'slug',
        'name',
        'category',
        'productionStartYear',
        'productionEndYear',
        'boatBrandId',
      ])
      .where('boatBrandId', options.brandId)
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
   * Rapproche une saisie libre (`BENETEAU`, `bénéteau`, `Chantiers Bénéteau`)
   * d'une marque du catalogue via son slug puis ses alias. Renvoie `null`
   * quand elle n'en fait pas partie — la valeur reste alors stockée telle
   * quelle, c'est l'invariant du lot.
   */
  async resolveBrand(freeText: string | null | undefined): Promise<BoatBrand | null> {
    if (!freeText) return null
    const needle = normalizeCatalogText(freeText)
    if (!needle) return null

    const brands = await BoatBrand.query().select([
      'id',
      'slug',
      'name',
      'country',
      'categories',
      'aliases',
    ])

    for (const brand of brands) {
      if (normalizeCatalogText(brand.slug) === needle) return brand
      if (normalizeCatalogText(brand.name) === needle) return brand
      if (brand.aliases?.some((alias) => normalizeCatalogText(alias) === needle)) return brand
    }

    return null
  }

  private toBrandOption(brand: BoatBrand): BoatBrandOption {
    return {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      country: brand.country,
      categories: brand.categories ?? [],
    }
  }
}
