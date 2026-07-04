import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toOrganizationForFront } from '#transformers/organization_transformer'
import type Organization from '#models/organization'

function makeOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 1,
    name: 'Sailing Club',
    slug: 'sailing-club',
    plan: 'pro',
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    ...overrides,
  } as unknown as Organization
}

test.group('toOrganizationForFront', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const org = makeOrganization()
    const result = toOrganizationForFront(org)

    assert.equal(result.id, 1)
    assert.equal(result.name, 'Sailing Club')
    assert.equal(result.slug, 'sailing-club')
    assert.equal(result.plan, 'pro')
    assert.isString(result.createdAt)
  })

  test('createdAt is ISO string', ({ assert }) => {
    const org = makeOrganization()
    const result = toOrganizationForFront(org)
    assert.match(result.createdAt!, /^\d{4}-\d{2}-\d{2}T/)
  })

  test('plan is preserved as-is', ({ assert }) => {
    const org = makeOrganization({ plan: 'starter' as Organization['plan'] })
    const result = toOrganizationForFront(org)
    assert.equal(result.plan, 'starter')
  })
})
