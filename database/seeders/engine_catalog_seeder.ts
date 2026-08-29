import {
  ENGINE_CATALOG_BRANDS,
  normalizeEngineBrandModels,
} from '#database/data/engine_catalog/index'
import EngineBrand from '#models/engine_brand'
import EngineModel from '#models/engine_model'
import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Corpus v1 du catalogue de marques et modèles de motorisation (#573).
 *
 * **Idempotent** : `updateOrCreate` sur le slug, jamais de `delete`. Rejouer le
 * seeder met le corpus à jour sans créer de doublon et **sans supprimer** les
 * marques ou modèles qui ne seraient plus dans les fichiers de données — une
 * ligne peut être référencée par `boat_engines.engine_model_id`.
 *
 * Pas de `static environment` : comme le catalogue de bateaux (#571), celui-ci
 * alimente un référentiel métier et doit tourner en production, à côté du
 * `migration:run --force` du service `migrator` (#542).
 */
export default class EngineCatalogSeeder extends BaseSeeder {
  async run() {
    let brandCount = 0
    let modelCount = 0

    for (const seed of ENGINE_CATALOG_BRANDS) {
      const brand = await EngineBrand.updateOrCreate(
        { slug: seed.slug },
        {
          name: seed.name,
          country: seed.country ?? null,
          families: [...seed.families],
          aliases: seed.aliases ? [...seed.aliases] : null,
          isActive: seed.isActive ?? true,
        }
      )
      brandCount += 1

      for (const model of normalizeEngineBrandModels(seed)) {
        await EngineModel.updateOrCreate(
          { engineBrandId: brand.id, slug: model.slug },
          {
            name: model.name,
            modelCode: model.modelCode ?? null,
            family: model.family,
            powerHp: model.powerHp ?? null,
            displacementCc: model.displacementCc ?? null,
            cylinders: model.cylinders ?? null,
            strokeType: model.strokeType ?? null,
            fuel: model.fuel ?? null,
            productionStartYear: model.productionStartYear ?? null,
            productionEndYear: model.productionEndYear ?? null,
            aliases: model.aliases ?? null,
          }
        )
        modelCount += 1
      }
    }

    logger.info(`Catalogue moteur : ${brandCount} marques, ${modelCount} modèles`)
  }
}
