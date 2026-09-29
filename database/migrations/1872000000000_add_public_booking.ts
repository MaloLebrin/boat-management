import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Page publique de réservation (#881).
 *
 * - `boats.public_booking_enabled` : la page `/book/:orgSlug/:boatSlug` du
 *   bateau répond (404 sinon) ;
 * - `boats.public_booking_slug` : segment d'URL du bateau, dérivé du nom à la
 *   première activation puis **figé** — un lien partagé sur un site ou un
 *   réseau social ne casse pas si le bateau est renommé. Unique dans
 *   l'organisation ;
 * - `boat_reservations.source` : `internal` (saisie par l'équipe) ou `public`
 *   (demande du client final) — c'est elle qui décide des e-mails envoyés au
 *   client et de la purge des demandes jamais confirmées ;
 * - `boat_reservations.request_locale` : langue de la page au moment de la
 *   demande, celle des e-mails envoyés ensuite au client.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boats', (table) => {
      table.boolean('public_booking_enabled').notNullable().defaultTo(false)
      table.string('public_booking_slug', 80).nullable()
      table.unique(['organization_id', 'public_booking_slug'])
    })

    this.schema.alterTable('boat_reservations', (table) => {
      table.string('source', 20).notNullable().defaultTo('internal')
      table.string('request_locale', 5).nullable()
      table.index(['source', 'status', 'created_at'])
    })
  }

  async down() {
    this.schema.alterTable('boat_reservations', (table) => {
      table.dropIndex(['source', 'status', 'created_at'])
      table.dropColumn('request_locale')
      table.dropColumn('source')
    })

    this.schema.alterTable('boats', (table) => {
      table.dropUnique(['organization_id', 'public_booking_slug'])
      table.dropColumn('public_booking_slug')
      table.dropColumn('public_booking_enabled')
    })
  }
}
