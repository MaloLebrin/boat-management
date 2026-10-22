import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Alertes des instruments de bord (#993, épopée #986).
 *
 * - `boat_instrument_alert_rules` : règles de seuil définies par un admin sur
 *   un chemin numérique concret (`electrical.batteries.house.capacity.
 *   stateOfCharge`). `threshold` et `hysteresis` sont en **unités SI**, comme
 *   `boat_telemetry_samples.value` (D8) — la conversion se fait à l'écran et
 *   à l'enregistrement. `operator` vaut `lt` ou `gt`.
 * - `boat_instrument_alerts` : une alerte **ouverte** par règle et par chemin
 *   (`rule_key` = `rule:<id>` pour une règle admin, `builtin:<clé>` pour une
 *   règle du catalogue ; l'index unique partiel `WHERE cleared_at IS NULL`
 *   l'impose). `cleared_at` la ferme et la conserve comme historique.
 *   `rule_id` est la règle admin d'origine : supprimer la règle supprime ses
 *   alertes.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_instrument_alert_rules', (table) => {
      table.increments('id')
      table.integer('boat_id').unsigned().notNullable()
      table.foreign('boat_id').references('boats.id').onDelete('CASCADE')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.string('path', 96).notNullable()
      table.string('operator', 2).notNullable()
      table.decimal('threshold', 14, 4).notNullable()
      table.decimal('hysteresis', 14, 4).notNullable().defaultTo(0)
      table.string('severity', 10).notNullable().defaultTo('warning')
      table.boolean('enabled').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['boat_id'])
      table.index(['organization_id'])
      table.unique(['boat_id', 'path', 'operator'])
    })

    this.schema.createTable('boat_instrument_alerts', (table) => {
      table.increments('id')
      table.integer('boat_id').unsigned().notNullable()
      table.foreign('boat_id').references('boats.id').onDelete('CASCADE')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.integer('rule_id').unsigned().nullable()
      table.foreign('rule_id').references('boat_instrument_alert_rules.id').onDelete('CASCADE')
      table.string('rule_key', 60).notNullable()
      table.string('path', 96).notNullable()
      table.string('severity', 10).notNullable()
      table.timestamp('opened_at', { useTz: true }).notNullable()
      table.timestamp('cleared_at', { useTz: true }).nullable()
      table.decimal('last_value', 14, 4).nullable()
      table.string('message', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['organization_id'])
      table.index(['boat_id', 'opened_at'])
      table.index(['rule_id'])
    })
    // Une seule alerte ouverte par règle et par chemin : l'évaluation
    // concurrente de deux lots ne peut pas en ouvrir deux.
    this.schema.raw(
      'CREATE UNIQUE INDEX boat_instrument_alerts_open_unique ' +
        'ON boat_instrument_alerts (boat_id, rule_key, path) WHERE cleared_at IS NULL'
    )
  }

  async down() {
    this.schema.dropTable('boat_instrument_alerts')
    this.schema.dropTable('boat_instrument_alert_rules')
  }
}
