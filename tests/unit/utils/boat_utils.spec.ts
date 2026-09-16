import { test } from '@japa/runner'
import { assertBoatInUserOrg } from '#utils/boat_utils'
import { BoatNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import type User from '#models/user'

class ReservationNotFoundError extends Error {}

const user = (organizationId: number | null) => ({ organizationId }) as User
const boat = (organizationId: number) => ({ organizationId }) as Boat

test.group('assertBoatInUserOrg (unit)', () => {
  test('passes when the boat belongs to the user organization', ({ assert }) => {
    assert.doesNotThrow(() => assertBoatInUserOrg(user(7), boat(7)))
  })

  test('throws BoatNotFoundError by default for a boat of another organization', ({ assert }) => {
    assert.throws(() => assertBoatInUserOrg(user(7), boat(8)), BoatNotFoundError)
  })

  test('throws BoatNotFoundError by default for a user without organization', ({ assert }) => {
    assert.throws(() => assertBoatInUserOrg(user(null), boat(8)), BoatNotFoundError)
  })

  test('throws the error built by the caller when one is provided', ({ assert }) => {
    assert.throws(
      () => assertBoatInUserOrg(user(7), boat(8), () => new ReservationNotFoundError()),
      ReservationNotFoundError
    )
  })

  test('does not build the custom error when the check passes', ({ assert }) => {
    let built = 0
    assertBoatInUserOrg(user(7), boat(7), () => {
      built++
      return new ReservationNotFoundError()
    })
    assert.equal(built, 0)
  })
})
