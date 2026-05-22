import { test } from '@japa/runner'
import { resolveSharedCurrentPlan } from '#middleware/inertia_middleware'

test.group('resolveSharedCurrentPlan', () => {
  test('returns null when user is missing (e.g. after logout)', async ({ assert }) => {
    assert.isNull(await resolveSharedCurrentPlan(undefined))
  })

  test('returns null when user has no organization', async ({ assert }) => {
    assert.isNull(
      await resolveSharedCurrentPlan({ organizationId: null, load: async () => {} } as any)
    )
  })
})
