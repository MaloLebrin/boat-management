import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Exports comptables et exports flotte (#879).
 *
 * - `organizations.accounting_*` : comptes du FEC (706 ventes, 44571 TVA
 *   collectée, 411 clients, 512 banque par défaut) et SIREN en tête du nom du
 *   fichier ;
 * - `data_exports` : exports trop volumineux pour la réponse HTTP, générés par
 *   le job `GenerateExport`. Le fichier est gardé **en base** (`content`) : le
 *   worker et le serveur web ne partagent pas de disque en production. Purgé
 *   à `expires_at` par le job `PurgeExpiredExports`.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('organizations', (table) => {
      table.string('accounting_siren', 9).nullable()
      table.string('accounting_sales_account', 20).notNullable().defaultTo('706')
      table.string('accounting_vat_account', 20).notNullable().defaultTo('44571')
      table.string('accounting_customer_account', 20).notNullable().defaultTo('411')
      table.string('accounting_bank_account', 20).notNullable().defaultTo('512')
    })

    this.schema.createTable('data_exports', (table) => {
      table.increments('id')
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('type', 40).notNullable()
      table.jsonb('params').notNullable()
      table.enu('status', ['pending', 'ready', 'failed']).notNullable().defaultTo('pending')
      table.integer('row_count').nullable()
      table.string('filename', 255).nullable()
      table.string('content_type', 100).nullable()
      table.binary('content').nullable()
      table.text('error').nullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['organization_id', 'created_at'])
      table.index(['user_id'])
      table.index(['expires_at'])
    })
  }

  async down() {
    this.schema.dropTable('data_exports')

    this.schema.alterTable('organizations', (table) => {
      table.dropColumn('accounting_bank_account')
      table.dropColumn('accounting_customer_account')
      table.dropColumn('accounting_vat_account')
      table.dropColumn('accounting_sales_account')
      table.dropColumn('accounting_siren')
    })
  }
}
