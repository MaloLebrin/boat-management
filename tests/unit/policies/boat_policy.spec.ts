import { test } from '@japa/runner'
import BoatPolicy from '#policies/boat_policy'

test.group('BoatPolicy (unit)', () => {
  test('deny cross-organization access', async ({ assert }) => {
    const user = { organizationId: 2 } as any
    const boat = { organizationId: 1 } as any

    const policy = new BoatPolicy()
    assert.isFalse(await policy.view(user, boat))
  })
})
