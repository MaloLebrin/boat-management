import { TwoFactorRecoveryCodeSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'

/**
 * Code de secours 2FA (#884) : usage unique, stocké haché (SHA-256). Le code
 * en clair n'est montré qu'une fois, à sa génération.
 */
export default class TwoFactorRecoveryCode extends TwoFactorRecoveryCodeSchema {
  static table = 'two_factor_recovery_codes'

  @column({ serializeAs: null })
  declare codeHash: string
}
