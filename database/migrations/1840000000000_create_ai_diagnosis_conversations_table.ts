import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Conversations du chat IA public de diagnostic de panne (#602).
 *
 * `user_id`/`organization_id` sont nullables : une conversation anonyme n'a
 * ni l'un ni l'autre (la propriété passe par la session). Les FK sont en
 * `SET NULL` pour conserver les lignes après suppression du compte — elles
 * portent le suivi des coûts (`tokens_used`, y compris pour les anonymes).
 *
 * Le comptage « 2 conversations à vie » d'un plan starter est un simple
 * `count(*)` sur `organization_id` : la ligne EST le compteur, aucun état
 * dupliqué à maintenir.
 */
export default class extends BaseSchema {
  protected tableName = 'ai_diagnosis_conversations'

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
      // Contexte moteur saisi librement au 1er message (type, marque, heures).
      table.jsonb('context').nullable()
      // Fil complet de la conversation (AiChatMessage[]).
      table.jsonb('messages').notNullable()
      // Diagnostic final structuré — rempli quand status passe à completed.
      table.jsonb('result').nullable()
      table.integer('tokens_used').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index('organization_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
