import { BoatNotFoundError } from '#exceptions/boat_errors'
import type Boat from '#models/boat'
import type User from '#models/user'
import { DateTime } from 'luxon'

export function toDateOrNull(value: Date | string | DateTime | null | undefined): DateTime | null {
  if (value === null || value === undefined) return null
  if (DateTime.isDateTime(value)) return value
  if (value instanceof Date) return DateTime.fromJSDate(value)
  return DateTime.fromISO(String(value))
}

export function assertBoatInUserOrg(user: User, boat: Boat): void {
  if (user.organizationId === null || user.organizationId !== boat.organizationId) {
    throw new BoatNotFoundError()
  }
}
