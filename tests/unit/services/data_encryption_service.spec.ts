import { test } from '@japa/runner'
import { Encryption } from '@adonisjs/core/encryption'
import { AES256GCM } from '@adonisjs/core/encryption/drivers/aes_256_gcm'
import DataEncryptionService from '#services/data_encryption_service'

/**
 * Chiffrement au repos et fenêtre de rotation (#786).
 *
 * Les encrypteurs sont construits en dur : l'environnement fixe
 * `ENCRYPTION_KEY` au boot, on ne peut pas le faire varier dans un test. Les
 * clés font 32+ caractères (le driver refuse en dessous de 16).
 */
const APP_KEY = 'app-key-legacy-0123456789abcdefghij'
const OLD_KEY = 'encryption-key-v1-0123456789abcdef'
const NEW_KEY = 'encryption-key-v2-0123456789abcdef'

function encrypter(id: string, keys: string[]): Encryption {
  // Même forme que `drivers.aes256gcm` de config/encryption.ts, résolue
  // immédiatement (le helper de core renvoie un provider paresseux).
  return new Encryption({ driver: (key) => new AES256GCM({ id, key }), keys })
}

/** Service tel qu'il était avant la rotation : une seule clé courante. */
function beforeRotation(): DataEncryptionService {
  return new DataEncryptionService({
    data: encrypter('data', [OLD_KEY]),
    legacy: encrypter('gcm', [APP_KEY]),
  })
}

/** Pendant la fenêtre : nouvelle clé courante, ancienne en `_PREVIOUS`. */
function duringRotation(): DataEncryptionService {
  return new DataEncryptionService({
    data: encrypter('data', [NEW_KEY, OLD_KEY]),
    legacy: encrypter('gcm', [APP_KEY]),
  })
}

/** Après : `_PREVIOUS` retirée. */
function afterRotation(): DataEncryptionService {
  return new DataEncryptionService({
    data: encrypter('data', [NEW_KEY]),
    legacy: encrypter('gcm', [APP_KEY]),
  })
}

test.group('DataEncryptionService (unit)', () => {
  test('encrypt produces a value prefixed by the data encrypter id, without the clear text', ({
    assert,
  }) => {
    const service = beforeRotation()
    const encrypted = service.encrypt('sk-secret-value')

    assert.isTrue(encrypted.startsWith('data.'))
    assert.notInclude(encrypted, 'sk-secret-value')
    assert.isTrue(service.isCurrent(encrypted))
  })

  test('a value encrypted with the previous key stays readable during the rotation window', ({
    assert,
  }) => {
    const encrypted = beforeRotation().encrypt('sk-secret-value')

    assert.deepEqual(duringRotation().decrypt(encrypted), {
      plainText: 'sk-secret-value',
      keyring: 'data',
    })
  })

  test('once the previous key is removed, the old value is no longer readable', ({ assert }) => {
    const encrypted = beforeRotation().encrypt('sk-secret-value')

    assert.isNull(afterRotation().decrypt(encrypted))
  })

  test('encrypt always uses the current (first) key of the keyring', ({ assert }) => {
    const encrypted = duringRotation().encrypt('sk-secret-value')

    // Lisible sans l'ancienne clé : c'est bien la nouvelle qui a chiffré.
    assert.equal(afterRotation().decrypt(encrypted)?.plainText, 'sk-secret-value')
  })

  test('a value from the APP_KEY era is decrypted through the legacy encrypter and flagged', ({
    assert,
  }) => {
    const legacyValue = encrypter('gcm', [APP_KEY]).encrypt('sk-legacy-value')
    const service = duringRotation()

    assert.deepEqual(service.decrypt(legacyValue), {
      plainText: 'sk-legacy-value',
      keyring: 'app_key',
    })
    assert.isFalse(service.isCurrent(legacyValue))
  })

  test('the legacy encrypter never accepts a data-prefixed value, even with the same key', ({
    assert,
  }) => {
    // L'id de l'encrypteur est embarqué et vérifié : partager une clé entre
    // `gcm` et `data` ne créerait pas de passerelle.
    const encrypted = encrypter('data', [APP_KEY]).encrypt('sk-secret-value')

    assert.isNull(encrypter('gcm', [APP_KEY]).decrypt(encrypted))
  })

  test('a corrupted or foreign value yields null', ({ assert }) => {
    const service = duringRotation()

    assert.isNull(service.decrypt('not-an-encrypted-value'))
    assert.isNull(service.decrypt('data.corrupted.iv.tag'))
    assert.isNull(service.decrypt(''))
  })

  test('the default construction uses the application encrypters', ({ assert }) => {
    // Sans paramètre (ce que fait le container), le service s'appuie sur
    // config/encryption.ts : ENCRYPTION_KEY de l'environnement de test.
    const service = new DataEncryptionService()
    const encrypted = service.encrypt('sk-secret-value')

    assert.isTrue(service.isCurrent(encrypted))
    assert.deepEqual(service.decrypt(encrypted), {
      plainText: 'sk-secret-value',
      keyring: 'data',
    })
  })
})
