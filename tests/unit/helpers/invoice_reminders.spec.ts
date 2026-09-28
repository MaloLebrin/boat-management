import { test } from '@japa/runner'
import {
  canRemindInvoice,
  dueReminderTier,
  nextManualReminderTier,
  reachedReminderTier,
} from '#shared/helpers/invoice_reminders'

/** Paliers des relances de factures en retard (#878) : J+3, J+10, J+30. */
test.group('invoice reminders — tiers', () => {
  test('the tier reached follows the days since the due date', ({ assert }) => {
    const due = '2026-09-01'
    assert.equal(reachedReminderTier(due, '2026-09-01'), 0)
    assert.equal(reachedReminderTier(due, '2026-09-03'), 0)
    assert.equal(reachedReminderTier(due, '2026-09-04'), 1)
    assert.equal(reachedReminderTier(due, '2026-09-10'), 1)
    assert.equal(reachedReminderTier(due, '2026-09-11'), 2)
    assert.equal(reachedReminderTier(due, '2026-09-30'), 2)
    assert.equal(reachedReminderTier(due, '2026-10-01'), 3)
    assert.equal(reachedReminderTier(due, '2027-01-01'), 3)
  })

  test('days are counted across a DST change without drift', ({ assert }) => {
    // Passage à l'heure d'hiver le 25 octobre 2026.
    assert.equal(reachedReminderTier('2026-10-22', '2026-10-25'), 1)
  })

  test('the daily job sends the reached tier once, then waits for the next', ({ assert }) => {
    assert.isNull(dueReminderTier('2026-09-01', 0, '2026-09-02'))
    assert.equal(dueReminderTier('2026-09-01', 0, '2026-09-04'), 1)
    assert.isNull(dueReminderTier('2026-09-01', 1, '2026-09-05'))
    assert.equal(dueReminderTier('2026-09-01', 1, '2026-09-11'), 2)
    // Découverte tardive : directement la relance ferme.
    assert.equal(dueReminderTier('2026-09-01', 0, '2026-10-15'), 3)
    assert.isNull(dueReminderTier('2026-09-01', 3, '2026-12-01'))
    assert.isNull(dueReminderTier(null, 0, '2026-12-01'))
  })

  test('a manual reminder takes the next tier, capped at the last', ({ assert }) => {
    assert.equal(nextManualReminderTier(0), 1)
    assert.equal(nextManualReminderTier(2), 3)
    assert.equal(nextManualReminderTier(3), 3)
  })

  test('only an overdue invoice with reminders on can be reminded', ({ assert }) => {
    const base = { kind: 'invoice' as const, status: 'overdue' as const, remindersDisabled: false }
    assert.isTrue(canRemindInvoice(base))
    assert.isFalse(canRemindInvoice({ ...base, remindersDisabled: true }))
    assert.isFalse(canRemindInvoice({ ...base, status: 'sent' }))
    assert.isFalse(canRemindInvoice({ ...base, status: 'paid' }))
    assert.isFalse(canRemindInvoice({ ...base, status: 'credited' }))
    assert.isFalse(canRemindInvoice({ ...base, kind: 'quote' }))
    assert.isFalse(canRemindInvoice({ ...base, kind: 'credit_note' }))
  })
})
