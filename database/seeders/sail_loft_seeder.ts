import { SAIL_LOFTS } from '#database/data/sail_lofts/index'
import SailLoft from '#models/sail_loft'
import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Corpus v1 du référentiel des voileries (#578).
 *
 * **Idempotent** : `updateOrCreate` sur le slug, jamais de `delete`. Rejouer le
 * seeder met le corpus à jour sans créer de doublon et **sans supprimer** les
 * voileries qui ne seraient plus dans le fichier de données — une ligne peut
 * être référencée par `boat_sails.sail_loft_id`.
 *
 * Pas de `static environment` : comme les catalogues #571/#573/#577, ce
 * référentiel métier doit tourner en production, à côté du
 * `migration:run --force` du service `migrator` (#542).
 */
export default class SailLoftSeeder extends BaseSeeder {
  async run() {
    let count = 0

    for (const seed of SAIL_LOFTS) {
      await SailLoft.updateOrCreate(
        { slug: seed.slug },
        {
          name: seed.name,
          country: seed.country ?? null,
          aliases: seed.aliases ? [...seed.aliases] : null,
          isActive: seed.isActive ?? true,
        }
      )
      count += 1
    }

    logger.info(`Référentiel voileries : ${count} voileries`)
  }
}
