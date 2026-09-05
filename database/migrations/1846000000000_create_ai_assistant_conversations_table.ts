import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Conversations du copilote FleetAi (panneau global de l'app).
 *
 * Calquée sur `ai_part_search_conversations` (#634) : fil complet en blob
 * JSON, pas de table de messages. FK en `SET NULL` pour conserver les lignes
 * après suppression du compte — elles portent le suivi des coûts
 * (`tokens_used`).
 *
 * Pas de colonne `context` : le contexte flotte (roster, digest planning) est
 * reconstruit à chaque tour depuis les services — les réponses restent
 * fraîches, rien ne périme.
 *
 * `pending_action` : proposition de tâche validée côté serveur, en attente de
 * confirmation explicite de l'utilisateur. C'est la seule source de vérité de
 * l'endpoint de confirmation — jamais un payload client.
 */
export default class extends BaseSchema {
  protected tableName = 'ai_assistant_conversations'

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
      table.string('locale', 10).notNullable()
      table.string('status', 20).notNullable().defaultTo('active')
      // Fil complet de la conversation (AssistantMessage[]).
      table.jsonb('messages').notNullable()
      // Proposition de tâche en attente de confirmation (AssistantTaskProposal).
      table.jsonb('pending_action').nullable()
      table.integer('tokens_used').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index(['user_id', 'status'])
      table.index('organization_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
