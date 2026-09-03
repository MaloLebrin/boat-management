import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Conversations du chat IA de recherche de références de pièces (#634).
 *
 * Calquée sur `ai_diagnosis_conversations` (#602) : fil complet en blob JSON,
 * pas de table de messages. Les FK sont en `SET NULL` pour conserver les
 * lignes après suppression du compte, du moteur ou du modèle — elles portent
 * le suivi des coûts (`tokens_used`).
 *
 * `phase` est une colonne dédiée (pas un champ du blob) : c'est l'aiguillage
 * du prompt système à chaque tour, et il reste requêtable.
 */
export default class extends BaseSchema {
  protected tableName = 'ai_part_search_conversations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('token', 12).notNullable().unique()
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('organization_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('organizations')
        .onDelete('SET NULL')
      table
        .integer('boat_engine_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boat_engines')
        .onDelete('SET NULL')
      // Modèle du catalogue identifié — au court-circuit (moteur déjà résolu)
      // ou au fil de la conversation (numéro de série interprété).
      table
        .integer('identified_engine_model_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('engine_models')
        .onDelete('SET NULL')
      table.string('locale', 10).notNullable()
      table.string('status', 20).notNullable().defaultTo('active')
      table.string('phase', 20).notNullable().defaultTo('engine')
      // Snapshot du moteur à la création (marque, modèle, serial, famille…).
      table.jsonb('context').nullable()
      // Fil complet de la conversation (AiChatMessage[]).
      table.jsonb('messages').notNullable()
      // Résultat final — rempli quand status passe à completed.
      table.jsonb('result').nullable()
      table.integer('tokens_used').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index('organization_id')
      table.index('boat_engine_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
