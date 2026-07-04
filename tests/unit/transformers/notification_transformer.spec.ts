import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { toRow } from '#transformers/notification_transformer'
import type Notification from '#models/notification'

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    userId: 10,
    organizationId: 2,
    type: 'maintenance_due',
    severity: 'warning',
    title: 'Oil change due',
    body: 'Your engine oil needs changing',
    actionUrl: '/boats/1/maintenance',
    metadata: { taskId: 42 },
    readAt: null,
    isRead: false,
    createdAt: DateTime.fromISO('2026-07-04T10:00:00.000Z'),
    ...overrides,
  } as unknown as Notification
}

test.group('toRow (notification_transformer)', () => {
  test('maps all fields on the happy path', ({ assert }) => {
    const n = makeNotification()
    const result = toRow(n)

    assert.equal(result.id, 1)
    assert.equal(result.type, 'maintenance_due')
    assert.equal(result.severity, 'warning')
    assert.equal(result.title, 'Oil change due')
    assert.equal(result.body, 'Your engine oil needs changing')
    assert.equal(result.actionUrl, '/boats/1/maintenance')
    assert.deepEqual(result.metadata, { taskId: 42 })
    assert.isNull(result.readAt)
    assert.isFalse(result.isRead)
    assert.isString(result.createdAt)
  })

  test('readAt present returns ISO string', ({ assert }) => {
    const readTime = DateTime.fromISO('2026-07-04T11:00:00.000Z')
    const n = makeNotification({ readAt: readTime, isRead: true })
    const result = toRow(n)
    assert.isString(result.readAt)
    assert.isTrue(result.isRead)
  })

  test('readAt null returns null', ({ assert }) => {
    const n = makeNotification({ readAt: null })
    const result = toRow(n)
    assert.isNull(result.readAt)
  })

  test('body null stays null', ({ assert }) => {
    const n = makeNotification({ body: null })
    const result = toRow(n)
    assert.isNull(result.body)
  })

  test('actionUrl null stays null', ({ assert }) => {
    const n = makeNotification({ actionUrl: null })
    const result = toRow(n)
    assert.isNull(result.actionUrl)
  })

  test('metadata null stays null', ({ assert }) => {
    const n = makeNotification({ metadata: null })
    const result = toRow(n)
    assert.isNull(result.metadata)
  })
})
