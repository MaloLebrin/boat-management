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
    let brandCount = 0
    let modelCount = 0

    for (const seed of BOAT_CATALOG_BRANDS) {
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
      brandCount += 1

      for (const model of normalizeBrandModels(seed)) {
        await BoatModel.updateOrCreate(
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
        modelCount += 1
      }
    }

    logger.info(`Catalogue bateaux : ${brandCount} marques, ${modelCount} modèles`)
  }
}
