import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import encryption from '@adonisjs/core/services/encryption'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'

test.group('AI API key settings (BYOK)', (group) => {
  group.each.setup(() => truncateDb())

  test('the key is stored encrypted, never in clear text', async ({ assert, client }) => {
    const user = await createAdminUser()

    const response = await client
      .put('/settings/ai/api-key')
      .loginAs(user)
      .form({ aiApiKey: 'sk-mistral-secret-key' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'AI API key saved.')

    const org = await Organization.findOrFail(user.organizationId!)
    assert.isNotNull(org.aiApiKeyEncrypted)
    assert.notInclude(org.aiApiKeyEncrypted!, 'sk-mistral-secret-key')
    assert.equal(encryption.decrypt<string>(org.aiApiKeyEncrypted!), 'sk-mistral-secret-key')
  })

  test('the settings page exposes only a boolean, never the key', async ({ assert, client }) => {
    const user = await createAdminUser()
    const org = await Organization.findOrFail(user.organizationId!)
    org.aiApiKeyEncrypted = encryption.encrypt('sk-mistral-secret-key')
    await org.save()

    const page = await client.get('/settings/ai').loginAs(user).withInertia()

    page.assertStatus(200)
    const props = page.inertiaProps as Record<string, unknown>
    assert.isTrue(props.hasCustomApiKey)
    assert.notInclude(JSON.stringify(props), 'sk-mistral-secret-key')
    assert.notInclude(JSON.stringify(props), org.aiApiKeyEncrypted!)
  })

  test('the pro plan reaches the AI settings page (BYOK is not enterprise-only)', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const page = await client.get('/settings/ai').loginAs(user).withInertia()
    page.assertStatus(200)
  })

  test('removing the key clears it', async ({ assert, client }) => {
    const user = await createAdminUser()
    const org = await Organization.findOrFail(user.organizationId!)
    org.aiApiKeyEncrypted = encryption.encrypt('sk-mistral-secret-key')
    await org.save()

    const response = await client.delete('/settings/ai/api-key').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'AI API key removed.')
    await org.refresh()
    assert.isNull(org.aiApiKeyEncrypted)
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
      .put('/settings/ai/api-key')
      .loginAs(user)
      .form({ aiApiKey: 'sk-mistral-secret-key' })
      .redirects(0)

    response.assertStatus(302)
    const org = await Organization.findOrFail(user.organizationId!)
    assert.isNull(org.aiApiKeyEncrypted)
  })

  test('a non-admin member cannot manage the key', async ({ assert, client }) => {
    const admin = await createAdminUser()
    const member = await UserFactory.merge({ organizationId: admin.organizationId }).create()
    await OrganizationMembership.create({
      userId: member.id,
      organizationId: admin.organizationId!,
      role: 'member',
    })

    const response = await client
      .put('/settings/ai/api-key')
      .loginAs(member)
      .form({ aiApiKey: 'sk-mistral-secret-key' })
      .redirects(0)

    // Bouncer sur une soumission de formulaire : flash + redirect back, pas de 403.
    response.assertStatus(302)
    const org = await Organization.findOrFail(admin.organizationId!)
    assert.isNull(org.aiApiKeyEncrypted)
  })
})
