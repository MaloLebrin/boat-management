import BoatBrand from '#models/boat_brand'
import BoatModel from '#models/boat_model'
import { BOAT_CATALOG_BRANDS, normalizeBrandModels } from '#database/data/boat_catalog/index'
import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Corpus v1 du catalogue de marques et modèles de bateau (#571).
 *
 * **Idempotent** : `updateOrCreate` sur le slug, jamais de `delete`. Rejouer le
 * seeder met le corpus à jour sans créer de doublon et **sans supprimer** les
 * marques ou modèles qui ne seraient plus dans les fichiers de données — une
 * ligne peut être référencée par un bateau existant.
 *
 * Pas de `static environment` : contrairement aux seeders de démo, celui-ci
 * alimente un référentiel métier et doit tourner en production, à côté du
 * `migration:run --force` du service `migrator` (#542).
 */
export default class BoatCatalogSeeder extends BaseSeeder {
  async run() {
    const modelCounts = await Promise.all(BOAT_CATALOG_BRANDS.map((seed) => this.seedBrand(seed)))

    const brandCount = modelCounts.length
    const modelCount = modelCounts.reduce((total, count) => total + count, 0)

    logger.info(`Catalogue bateaux : ${brandCount} marques, ${modelCount} modèles`)
  }

  /**
   * Une marque et ses modèles sont indépendants des autres marques : les
   * upserts tournent en parallèle plutôt qu'en boucle `for` séquentielle, ce
   * qui divise nettement le temps du seeder sur un corpus de plusieurs
   * milliers de lignes.
   */
  private async seedBrand(seed: (typeof BOAT_CATALOG_BRANDS)[number]): Promise<number> {
    const brand = await BoatBrand.updateOrCreate(
      { slug: seed.slug },
      {
        name: seed.name,
        country: seed.country ?? null,
        categories: [...seed.categories],
        aliases: seed.aliases ? [...seed.aliases] : null,
        foundedYear: seed.foundedYear ?? null,
        discontinuedYear: seed.discontinuedYear ?? null,
        isActive: seed.isActive ?? true,
      }
    )

    // Dédoublonnage défensif par slug (dernier gagne, comme l'ancienne boucle
    // séquentielle) : deux upserts parallèles sur la même clé unique
    // (marque, slug) provoqueraient une violation de contrainte.
    const models = [
      ...new Map(normalizeBrandModels(seed).map((model) => [model.slug, model])).values(),
    ]
    await Promise.all(
      models.map((model) =>
        BoatModel.updateOrCreate(
          { boatBrandId: brand.id, slug: model.slug },
          {
            name: model.name,
            category: model.category,
            lengthM: model.lengthM ?? null,
            productionStartYear: model.productionStartYear ?? null,
            productionEndYear: model.productionEndYear ?? null,
            aliases: model.aliases ?? null,
          }
        )
      )
    )

    return models.length
  }
}
