/**
 * Chiffrement au repos (#786) — types de `DataEncryptionService` et de la
 * rotation des clés BYOK (`OrganizationAiKeyService.reencryptAll`).
 */

/**
 * Trousseau qui a réussi à déchiffrer une valeur :
 * - `data` : `ENCRYPTION_KEY` ou `ENCRYPTION_KEY_PREVIOUS` (état nominal) ;
 * - `app_key` : encrypteur par défaut (`APP_KEY`), valeur héritée d'avant #786
 *   — à rechiffrer via `node ace encryption:rotate`.
 */
export type DecryptionKeyring = 'data' | 'app_key'

export interface DecryptedSecret {
  plainText: string
  keyring: DecryptionKeyring
}

export interface AiKeyRotationOptions {
  /** Compte et journalise sans rien écrire. */
  dryRun?: boolean
}

export interface AiKeyRotationReport {
  dryRun: boolean
  /** Lignes parcourues. */
  total: number
  /** Lignes rechiffrées avec la clé courante (ou qui l'auraient été en `dryRun`). */
  reencrypted: number
  /** Parmi `reencrypted` : lignes qui étaient encore chiffrées avec `APP_KEY`. */
  fromAppKey: number
  /** Lignes qu'aucune clé ne déchiffre — laissées telles quelles. */
  undecryptable: number
}
