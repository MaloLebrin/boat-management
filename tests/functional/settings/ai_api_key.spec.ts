import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import encryption from '@adonisjs/core/services/encryption'
import Organization from '#models/organization'
import OrganizationAiKey from '#models/organization_ai_key'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('AI API keys settings (BYOK multi-provider)', (group) => {
  group.each.setup(() => truncateDb())

  test('a key is stored encrypted per provider, never in clear text', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .put('/settings/ai/api-key/anthropic')
      .loginAs(user)
      .form({ aiApiKey: 'sk-ant-secret-key' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'AI API key saved.')

    const key = await OrganizationAiKey.query()
      .where('organizationId', user.organizationId!)
      .where('provider', 'anthropic')
      .firstOrFail()
    assert.notInclude(key.apiKeyEncrypted, 'sk-ant-secret-key')
    assert.equal(encryption.decrypt<string>(key.apiKeyEncrypted), 'sk-ant-secret-key')
  })

  test('saving a key again replaces it (one row per org/provider)', async ({ assert, client }) => {
    const user = await createAdminUser()

    await client
      .put('/settings/ai/api-key/openai')
      .loginAs(user)
      .form({ aiApiKey: 'sk-openai-first' })
      .redirects(0)
    await client
      .put('/settings/ai/api-key/openai')
      .loginAs(user)
      .form({ aiApiKey: 'sk-openai-second' })
      .redirects(0)

    const keys = await OrganizationAiKey.query()
      .where('organizationId', user.organizationId!)
      .where('provider', 'openai')
    assert.lengthOf(keys, 1)
    assert.equal(encryption.decrypt<string>(keys[0].apiKeyEncrypted), 'sk-openai-second')
  })

  test('an unknown provider does not match the route (404)', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client
      .put('/settings/ai/api-key/not-a-provider')
      .loginAs(user)
      .form({ aiApiKey: 'sk-whatever-key' })
      .redirects(0)

    response.assertStatus(404)
  })

  test('the settings page exposes only booleans, never the keys', async ({ assert, client }) => {
    const user = await createAdminUser()
    const key = await OrganizationAiKey.create({
      organizationId: user.organizationId!,
      provider: 'google',
      apiKeyEncrypted: encryption.encrypt('sk-gemini-secret-key'),
    })

    const page = await client.get('/settings/ai').loginAs(user).withInertia()

    page.assertStatus(200)
    const props = page.inertiaProps as Record<string, unknown>
    assert.deepEqual(props.configuredProviders, {
      mistral: false,
      anthropic: false,
      openai: false,
      google: true,
    })
    assert.isNull(props.aiProvider)
    assert.notInclude(JSON.stringify(props), 'sk-gemini-secret-key')
    assert.notInclude(JSON.stringify(props), key.apiKeyEncrypted)
  })

  test('selecting a provider without a key is refused', async ({ assert, client }) => {
    const user = await createAdminUser()

    const response = await client
      .put('/settings/ai/provider')
      .loginAs(user)
      .form({ aiProvider: 'anthropic' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Add an API key for this provider first.')
    const org = await Organization.findOrFail(user.organizationId!)
    assert.isNull(org.aiProvider)
  })

  test('selecting a provider with a key activates it', async ({ assert, client }) => {
    const user = await createAdminUser()
    await OrganizationAiKey.create({
      organizationId: user.organizationId!,
      provider: 'anthropic',
      apiKeyEncrypted: encryption.encrypt('sk-ant-secret-key'),
    })

    const response = await client
      .put('/settings/ai/provider')
      .loginAs(user)
      .form({ aiProvider: 'anthropic' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'AI provider updated.')
    const org = await Organization.findOrFail(user.organizationId!)
    assert.equal(org.aiProvider, 'anthropic')
  })

  test('switching provider resets a model override that belongs to another provider', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const org = await Organization.findOrFail(user.organizationId!)
    org.aiProvider = 'anthropic'
    org.aiModelOverride = 'claude-opus-5'
    await org.save()
    await OrganizationAiKey.create({
      organizationId: org.id,
      provider: 'anthropic',
      apiKeyEncrypted: encryption.encrypt('sk-ant-secret-key'),
    })

    // Retour au défaut app (mistral) : le modèle Claude ne s'applique plus.
    const response = await client
      .put('/settings/ai/provider')
      .loginAs(user)
      .form({ aiProvider: '' })
      .redirects(0)

    response.assertStatus(302)
    await org.refresh()
    assert.isNull(org.aiProvider)
    assert.isNull(org.aiModelOverride)
  })

  test('removing the active provider key falls back to the app default', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const org = await Organization.findOrFail(user.organizationId!)
    await OrganizationAiKey.create({
      organizationId: org.id,
      provider: 'mistral',
      apiKeyEncrypted: encryption.encrypt('sk-mistral-secret-key'),
    })
    org.aiProvider = 'mistral'
    await org.save()

    const response = await client.delete('/settings/ai/api-key/mistral').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'AI API key removed.')
    const keys = await OrganizationAiKey.query().where('organizationId', org.id)
    assert.lengthOf(keys, 0)
    await org.refresh()
    assert.isNull(org.aiProvider)
  })

  test('removing a non-active provider key keeps the active provider', async ({
    assert,
    client,
  }) => {
    const user = await createAdminUser()
    const org = await Organization.findOrFail(user.organizationId!)
    for (const provider of ['mistral', 'google'] as const) {
      await OrganizationAiKey.create({
        organizationId: org.id,
        provider,
        apiKeyEncrypted: encryption.encrypt(`sk-${provider}-secret-key`),
      })
    }
    org.aiProvider = 'google'
    await org.save()

    await client.delete('/settings/ai/api-key/mistral').loginAs(user).redirects(0)

    await org.refresh()
    assert.equal(org.aiProvider, 'google')
    const remaining = await OrganizationAiKey.query().where('organizationId', org.id)
    assert.lengthOf(remaining, 1)
    assert.equal(remaining[0].provider, 'google')
  })

  test('the pro plan reaches the AI settings page (BYOK is not enterprise-only)', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const page = await client.get('/settings/ai').loginAs(user).withInertia()
    page.assertStatus(200)
  })

  test('a starter plan is redirected to billing', async ({ assert, client }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId!,
      role: 'admin',
    })

    const response = await client
      .put('/settings/ai/api-key/mistral')
      .loginAs(user)
      .form({ aiApiKey: 'sk-mistral-secret-key' })
      .redirects(0)

    response.assertStatus(302)
    const keys = await OrganizationAiKey.query().where('organizationId', user.organizationId!)
    assert.lengthOf(keys, 0)
  })

  test('a non-admin member cannot manage the keys', async ({ assert, client }) => {
    const admin = await createAdminUser()
    const member = await UserFactory.merge({ organizationId: admin.organizationId }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: admin.organizationId!,
      role: 'member',
    })

    const response = await client
      .put('/settings/ai/api-key/mistral')
      .loginAs(member)
      .form({ aiApiKey: 'sk-mistral-secret-key' })
      .redirects(0)

    // Bouncer sur une soumission de formulaire : flash + redirect back, pas de 403.
    response.assertStatus(302)
    const keys = await OrganizationAiKey.query().where('organizationId', admin.organizationId!)
    assert.lengthOf(keys, 0)
  })
})
