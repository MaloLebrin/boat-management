import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Révocation des sessions à la réinitialisation du mot de passe (#763).
 *
 * `SESSION_DRIVER=cookie` (le défaut documenté dans `.env.example`) rend les
 * sessions **non listables côté serveur** : il n'existe aucune table à vider.
 * Le discriminant est donc porté par l'utilisateur — toute session ouverte
 * avant cet instant cesse d'être valable, ce que `RevokedSessionMiddleware`
 * vérifie à chaque requête.
 *
 * Nullable, et laissée à `null` pour les comptes existants : personne n'est
 * déconnecté par la migration.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('sessions_valid_after').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sessions_valid_after')
    })
  }
}
