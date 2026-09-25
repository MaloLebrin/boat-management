import env from '#start/env'
import { EncryptionKeyReusesAppKeyError } from '#exceptions/encryption_errors'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

/**
 * Deux encrypteurs, deux clés (#786) :
 *
 * - `gcm` (défaut) dérive d'`APP_KEY` : cookies, sessions, remember-me. C'est
 *   le framework qui s'en sert — faire tourner `APP_KEY` déconnecte tout le
 *   monde, rien de plus ;
 * - `data` dérive d'`ENCRYPTION_KEY` : les données chiffrées au repos (clés API
 *   BYOK). Son trousseau accepte une clé précédente le temps d'une rotation —
 *   la première clé chiffre, toutes déchiffrent (`@boringnode/encryption`).
 *
 * L'`id` de l'encrypteur est embarqué dans chaque chiffré et vérifié au
 * déchiffrement : `gcm.…` ne sera jamais accepté par `data`, et inversement.
 * C'est ce préfixe qui distingue une valeur héritée de l'ère `APP_KEY`.
 */
const appKey = env.get('APP_KEY')
const encryptionKey = env.get('ENCRYPTION_KEY')
const previousEncryptionKey = env.get('ENCRYPTION_KEY_PREVIOUS')

if (encryptionKey.release() === appKey.release()) {
  throw new EncryptionKeyReusesAppKeyError()
}

const encryptionConfig = defineConfig({
  /**
   * Default encryption driver used by the application.
   */
  default: 'gcm',

  list: {
    gcm: drivers.aes256gcm({
      keys: [appKey],
      id: 'gcm',
    }),

    data: drivers.aes256gcm({
      keys: previousEncryptionKey ? [encryptionKey, previousEncryptionKey] : [encryptionKey],
      id: 'data',
    }),
  },
})

export default encryptionConfig

/**
 * Inferring types for the list of encryptors you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  export interface EncryptorsList extends InferEncryptors<typeof encryptionConfig> {}
}
