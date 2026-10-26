import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Appairage par code d'un boîtier Signal K (#1032, D11).
 *
 * Un appairage existe **avant** d'être rattaché : le boîtier le crée sans
 * compte (`boat_id`, `organization_id` et `claimed_by_user_id` nuls), puis un
 * admin saisit le `userCode` dans FleetAi. Seules les empreintes des deux
 * codes sont stockées (`device_code_hash` = sha256, `user_code_hash` = HMAC) ;
 * le jeton d'ingestion n'est jamais écrit ici, il est généré à la livraison.
 *
 * `consumed_at` : jeton livré — l'appairage ne livre plus rien. `hardware_kind`
 * est prévu pour le niveau 2 (kit préconfiguré).
 */
export default class extends BaseSchema {
  protected tableName = 'instrument_pairings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('device_code_hash', 64).notNullable().unique()
      table.string('user_code_hash', 64).notNullable().unique()
      table.string('device_label', 80).nullable()
      table.string('hardware_kind', 40).nullable()
      table.string('plugin_version', 40).nullable()
      table.integer('boat_id').unsigned().nullable()
      table.foreign('boat_id').references('boats.id').onDelete('CASCADE')
      table.integer('organization_id').unsigned().nullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.integer('claimed_by_user_id').unsigned().nullable()
      table.foreign('claimed_by_user_id').references('users.id').onDelete('SET NULL')
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('approved_at', { useTz: true }).nullable()
      table.timestamp('consumed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['expires_at'])
      table.index(['boat_id'])
      table.index(['organization_id'])
      table.index(['claimed_by_user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
