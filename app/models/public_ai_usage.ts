import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

/**
 * Compteur journalier de la surface IA publique (#762).
 *
 * Une ligne par (jour, surface, client) : `client_key` est un HMAC de l'IP
 * salé par le jour pour les lignes par visiteur, le littéral `global` pour la
 * ligne agrégée qui porte le budget de tokens.
 */
export default class PublicAiUsage extends BaseModel {
  static table = 'public_ai_usages'

  @column({ isPrimary: true })
  declare id: number

  @column.date()
  declare day: DateTime

  @column()
  declare surface: string

  @column()
  declare clientKey: string

  @column()
  declare conversations: number

  @column({ consume: (value: string | number) => Number(value) })
  declare tokensUsed: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
