import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class PasswordResetToken extends BaseModel {
  static table = 'password_reset_tokens'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  /**
   * SHA-256 du token envoyé par e-mail, jamais le token lui-même. Masqué à la
   * sérialisation (#782) : `verifyToken` cherche l'enregistrement **par hash**,
   * donc le connaître suffit à cibler une ligne. Aucun code ne sérialise ce
   * modèle aujourd'hui — c'est précisément pour que ça reste vrai.
   */
  @column({ serializeAs: null })
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
