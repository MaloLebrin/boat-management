import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * État des lieux signé (#889).
 *
 * - `boat_inspections.locked_at` / `locked_by_id` : la signature fige
 *   l'inspection — constats, photos, défauts et relevés ne bougent plus, comme
 *   une facture émise (#717) ;
 * - `boat_inspections.pdf_media_id` : le PDF produit au moment de la
 *   signature, archivé une fois pour toutes (Cloudinary, table `media`) — c'est
 *   lui qu'on télécharge et qu'on envoie ensuite, jamais une version recalculée ;
 * - `boat_inspections.sent_at` : dernier envoi du PDF au client ;
 * - `boat_inspection_signatures` : le tracé manuscrit de chaque partie
 *   (`client`, `staff`), en PNG, avec le nom du signataire. Quelques dizaines
 *   de Ko : il vit en base avec l'inspection et disparaît avec elle.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('boat_inspections', (table) => {
      table.timestamp('locked_at', { useTz: true }).nullable()
      table
        .integer('locked_by_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('pdf_media_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('media')
        .onDelete('SET NULL')
      table.timestamp('sent_at', { useTz: true }).nullable()
      table.index(['locked_by_id'])
      table.index(['pdf_media_id'])
    })

    this.schema.createTable('boat_inspection_signatures', (table) => {
      table.increments('id')
      table
        .integer('boat_inspection_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('boat_inspections')
        .onDelete('CASCADE')
      table.string('role', 10).notNullable()
      table.string('signer_name', 120).notNullable()
      table.binary('image').notNullable()
      table.timestamp('signed_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.unique(['boat_inspection_id', 'role'])
    })
  }

  async down() {
    this.schema.dropTable('boat_inspection_signatures')

    this.schema.alterTable('boat_inspections', (table) => {
      table.dropIndex(['pdf_media_id'])
      table.dropIndex(['locked_by_id'])
      table.dropColumn('sent_at')
      table.dropColumn('pdf_media_id')
      table.dropColumn('locked_by_id')
      table.dropColumn('locked_at')
    })
  }
}
