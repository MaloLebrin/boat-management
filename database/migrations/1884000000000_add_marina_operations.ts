import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Exploitation d'une marina (#891).
 *
 * - `spots` : dimensions maximales (longueur, largeur, tirant d'eau), nature
 *   (annuelle, saisonnière, visiteur, technique), statut posé à la main
 *   (`available`, `reserved`, `out_of_service` — « occupée » se **déduit** d'un
 *   bateau amarré ou d'une escale en cours, il ne se saisit pas), tarifs et notes.
 * - `marina_stays` : escales sur une place — un bateau de la flotte **ou** un
 *   visiteur décrit en ligne (nom, longueur, immatriculation, contact). Statut
 *   `expected` → `arrived` → `departed` → `invoiced` (ou `cancelled`), nuitées
 *   déduites des dates, services consommés en JSON (lignes de facture).
 * - `mooring_contracts` : contrat d'amarrage d'un client sur une place, avec
 *   périodicité et prochaine échéance — le job quotidien
 *   `GenerateMooringContractInvoices` émet les factures en brouillon.
 *
 * `boat_port_stays` (dépenses d'escale saisies par un plaisancier, port en
 * texte libre) n'est pas touchée : ce n'est pas le même objet.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('spots', (table) => {
      table.decimal('length_m', 6, 2).nullable()
      table.decimal('beam_m', 6, 2).nullable()
      table.decimal('draft_m', 5, 2).nullable()
      table.string('kind', 20).notNullable().defaultTo('annual')
      table.string('status', 20).notNullable().defaultTo('available')
      table.decimal('daily_rate', 10, 2).nullable()
      table.decimal('monthly_rate', 10, 2).nullable()
      table.decimal('annual_rate', 10, 2).nullable()
      table.text('notes').nullable()
    })
    this.schema.raw(
      "ALTER TABLE spots ADD CONSTRAINT chk_spots_kind CHECK (kind IN ('annual', 'seasonal', 'visitor', 'technical'))"
    )
    this.schema.raw(
      "ALTER TABLE spots ADD CONSTRAINT chk_spots_status CHECK (status IN ('available', 'reserved', 'out_of_service'))"
    )

    this.schema.createTable('marina_stays', (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.integer('port_id').unsigned().notNullable()
      table.foreign('port_id').references('ports.id').onDelete('CASCADE')
      table.integer('spot_id').unsigned().notNullable()
      table.foreign('spot_id').references('spots.id').onDelete('CASCADE')
      table.integer('boat_id').unsigned().nullable()
      table.foreign('boat_id').references('boats.id').onDelete('SET NULL')
      table.integer('client_id').unsigned().nullable()
      table.foreign('client_id').references('clients.id').onDelete('SET NULL')
      table.string('visitor_name', 150).nullable()
      table.decimal('visitor_length_m', 6, 2).nullable()
      table.string('visitor_registration', 50).nullable()
      table.string('visitor_contact', 255).nullable()
      table.date('arrival_on').notNullable()
      table.date('departure_on').notNullable()
      table.string('status', 20).notNullable().defaultTo('expected')
      table.decimal('nightly_rate', 10, 2).notNullable().defaultTo(0)
      table.jsonb('services').notNullable().defaultTo('[]')
      table.integer('invoice_id').unsigned().nullable()
      table.foreign('invoice_id').references('invoices.id').onDelete('SET NULL')
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['organization_id'])
      table.index(['port_id', 'arrival_on'])
      table.index(['spot_id', 'status'])
      table.index(['boat_id'])
      table.index(['client_id'])
      table.index(['invoice_id'])
    })
    this.schema.raw(
      "ALTER TABLE marina_stays ADD CONSTRAINT chk_marina_stays_status CHECK (status IN ('expected', 'arrived', 'departed', 'invoiced', 'cancelled'))"
    )
    this.schema.raw(
      'ALTER TABLE marina_stays ADD CONSTRAINT chk_marina_stays_dates CHECK (departure_on > arrival_on)'
    )
    this.schema.raw(
      'ALTER TABLE marina_stays ADD CONSTRAINT chk_marina_stays_guest CHECK (boat_id IS NOT NULL OR visitor_name IS NOT NULL)'
    )

    this.schema.createTable('mooring_contracts', (table) => {
      table.increments('id')
      table.integer('organization_id').unsigned().notNullable()
      table.foreign('organization_id').references('organizations.id').onDelete('CASCADE')
      table.integer('port_id').unsigned().notNullable()
      table.foreign('port_id').references('ports.id').onDelete('CASCADE')
      table.integer('spot_id').unsigned().notNullable()
      table.foreign('spot_id').references('spots.id').onDelete('CASCADE')
      table.integer('client_id').unsigned().nullable()
      table.foreign('client_id').references('clients.id').onDelete('SET NULL')
      table.integer('boat_id').unsigned().nullable()
      table.foreign('boat_id').references('boats.id').onDelete('SET NULL')
      table.date('starts_on').notNullable()
      table.date('ends_on').nullable()
      table.string('periodicity', 20).notNullable()
      table.decimal('amount', 10, 2).notNullable()
      table.date('next_invoice_on').nullable()
      table.string('status', 20).notNullable().defaultTo('active')
      table.integer('last_invoice_id').unsigned().nullable()
      table.foreign('last_invoice_id').references('invoices.id').onDelete('SET NULL')
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['organization_id'])
      table.index(['port_id'])
      table.index(['spot_id', 'status'])
      table.index(['status', 'next_invoice_on'])
      table.index(['client_id'])
      table.index(['boat_id'])
      table.index(['last_invoice_id'])
    })
    this.schema.raw(
      "ALTER TABLE mooring_contracts ADD CONSTRAINT chk_mooring_contracts_periodicity CHECK (periodicity IN ('monthly', 'quarterly', 'annual'))"
    )
    this.schema.raw(
      "ALTER TABLE mooring_contracts ADD CONSTRAINT chk_mooring_contracts_status CHECK (status IN ('active', 'terminated'))"
    )
    this.schema.raw(
      'ALTER TABLE mooring_contracts ADD CONSTRAINT chk_mooring_contracts_dates CHECK (ends_on IS NULL OR ends_on > starts_on)'
    )
  }

  async down() {
    this.schema.dropTable('mooring_contracts')
    this.schema.dropTable('marina_stays')

    this.schema.raw('ALTER TABLE spots DROP CONSTRAINT IF EXISTS chk_spots_status')
    this.schema.raw('ALTER TABLE spots DROP CONSTRAINT IF EXISTS chk_spots_kind')
    this.schema.alterTable('spots', (table) => {
      table.dropColumn('notes')
      table.dropColumn('annual_rate')
      table.dropColumn('monthly_rate')
      table.dropColumn('daily_rate')
      table.dropColumn('status')
      table.dropColumn('kind')
      table.dropColumn('draft_m')
      table.dropColumn('beam_m')
      table.dropColumn('length_m')
    })
  }
}
