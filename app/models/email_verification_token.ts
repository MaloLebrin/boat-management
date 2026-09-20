import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

/**
 * Jeton de vérification d'adresse (#768).
 *
 * `token` est le **hash SHA-256** du jeton envoyé : une fuite en lecture de
 * la table ne permet pas de fabriquer un lien valide.
 */
export default class EmailVerificationToken extends BaseModel {
  static table = 'email_verification_tokens'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
