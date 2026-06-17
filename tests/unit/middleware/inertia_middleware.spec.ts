import { test } from '@japa/runner'
import { resolveSharedCurrentPlan, resolveSharedBranding } from '#middleware/inertia_middleware'

test.group('resolveSharedCurrentPlan', () => {
  test('returns undefined when user is missing (e.g. after logout)', async ({ assert }) => {
    assert.isUndefined(await resolveSharedCurrentPlan(undefined))
  })

  test('returns undefined when user has no organization', async ({ assert }) => {
    assert.isUndefined(
      await resolveSharedCurrentPlan({ organizationId: null, load: async () => {} } as any)
    )
  })
})

test.group('resolveSharedBranding', () => {
  test('returns undefined when user is missing', async ({ assert }) => {
    assert.isUndefined(await resolveSharedBranding(undefined))
  })

  test('returns undefined when user has no organization', async ({ assert }) => {
    assert.isUndefined(
      await resolveSharedBranding({ organizationId: null, load: async () => {} } as any)
    )
  })

  test('returns undefined for non-Enterprise plan', async ({ assert }) => {
    const user = {
      organizationId: 1,
      load: async () => {},
      organization: { plan: 'pro' },
    }
    assert.isUndefined(await resolveSharedBranding(user as any))
  })

  test('returns branding config for Enterprise plan', async ({ assert }) => {
    const user = {
      organizationId: 1,
      load: async () => {},
      organization: {
        plan: 'enterprise',
        logoUrl: 'https://cdn.example.com/logo.png',
        logoPublicId: 'orgs/logo',
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        appName: 'MyFleet',
      },
    }
    const result = await resolveSharedBranding(user as any)
    assert.deepEqual(result, {
      logoUrl: 'https://cdn.example.com/logo.png',
      logoPublicId: 'orgs/logo',
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      appName: 'MyFleet',
    })
  })
})
