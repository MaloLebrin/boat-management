import { test } from '@japa/runner'
import { resolveSharedCurrentPlan } from '#middleware/inertia_middleware'

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
