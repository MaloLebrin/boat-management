import EngineBrand from '#models/engine_brand'
import EngineModel from '#models/engine_model'
import { normalizeCatalogText } from '#shared/helpers/boat_catalog'
import { catalogTokenNgrams } from '#shared/helpers/engine_catalog'
import { escapeLike } from '#shared/helpers/query'
import type { EnginePlateHint } from '#shared/types/spare_parts'
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
      .select(['id', 'slug', 'name', 'country', 'families'])
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
      // Le motif de référence (#575) voyage avec la marque résolue : les écrans
      // pièces détachées le reçoivent sans second aller-retour.
      'referencePattern',
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

  /**
   * Aides plaque signalétique (#575) : celle de la marque du moteur, ou toutes
   * celles du catalogue quand la marque n'est pas résolue.
   *
   * C'est le comportement de #517 — marque inconnue → on affiche tout ce qu'on
   * sait, faute de mieux — mais servi par le catalogue au lieu d'un tableau de
   * trois marques codé en dur. Une marque qui n'a pas encore d'aide n'apparaît
   * pas : mieux vaut une liste courte que des lignes vides.
   */
  async plateHints(brandSlug: string | null | undefined): Promise<EnginePlateHint[]> {
    const query = EngineBrand.query()
      .select(['id', 'slug', 'name', 'plateLocationKey', 'plateExampleKey'])
      .whereNotNull('plateLocationKey')
      .orderBy('name', 'asc')

    if (brandSlug) query.where('slug', brandSlug)

    const brands = await query

    return brands.map((brand) => ({
      brandSlug: brand.slug,
      brandName: brand.name,
      // `whereNotNull` ci-dessus garantit la clé ; le `??` n'est là que pour le
      // typage de la colonne nullable.
      locationKey: brand.plateLocationKey ?? '',
      exampleKey: brand.plateExampleKey,
    }))
  }

  /**
   * Modèle du catalogue correspondant à un moteur : celui **rattaché**
   * (`engine_model_id`, #573) en priorité, sinon celui que la saisie libre
   * `brand` + `model` permet de rapprocher.
   *
   * Le repli n'est pas de la redondance : les moteurs saisis avant #573 n'ont
   * pas de `engine_model_id`, et un `Yamaha` / `F150` doit tout de même trouver
   * ses références. Le rapprochement se fait sur le nom, le code plaque puis
   * les alias du modèle, toujours **au sein de la marque résolue** — sans quoi
   * un `D2-40` de deux motoristes se confondrait.
   */
  async resolveModelForEngine(engine: {
    engineModelId?: number | null
    brand?: string | null
    model?: string | null
  }): Promise<EngineModel | null> {
    if (engine.engineModelId) {
      const linked = await EngineModel.find(engine.engineModelId)
      if (linked) return linked
    }

    if (!engine.model) return null
    const brand = await this.resolveBrand(engine.brand)
    if (!brand) return null

    const needle = normalizeCatalogText(engine.model)
    if (!needle) return null

    const models = await EngineModel.query()
      .where('engineBrandId', brand.id)
      .select(['id', 'engineBrandId', 'slug', 'name', 'modelCode', 'family', 'aliases'])

    return (
      models.find((model) =>
        [model.slug, model.name, model.modelCode, ...(model.aliases ?? [])].some(
          (candidate) => candidate && normalizeCatalogText(candidate) === needle
        )
      ) ?? null
    )
  }

  /**
   * Nombre de modèles du catalogue partageant un même code plaque (#575).
   *
   * Sert l'avertissement « le numéro de série départage les variantes » : dès
   * qu'un `model_code` couvre plusieurs modèles, l'écran le dit explicitement
   * au lieu de s'en tenir à la mise en garde générale.
   */
  async countModelsForModelCode(modelCode: string | null | undefined): Promise<number> {
    if (!modelCode?.trim()) return 0

    const result = await EngineModel.query()
      .where('modelCode', modelCode.trim())
      .count('* as total')
    return Number(result[0]?.$extras.total ?? 0)
  }

  private toBrandOption(brand: EngineBrand): EngineBrandOption {
    return {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      country: brand.country,
      families: brand.families ?? [],
    }
  }
}
