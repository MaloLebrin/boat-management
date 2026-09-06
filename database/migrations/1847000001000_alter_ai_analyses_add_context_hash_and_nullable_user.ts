import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_analyses'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // sha256 hexadécimal du contexte envoyé au modèle — permet au job
      // planifié de sauter la régénération quand rien n'a changé.
      table.string('context_hash', 64).nullable()
      // Les analyses générées par le job planifié n'ont pas d'utilisateur
      // déclencheur : elles appartiennent à l'organisation (user_id NULL).
      table.setNullable('user_id')
    })
  }

  async down() {
    // Échoue si des lignes user_id NULL existent — rollback volontairement
    // non permissif plutôt que de supprimer des analyses planifiées.
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('context_hash')
      table.dropNullable('user_id')
    })
  }
}
