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
    const modelCounts = await Promise.all(
      EQUIPMENT_CATALOG_BRANDS.map((seed) => this.seedBrand(seed))
    )

    const brandCount = modelCounts.length
    const modelCount = modelCounts.reduce((total, count) => total + count, 0)

    logger.info(`Catalogue équipement : ${brandCount} marques, ${modelCount} modèles`)
  }

  /**
   * Une marque et ses modèles sont indépendants des autres marques : les
   * upserts tournent en parallèle plutôt qu'en boucle `for` séquentielle, ce
   * qui divise nettement le temps du seeder sur un corpus de plusieurs
   * centaines de lignes.
   */
  private async seedBrand(seed: (typeof EQUIPMENT_CATALOG_BRANDS)[number]): Promise<number> {
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

    // Dédoublonnage défensif par slug (dernier gagne, comme l'ancienne boucle
    // séquentielle) : deux upserts parallèles sur la même clé unique
    // (marque, slug) provoqueraient une violation de contrainte.
    const models = [
      ...new Map(normalizeEquipmentBrandModels(seed).map((model) => [model.slug, model])).values(),
    ]
    await Promise.all(
      models.map((model) =>
        EquipmentModel.updateOrCreate(
          { equipmentBrandId: brand.id, slug: model.slug },
          {
            name: model.name,
            category: model.category,
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
