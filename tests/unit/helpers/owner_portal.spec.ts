import { test } from '@japa/runner'
import {
  OWNER_APPROVAL_THRESHOLD_EUR,
  ownerRequestStatusOf,
  requiresOwnerApproval,
} from '#shared/constants/owner_portal'

test.group('Owner portal helpers (#890)', () => {
  test('a request is received, planned, then done, as the owner sees it', ({ assert }) => {
    assert.equal(
      ownerRequestStatusOf({ status: 'open', dueAt: null, assigneeId: null }),
      'received'
    )
    assert.equal(
      ownerRequestStatusOf({ status: 'open', dueAt: '2026-11-01', assigneeId: null }),
      'planned'
    )
    assert.equal(ownerRequestStatusOf({ status: 'open', dueAt: null, assigneeId: 4 }), 'planned')
    assert.equal(ownerRequestStatusOf({ status: 'done', dueAt: null, assigneeId: 4 }), 'done')
  })

  test('the threshold itself asks the owner, a cent below does not', ({ assert }) => {
    assert.isTrue(requiresOwnerApproval(OWNER_APPROVAL_THRESHOLD_EUR))
    assert.isFalse(requiresOwnerApproval(OWNER_APPROVAL_THRESHOLD_EUR - 0.01))
    assert.isFalse(requiresOwnerApproval(null))
  })
})
