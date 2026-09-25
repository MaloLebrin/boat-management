/**
 * `ENCRYPTION_KEY` porte la même valeur qu'`APP_KEY` (#786) : le découplage
 * du chiffrement au repos et de la clé applicative serait fictif — faire
 * tourner l'une casserait l'autre. Levée au chargement de `config/encryption.ts`,
 * donc l'app refuse de démarrer.
 */
export class EncryptionKeyReusesAppKeyError extends Error {
  name = 'EncryptionKeyReusesAppKeyError'
  status = 500
  code = 'E_ENCRYPTION_KEY_REUSES_APP_KEY'

  constructor() {
    super(
      'ENCRYPTION_KEY must differ from APP_KEY: generate a dedicated key (openssl rand -base64 32), see docs/dev/encryption-keys.md'
    )
  }
}
