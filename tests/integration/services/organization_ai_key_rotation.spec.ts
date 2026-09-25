import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import encryption from '@adonisjs/core/services/encryption'
import DataEncryptionService from '#services/data_encryption_service'
import OrganizationAiKeyService from '#services/organization_ai_key_service'
import OrganizationAiKey from '#models/organization_ai_key'
import { OrganizationFactory } from '#database/factories/organization_factory'

/**
 * Rechiffrement des clés BYOK (#786) — ce que fait `node ace encryption:rotate`.
 * Suite `integration` : transaction globale, pas de `truncateDb`. Le rapport
 * compte **toutes** les lignes de la table : on la vide (DELETE, pas TRUNCATE)
 * avant chaque scénario pour que les compteurs ne dépendent pas des tests
 * voisins.
 */
async function seedKeys() {
  await OrganizationAiKey.query().delete()
  const org = await OrganizationFactory.create()
  const dataEncryption = new DataEncryptionService()

  const legacy = await OrganizationAiKey.create({
    organizationId: org.id,
    provider: 'mistral',
    // Écrite avant #786 : encrypteur par défaut, APP_KEY.
    apiKeyEncrypted: encryption.encrypt('sk-mistral-legacy'),
  })
  const current = await OrganizationAiKey.create({
    organizationId: org.id,
    provider: 'anthropic',
    apiKeyEncrypted: dataEncryption.encrypt('sk-ant-current'),
  })
  const garbage = await OrganizationAiKey.create({
    organizationId: org.id,
    provider: 'openai',
    apiKeyEncrypted: 'data.not.really.encrypted',
  })

  return { org, legacy, current, garbage, dataEncryption }
}

test.group('OrganizationAiKeyService.reencryptAll', () => {
  test('re-encrypts every readable key with the current key and reports the rest', async ({
    assert,
  }) => {
    const { legacy, current, garbage, dataEncryption } = await seedKeys()
    const service = await app.container.make(OrganizationAiKeyService)

    const report = await service.reencryptAll()

    assert.deepEqual(report, {
      dryRun: false,
      total: 3,
      reencrypted: 2,
      fromAppKey: 1,
      undecryptable: 1,
    })

    await legacy.refresh()
    assert.isTrue(dataEncryption.isCurrent(legacy.apiKeyEncrypted))
    assert.equal(dataEncryption.decrypt(legacy.apiKeyEncrypted)?.plainText, 'sk-mistral-legacy')
    // Plus lisible par APP_KEY : le découplage est effectif.
    assert.isNull(encryption.decrypt(legacy.apiKeyEncrypted))

    await current.refresh()
    assert.equal(dataEncryption.decrypt(current.apiKeyEncrypted)?.plainText, 'sk-ant-current')

    await garbage.refresh()
    assert.equal(garbage.apiKeyEncrypted, 'data.not.really.encrypted')
  })

  test('is idempotent: a second run finds nothing left on APP_KEY', async ({ assert }) => {
    await seedKeys()
    const service = await app.container.make(OrganizationAiKeyService)

    await service.reencryptAll()
    const second = await service.reencryptAll()

    assert.equal(second.reencrypted, 2)
    assert.equal(second.fromAppKey, 0)
    assert.equal(second.undecryptable, 1)
  })

  test('dry run reports the same numbers without writing anything', async ({ assert }) => {
    const { legacy, current, garbage } = await seedKeys()
    const before = [legacy, current, garbage].map((key) => key.apiKeyEncrypted)
    const service = await app.container.make(OrganizationAiKeyService)

    const report = await service.reencryptAll({ dryRun: true })

    assert.deepEqual(report, {
      dryRun: true,
      total: 3,
      reencrypted: 2,
      fromAppKey: 1,
      undecryptable: 1,
    })
    for (const [index, key] of [legacy, current, garbage].entries()) {
      await key.refresh()
      assert.equal(key.apiKeyEncrypted, before[index])
    }
  })

  test('the ace command exits with 1 when a key is undecryptable, 0 otherwise', async ({
    assert,
  }) => {
    const { garbage } = await seedKeys()
    const ace = await app.container.make('ace')

    const failing = await ace.exec('encryption:rotate', ['--dry-run'])
    assert.equal(failing.exitCode, 1)

    await garbage.delete()
    const passing = await ace.exec('encryption:rotate', [])
    assert.equal(passing.exitCode, 0)
  })
})
