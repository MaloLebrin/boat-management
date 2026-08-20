import { test } from '@japa/runner'
import { ROLE_PERMISSIONS } from '#shared/types/permissions'
import type { Capability } from '#shared/types/permissions'

const ADMIN_ONLY: Capability[] = [
  'members.manage',
  'invitations.manage',
  'ai.configure',
  'branding.configure',
  'boats.delete',
  'clients.delete',
  'clients.anonymize',
  'crew.delete',
  'fuel_logs.delete',
  'equipmentActions.delete',
  'incidents.delete',
  'inspections.delete',
  'invoices.delete',
  'maintenance.delete',
  'mouillages.create',
  'mouillages.edit',
  'mouillages.delete',
  'navigation_logs.delete',
  'ports.create',
  'ports.edit',
  'ports.delete',
  'pricing_seasons.delete',
  'rentalContracts.delete',
  'simulator.manage_leads',
  'spots.delete',
  'subscription.manage',
]

const SHARED: Capability[] = [
  'members.view',
  'invitations.view',
  'audit_log.view',
  'boats.view',
  'boats.create',
  'boats.edit',
  'boats.manage',
  'boats.reservations.delete',
  'clients.create',
  'clients.update',
  'crew.create',
  'crew.update',
  'fuel_logs.create',
  'equipmentActions.view',
  'equipmentActions.create',
  'equipmentActions.edit',
  'incidents.view',
  'incidents.create',
  'incidents.edit',
  'inspections.view',
  'inspections.create',
  'inspections.edit',
  'invoices.view',
  'invoices.create',
  'invoices.update',
  'maintenance.view',
  'maintenance.create',
  'maintenance.edit',
  'mouillages.view',
  'navigation_logs.create',
  'navigation_logs.update',
  'ports.view',
  'pricing_seasons.create',
  'pricing_seasons.update',
  'rentalContracts.view',
  'rentalContracts.create',
  'rentalContracts.edit',
  'spots.view',
  'spots.create',
  'spots.edit',
  'subscription.view',
]

test.group('Permissions taxonomy (unit)', () => {
  test('member is a strict subset of admin', ({ assert }) => {
    const memberCaps = ROLE_PERMISSIONS.member
    const adminCaps = ROLE_PERMISSIONS.admin

    for (const cap of memberCaps) {
      assert.isTrue(adminCaps.has(cap), `admin should also have "${cap}"`)
    }
    assert.isBelow(memberCaps.size, adminCaps.size)
  })

  test('shared capabilities are granted to both roles', ({ assert }) => {
    for (const cap of SHARED) {
      assert.isTrue(ROLE_PERMISSIONS.admin.has(cap), `admin should have "${cap}"`)
      assert.isTrue(ROLE_PERMISSIONS.member.has(cap), `member should have "${cap}"`)
    }
  })

  test('admin-only capabilities are denied to member', ({ assert }) => {
    for (const cap of ADMIN_ONLY) {
      assert.isTrue(ROLE_PERMISSIONS.admin.has(cap), `admin should have "${cap}"`)
      assert.isFalse(ROLE_PERMISSIONS.member.has(cap), `member should not have "${cap}"`)
    }
  })

  test('taxonomy covers every capability exactly once', ({ assert }) => {
    const declared = new Set([...ADMIN_ONLY, ...SHARED])
    assert.equal(declared.size, ADMIN_ONLY.length + SHARED.length)
    assert.equal(declared.size, ROLE_PERMISSIONS.admin.size)
  })

  test('mechanic only has maintenance capabilities (view/create/edit)', ({ assert }) => {
    const mechanicCaps = ROLE_PERMISSIONS.mechanic
    const expected: Capability[] = ['maintenance.view', 'maintenance.create', 'maintenance.edit']

    assert.equal(mechanicCaps.size, expected.length)
    for (const cap of expected) {
      assert.isTrue(mechanicCaps.has(cap), `mechanic should have "${cap}"`)
    }
    assert.isFalse(mechanicCaps.has('maintenance.delete'))
    assert.isFalse(mechanicCaps.has('boats.view'))
    assert.isFalse(mechanicCaps.has('invoices.view'))
  })

  test('boat_owner has zero capabilities (self-service portal scopes by ownership, not by capability)', ({
    assert,
  }) => {
    // The boat_owner portal (/owner/boats/*) scopes data by ownership at the query
    // level (BoatOwnerService.getOwnedBoat), never via capabilities — granting any
    // staff capability here (boats.view, invoices.view...) would leak the full staff
    // pages (/boats/:id, /invoices) which expose far more than the portal's scope.
    assert.equal(ROLE_PERMISSIONS.boat_owner.size, 0)
  })
})
