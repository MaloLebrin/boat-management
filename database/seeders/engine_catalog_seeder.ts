import {
  ENGINE_CATALOG_BRANDS,
  ENGINE_CATALOG_PART_REFERENCES,
  normalizeEngineBrandModels,
} from '#database/data/engine_catalog/index'
import EngineBrand from '#models/engine_brand'
import EngineModel from '#models/engine_model'
import EnginePartReference from '#models/engine_part_reference'
import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

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
    const modelCounts = await Promise.all(ENGINE_CATALOG_BRANDS.map((seed) => this.seedBrand(seed)))

    const brandCount = modelCounts.length
    const modelCount = modelCounts.reduce((total, count) => total + count, 0)

    const referenceCount = await this.seedPartReferences()

    logger.info(
      `Catalogue moteur : ${brandCount} marques, ${modelCount} modèles, ` +
        `${referenceCount} références constructeur`
    )
  }

  /**
   * Une marque et ses modèles sont indépendants des autres marques : les
   * upserts tournent en parallèle plutôt qu'en boucle `for` séquentielle, ce
   * qui divise nettement le temps du seeder sur un corpus de plusieurs
   * centaines de lignes.
   */
  private async seedBrand(seed: (typeof ENGINE_CATALOG_BRANDS)[number]): Promise<number> {
    const brand = await EngineBrand.updateOrCreate(
      { slug: seed.slug },
      {
        name: seed.name,
        country: seed.country ?? null,
        families: [...seed.families],
        aliases: seed.aliases ? [...seed.aliases] : null,
        isActive: seed.isActive ?? true,
        plateLocationKey: seed.plateLocationKey ?? null,
        plateExampleKey: seed.plateExampleKey ?? null,
        referencePattern: seed.referencePattern ?? null,
      }
    )

    // Dédoublonnage défensif par slug (dernier gagne, comme l'ancienne boucle
    // séquentielle) : deux upserts parallèles sur la même clé unique
    // (marque, slug) provoqueraient une violation de contrainte.
    const models = [
      ...new Map(normalizeEngineBrandModels(seed).map((model) => [model.slug, model])).values(),
    ]
    await Promise.all(
      models.map((model) =>
        EngineModel.updateOrCreate(
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
      )
    )

    return models.length
  }

  /**
   * Références constructeur (#575), rattachées au couple (modèle, pièce).
   *
   * Un modèle absent du catalogue **fait échouer le seeder** plutôt que d'être
   * ignoré : une référence orpheline est une faute de frappe de slug, pas une
   * donnée manquante, et la passer sous silence la rendrait invisible.
   *
   * Les entrées sans source ne peuvent pas arriver jusqu'ici — le type l'exige
   * et `ENGINE_CATALOG_PART_REFERENCES` le vérifie au chargement.
   */
  private async seedPartReferences(): Promise<number> {
    const cacheKeys = [
      ...new Set(
        ENGINE_CATALOG_PART_REFERENCES.map((entry) => `${entry.brandSlug}/${entry.modelSlug}`)
      ),
    ]

    const modelIds = new Map<string, number>(
      await Promise.all(
        cacheKeys.map(async (cacheKey): Promise<[string, number]> => {
          const [brandSlug, modelSlug] = cacheKey.split('/')
          const model = await EngineModel.query()
            .select('engine_models.id')
            .join('engine_brands', 'engine_brands.id', 'engine_models.engine_brand_id')
            .where('engine_brands.slug', brandSlug)
            .where('engine_models.slug', modelSlug)
            .first()

          if (!model) {
            throw new Error(
              `Références constructeur : le modèle « ${cacheKey} » n'existe pas au ` +
                `catalogue moteur. Vérifiez le slug de la marque et du modèle.`
            )
          }

          return [cacheKey, model.id]
        })
      )
    )

    await Promise.all(
      ENGINE_CATALOG_PART_REFERENCES.map((entry) =>
        EnginePartReference.updateOrCreate(
          {
            engineModelId: modelIds.get(`${entry.brandSlug}/${entry.modelSlug}`)!,
            partKey: entry.partKey,
          },
          {
            reference: entry.reference,
            sourceLabel: entry.sourceLabel,
            sourceUrl: entry.sourceUrl ?? null,
            verifiedAt: entry.verifiedAt ? DateTime.fromISO(entry.verifiedAt) : null,
          }
        )
      )
    )

    return ENGINE_CATALOG_PART_REFERENCES.length
  }
}
