import {
  EQUIPMENT_CATALOG_BRANDS,
  normalizeEquipmentBrandModels,
} from '#database/data/equipment_catalog/index'
import EquipmentBrand from '#models/equipment_brand'
import EquipmentModel from '#models/equipment_model'
import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Corpus v1 du catalogue de marques et modèles d'équipements (#577).
 *
 * **Idempotent** : `updateOrCreate` sur le slug, jamais de `delete`. Rejouer le
 * seeder met le corpus à jour sans créer de doublon et **sans supprimer** les
 * marques ou modèles qui ne seraient plus dans les fichiers de données — une
 * ligne peut être référencée par `boat_generic_equipment.equipment_model_id`.
 *
 * Pas de `static environment` : comme les catalogues bateaux (#571) et moteur
 * (#573), celui-ci alimente un référentiel métier et doit tourner en
 * production, à côté du `migration:run --force` du service `migrator` (#542).
 */
export default class EquipmentCatalogSeeder extends BaseSeeder {
  async run() {
    let brandCount = 0
    let modelCount = 0

    for (const seed of EQUIPMENT_CATALOG_BRANDS) {
      const brand = await EquipmentBrand.updateOrCreate(
        { slug: seed.slug },
        {
          name: seed.name,
          country: seed.country ?? null,
          categories: [...seed.categories],
          aliases: seed.aliases ? [...seed.aliases] : null,
          isActive: seed.isActive ?? true,
        }
      )
      brandCount += 1

      for (const model of normalizeEquipmentBrandModels(seed)) {
        await EquipmentModel.updateOrCreate(
          { equipmentBrandId: brand.id, slug: model.slug },
          {
            name: model.name,
            category: model.category,
            productionStartYear: model.productionStartYear ?? null,
            productionEndYear: model.productionEndYear ?? null,
            aliases: model.aliases ?? null,
          }
        )
        modelCount += 1
      }
    }

    logger.info(`Catalogue équipement : ${brandCount} marques, ${modelCount} modèles`)
  }
}
