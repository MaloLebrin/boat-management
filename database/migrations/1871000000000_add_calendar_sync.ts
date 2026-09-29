import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Synchronisation iCal des réservations (#880).
 *
 * - `boat_reservations.ical_sequence` : `SEQUENCE` du `VEVENT`, incrémenté à
 *   chaque changement de dates, de statut ou de client — les agendas abonnés
 *   ne remplacent un événement que si ce numéro augmente ;
 * - `calendar_feeds` : flux `.ics` publiés par jeton opaque, pour un bateau
 *   (`boat_id`) ou pour toute la flotte (`boat_id` nul). Supprimer la ligne
 *   révoque l'URL ;
 * - `external_calendars` : flux `.ics` d'une plateforme (Click&Boat, Samboat…)
 *   importés sur un bateau, avec l'état de la dernière synchronisation ;
 * - `external_calendar_events` : les créneaux importés, tenus à part des
 *   réservations — ils bloquent les dates sans entrer dans le chiffre
 *   d'affaires, l'occupation, la facturation ni les exports.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_reservations', (table) => {
      table.integer('ical_sequence').notNullable().defaultTo(0)
    })

    this.schema.createTable('calendar_feeds', (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .integer('boat_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table.string('token', 64).notNullable().unique()
      table.string('locale', 5).notNullable().defaultTo('fr')
      table.boolean('include_client_name').notNullable().defaultTo(false)
      table.boolean('include_maintenance').notNullable().defaultTo(false)
      table
        .integer('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['organization_id', 'boat_id'])
    })

    this.schema.createTable('external_calendars', (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.text('url').notNullable()
      table.timestamp('last_synced_at', { useTz: true }).nullable()
      table.string('last_error', 40).nullable()
      table.integer('event_count').notNullable().defaultTo(0)
      table.integer('conflict_count').notNullable().defaultTo(0)
      table
        .integer('created_by_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['boat_id'])
      table.index(['organization_id'])
    })

    this.schema.createTable('external_calendar_events', (table) => {
      table.increments('id')
      table
        .integer('external_calendar_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('external_calendars')
        .onDelete('CASCADE')
      table
        .integer('boat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boats')
        .onDelete('CASCADE')
      table.string('uid', 255).notNullable()
      table.string('summary', 200).nullable()
      table.timestamp('starts_at', { useTz: true }).notNullable()
      table.timestamp('ends_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['external_calendar_id', 'uid'])
      table.index(['boat_id', 'starts_at', 'ends_at'])
    })
  }

  async down() {
    this.schema.dropTable('external_calendar_events')
    this.schema.dropTable('external_calendars')
    this.schema.dropTable('calendar_feeds')

    this.schema.alterTable('boat_reservations', (table) => {
      table.dropColumn('ical_sequence')
    })
  }
}
