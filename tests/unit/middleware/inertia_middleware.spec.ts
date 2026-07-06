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

  test('returns undefined when organizationId is set but the relation fails to load (e.g. a deleted org)', async ({
    assert,
  }) => {
    const user = { organizationId: 1, load: async () => {}, organization: null }
    assert.isUndefined(await resolveSharedCurrentPlan(user as any))
  })
})

const stubBrandingService = {
  toSharedProps: (org: any) => ({
    logoUrl: org.logoUrl,
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    appName: org.appName,
  }),
}

test.group('resolveSharedBranding', () => {
  test('returns undefined when user is missing', async ({ assert }) => {
    assert.isUndefined(await resolveSharedBranding(undefined, stubBrandingService))
  })

  test('returns undefined when user has no organization', async ({ assert }) => {
    assert.isUndefined(
      await resolveSharedBranding(
        { organizationId: null, load: async () => {} } as any,
        stubBrandingService
      )
    )
  })

  test('returns undefined for non-Enterprise plan', async ({ assert }) => {
    const user = {
      organizationId: 1,
      load: async () => {},
      organization: { plan: 'pro' },
    }
    assert.isUndefined(await resolveSharedBranding(user as any, stubBrandingService))
  })

  test('returns branding shared props for Enterprise plan', async ({ assert }) => {
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
    const result = await resolveSharedBranding(user as any, stubBrandingService)
    assert.deepEqual(result, {
      logoUrl: 'https://cdn.example.com/logo.png',
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      appName: 'MyFleet',
    })
  })
})
