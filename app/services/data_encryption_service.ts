import type { DecryptedSecret } from '#shared/types/encryption'
import encryption from '@adonisjs/core/services/encryption'
import type { Encryption } from '@adonisjs/core/encryption'

/** Préfixe (`id` de l'encrypteur) des valeurs chiffrées avec `ENCRYPTION_KEY`. */
export const DATA_ENCRYPTER_ID = 'data'

export interface DataEncrypters {
  /** Encrypteur `data` : `ENCRYPTION_KEY` puis `ENCRYPTION_KEY_PREVIOUS`. */
  data: Encryption
  /** Encrypteur par défaut (`APP_KEY`) : lecture seule, valeurs héritées d'avant #786. */
  legacy: Encryption
}

/**
 * Chiffrement au repos des secrets applicatifs (#786) — clés API BYOK
 * aujourd'hui, tout secret stocké en base demain.
 *
 * Chiffre toujours avec la clé courante d'`ENCRYPTION_KEY`. Déchiffre en
 * cascade : trousseau `data` (clé courante puis précédente, natif au driver),
 * puis encrypteur par défaut (`APP_KEY`) pour les valeurs écrites avant que la
 * clé dédiée n'existe. Le trousseau qui a réussi est rendu à l'appelant : c'est
 * ce qui permet à `encryption:rotate` de compter ce qui reste à rechiffrer, et à
 * `resolveActiveKey` de signaler une valeur encore couplée à `APP_KEY`.
 *
 * Les encrypteurs sont injectables (tests : simuler une ancienne et une
 * nouvelle clé sans toucher à l'environnement) ; par défaut ce sont ceux de
 * `config/encryption.ts`.
 */
export default class DataEncryptionService {
  #encrypters: DataEncrypters

  // Valeur par défaut (et non paramètre optionnel) : le container instancie
  // la classe sans argument et vérifie `constructor.length`, qui ne compte
  // que les paramètres sans défaut.
  constructor(encrypters: DataEncrypters = DataEncryptionService.applicationEncrypters()) {
    this.#encrypters = encrypters
  }

  /** Les encrypteurs de `config/encryption.ts`. */
  static applicationEncrypters(): DataEncrypters {
    return { data: encryption.use('data'), legacy: encryption.use('gcm') }
  }

  /** Chiffre avec la clé courante — le résultat est préfixé `data.`. */
  encrypt(plainText: string): string {
    return this.#encrypters.data.encrypt(plainText)
  }

  /** `null` si aucune clé (courante, précédente, `APP_KEY`) ne déchiffre la valeur. */
  decrypt(value: string): DecryptedSecret | null {
    const fromData = this.#encrypters.data.decrypt<string>(value)
    if (fromData !== null) return { plainText: fromData, keyring: 'data' }

    const fromAppKey = this.#encrypters.legacy.decrypt<string>(value)
    if (fromAppKey !== null) return { plainText: fromAppKey, keyring: 'app_key' }

    return null
  }

  /**
   * Vrai si la valeur a été produite par l'encrypteur `data` — sans dire par
   * quelle clé du trousseau (courante ou précédente) : après une rotation, tout
   * est rechiffré, on ne cherche pas à distinguer.
   */
  isCurrent(value: string): boolean {
    return value.startsWith(`${DATA_ENCRYPTER_ID}.`)
  }
}
