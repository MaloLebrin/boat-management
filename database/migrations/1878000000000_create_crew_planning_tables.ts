import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Planning d'équipage (#883) : affectation d'équipiers à une réservation et
 * indisponibilités (congés, autre embarquement). Les deux tables suivent la
 * suppression de l'équipier et de la réservation.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('boat_reservation_crew_members', (table) => {
      table.increments('id').primary()

      table
        .integer('boat_reservation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_reservations')
        .onDelete('CASCADE')

      table
        .integer('crew_member_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('crew_members')
        .onDelete('CASCADE')
        .index()

      table.enu('role', ['skipper', 'crew', 'instructor']).notNullable().defaultTo('crew')
      table.text('notes').nullable()

      // Rappel J-1 envoyé (#883) : le scan quotidien n'avertit qu'une fois.
      table.timestamp('reminder_sent_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['boat_reservation_id', 'crew_member_id'])
    })

    this.schema.createTable('crew_unavailabilities', (table) => {
      table.increments('id').primary()

      table
        .integer('crew_member_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('crew_members')
        .onDelete('CASCADE')
        .index()

      // Jours inclus : du `starts_on` au `ends_on`, bornes comprises.
      table.date('starts_on').notNullable()
      table.date('ends_on').notNullable()
      table.string('reason', 255).nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('crew_unavailabilities')
    this.schema.dropTable('boat_reservation_crew_members')
  }
}
