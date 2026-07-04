import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import NotificationService from '#services/notification_service'
import Notification from '#models/notification'
import { UserFactory } from '#database/factories/user_factory'
import { NotificationFactory } from '#database/factories/notification_factory'

test.group('NotificationService', () => {
  // ── create ───────────────────────────────────────────────────────────────

  test('create persiste une notification avec les valeurs par défaut', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new NotificationService()

    const notif = await svc.create({
      userId: user.id,
      organizationId: user.organizationId!,
      type: 'member.joined',
      title: 'Bienvenue',
    })

    assert.isNumber(notif.id)
    assert.equal(notif.severity, 'info')

    // Reload from DB to verify nullable columns are stored as NULL
    const persisted = await Notification.findOrFail(notif.id)
    assert.equal(persisted.userId, user.id)
    assert.equal(persisted.organizationId, user.organizationId!)
    assert.isNull(persisted.body)
    assert.isNull(persisted.actionUrl)
    assert.isNull(persisted.metadata)
    assert.isNull(persisted.readAt)
  })

  test('create persiste une notification avec une sévérité explicite', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new NotificationService()

    const notif = await svc.create({
      userId: user.id,
      organizationId: user.organizationId!,
      type: 'maintenance.overdue',
      severity: 'warning',
      title: 'Maintenance en retard',
      body: 'Inspection moteur à effectuer',
      actionUrl: '/boats/1',
      metadata: { boatId: 1 },
    })

    assert.equal(notif.severity, 'warning')
    assert.equal(notif.body, 'Inspection moteur à effectuer')
    assert.equal(notif.actionUrl, '/boats/1')
    assert.deepEqual(notif.metadata, { boatId: 1 })
  })

  // ── getUnreadCount ───────────────────────────────────────────────────────

  test('getUnreadCount retourne 0 quand aucune notification', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new NotificationService()

    const count = await svc.getUnreadCount(user.id)

    assert.equal(count, 0)
  })

  test('getUnreadCount compte uniquement les notifications non lues de cet utilisateur', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const other = await UserFactory.with('organization').create()
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).createMany(3)
    // Une notification lue pour user
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
      readAt: DateTime.now(),
    }).create()
    // Une notification non lue pour un autre utilisateur
    await NotificationFactory.merge({
      userId: other.id,
      organizationId: other.organizationId!,
    }).create()
    const svc = new NotificationService()

    const count = await svc.getUnreadCount(user.id)

    assert.equal(count, 3)
  })

  // ── getRecentUnread ──────────────────────────────────────────────────────

  test('getRecentUnread respecte la limite et ne retourne que les non lues', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).createMany(5)
    // Une notification lue (ne doit pas apparaître)
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
      readAt: DateTime.now(),
    }).create()
    const svc = new NotificationService()

    const recent = await svc.getRecentUnread(user.id, 3)

    assert.lengthOf(recent, 3)
    for (const n of recent) {
      assert.isNull(n.readAt)
    }
  })

  test('getRecentUnread retourne les notifications ordonnées par createdAt desc', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).createMany(3)
    const svc = new NotificationService()

    const recent = await svc.getRecentUnread(user.id, 10)

    for (let i = 1; i < recent.length; i++) {
      assert.isTrue(recent[i - 1].createdAt >= recent[i].createdAt)
    }
  })

  // ── markRead ─────────────────────────────────────────────────────────────

  test('markRead marque une notification comme lue', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const notif = await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).create()
    const svc = new NotificationService()

    await svc.markRead(user.id, notif.id)

    const updated = await Notification.findOrFail(notif.id)
    assert.isNotNull(updated.readAt)
  })

  test('markRead est idempotent quand la notification est déjà lue', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const notif = await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).create()
    const svc = new NotificationService()

    await svc.markRead(user.id, notif.id)
    const firstNotif = await Notification.findOrFail(notif.id)
    const firstReadAt = firstNotif.readAt

    await svc.markRead(user.id, notif.id)
    const secondNotif = await Notification.findOrFail(notif.id)
    const secondReadAt = secondNotif.readAt

    assert.equal(firstReadAt?.toISO(), secondReadAt?.toISO())
  })

  test('markRead throw quand la notification appartient à un autre utilisateur', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const other = await UserFactory.with('organization').create()
    const notif = await NotificationFactory.merge({
      userId: other.id,
      organizationId: other.organizationId!,
    }).create()
    const svc = new NotificationService()

    await assert.rejects(() => svc.markRead(user.id, notif.id))
  })

  // ── markAllRead ──────────────────────────────────────────────────────────

  test("markAllRead marque toutes les notifications non lues de l'utilisateur", async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).createMany(3)
    const svc = new NotificationService()

    await svc.markAllRead(user.id)

    const unread = await Notification.query().where('userId', user.id).whereNull('readAt')
    assert.lengthOf(unread, 0)
  })

  test("markAllRead ne touche pas les notifications d'un autre utilisateur", async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const other = await UserFactory.with('organization').create()
    await NotificationFactory.merge({
      userId: other.id,
      organizationId: other.organizationId!,
    }).createMany(2)
    const svc = new NotificationService()

    await svc.markAllRead(user.id)

    const otherUnread = await Notification.query().where('userId', other.id).whereNull('readAt')
    assert.lengthOf(otherUnread, 2)
  })

  // ── destroy ──────────────────────────────────────────────────────────────

  test("destroy supprime la notification de l'utilisateur", async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const notif = await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).create()
    const svc = new NotificationService()

    await svc.destroy(user.id, notif.id)

    const found = await Notification.find(notif.id)
    assert.isNull(found)
  })

  test('destroy est no-op pour une notification appartenant à un autre utilisateur', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const other = await UserFactory.with('organization').create()
    const notif = await NotificationFactory.merge({
      userId: other.id,
      organizationId: other.organizationId!,
    }).create()
    const svc = new NotificationService()

    await svc.destroy(user.id, notif.id)

    const found = await Notification.find(notif.id)
    assert.isNotNull(found)
  })

  // ── listForUser ──────────────────────────────────────────────────────────

  test('listForUser retourne une page paginée des notifications', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).createMany(5)
    const svc = new NotificationService()

    const page = await svc.listForUser(user.id, 1, 3)

    assert.equal(page.total, 5)
    assert.equal(page.perPage, 3)
    assert.equal(page.currentPage, 1)
    assert.lengthOf(page.all(), 3)
  })

  test('listForUser retourne uniquement les notifications de cet utilisateur', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const other = await UserFactory.with('organization').create()
    await NotificationFactory.merge({
      userId: user.id,
      organizationId: user.organizationId!,
    }).createMany(2)
    await NotificationFactory.merge({
      userId: other.id,
      organizationId: other.organizationId!,
    }).createMany(3)
    const svc = new NotificationService()

    const page = await svc.listForUser(user.id, 1, 20)

    assert.equal(page.total, 2)
  })
})
