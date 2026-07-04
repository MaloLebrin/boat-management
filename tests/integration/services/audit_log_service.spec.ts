import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import AuditLogService from '#services/audit_log_service'
import AuditLog from '#models/audit_log'
import Organization from '#models/organization'
import { UserFactory } from '#database/factories/user_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'

test.group('AuditLogService', () => {
  // ── log ──────────────────────────────────────────────────────────────────

  test('log persiste une entrée avec les valeurs par défaut pour les champs optionnels', async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new AuditLogService()

    await svc.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'login',
    })

    const entry = await AuditLog.query()
      .where('organizationId', user.organizationId!)
      .where('userId', user.id)
      .where('action', 'login')
      .firstOrFail()

    assert.isNumber(entry.id)
    assert.equal(entry.action, 'login')
    assert.isNull(entry.entityType)
    assert.isNull(entry.entityId)
    assert.isNull(entry.metadata)
  })

  test('log persiste tous les champs quand ils sont fournis', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new AuditLogService()

    await svc.log({
      organizationId: user.organizationId!,
      userId: user.id,
      action: 'boat.create',
      entityType: 'boat',
      entityId: 42,
      metadata: { name: 'Mon Bateau' },
    })

    const entry = await AuditLog.query()
      .where('organizationId', user.organizationId!)
      .where('action', 'boat.create')
      .firstOrFail()

    assert.equal(entry.entityType, 'boat')
    assert.equal(entry.entityId, 42)
    assert.deepEqual(entry.metadata, { name: 'Mon Bateau' })
  })

  test('log accepte userId null', async ({ assert }) => {
    const org = await OrganizationFactory.create()
    const svc = new AuditLogService()

    await svc.log({
      organizationId: org.id,
      userId: null,
      action: 'login',
    })

    const entry = await AuditLog.query().where('organizationId', org.id).firstOrFail()

    assert.isNull(entry.userId)
  })

  // ── list ─────────────────────────────────────────────────────────────────

  test("list retourne les entrées de l'organisation, du plus récent au plus ancien", async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new AuditLogService()
    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'login' })
    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'boat.create' })

    const result = await svc.list(user.organizationId!, {})

    assert.isAtLeast(result.data.length, 2)
    assert.isNumber(result.meta.total)
    assert.equal(result.meta.perPage, 25)
    assert.equal(result.meta.currentPage, 1)
    // Ordre décroissant par createdAt
    for (let i = 1; i < result.data.length; i++) {
      assert.isTrue(result.data[i - 1].createdAt >= result.data[i].createdAt)
    }
  })

  test('list filtre par userId', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const other = await UserFactory.merge({ organizationId: user.organizationId! }).create()
    const svc = new AuditLogService()
    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'login' })
    await svc.log({
      organizationId: user.organizationId!,
      userId: other.id,
      action: 'boat.create',
    })

    const result = await svc.list(user.organizationId!, { userId: user.id })

    assert.isTrue(result.data.every((e) => e.userId === user.id))
    assert.equal(result.meta.total, 1)
  })

  test('list filtre par action', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new AuditLogService()
    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'login' })
    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'logout' })
    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'boat.delete' })

    const result = await svc.list(user.organizationId!, { action: 'login' })

    assert.equal(result.meta.total, 1)
    assert.equal(result.data[0].action, 'login')
  })

  test('list filtre par plage de dates (from/to)', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new AuditLogService()

    const yesterday = DateTime.now().minus({ days: 1 })
    const tomorrow = DateTime.now().plus({ days: 1 })

    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'login' })

    const result = await svc.list(user.organizationId!, {
      from: yesterday.toISO()!,
      to: tomorrow.toISO()!,
    })

    assert.isAtLeast(result.meta.total, 1)
    assert.isTrue(result.data.every((e) => e.createdAt >= yesterday.toISO()!))
  })

  test("list précharge l'utilisateur (userFullName et userEmail renseignés)", async ({
    assert,
  }) => {
    const user = await UserFactory.with('organization').create()
    const svc = new AuditLogService()
    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'login' })

    const result = await svc.list(user.organizationId!, {})

    const entry = result.data.find((e) => e.userId === user.id)
    assert.isDefined(entry)
    assert.isNotNull(entry!.userFullName)
    assert.isNotNull(entry!.userEmail)
    assert.equal(entry!.userEmail, user.email)
  })

  test('list retourne uniquement les entrées de cette organisation', async ({ assert }) => {
    const user = await UserFactory.with('organization').create()
    const otherOrg = await OrganizationFactory.create()
    const svc = new AuditLogService()
    await svc.log({ organizationId: user.organizationId!, userId: user.id, action: 'login' })
    await svc.log({ organizationId: otherOrg.id, userId: null, action: 'login' })

    const result = await svc.list(user.organizationId!, {})

    assert.isTrue(result.data.every((e) => e.userId === user.id || e.userId === null))
    // Logs de l'autre org ne doivent pas apparaître
    const otherResult = await svc.list(user.organizationId!, {})
    assert.equal(otherResult.meta.total, 1)
  })

  // ── purgeExpired ─────────────────────────────────────────────────────────

  test("purgeExpired supprime tous les logs pour un org avec plan 'starter' (retentionDays=0)", async ({
    assert,
  }) => {
    // starter → auditLogRetentionDays = 0 → delete all
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const svc = new AuditLogService()
    await svc.log({ organizationId: org.id, userId: null, action: 'login' })
    await svc.log({ organizationId: org.id, userId: null, action: 'logout' })

    await svc.purgeExpired()

    const remaining = await AuditLog.query().where('organizationId', org.id)
    assert.lengthOf(remaining, 0)
  })

  test("purgeExpired supprime les logs anciens et conserve les récents pour un org 'pro' (retentionDays=90)", async ({
    assert,
  }) => {
    // pro → auditLogRetentionDays = 90
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = new AuditLogService()

    // Log ancien (> 90 jours) — créé directement pour forcer le createdAt
    const oldLog = await AuditLog.create({
      organizationId: org.id,
      userId: null,
      action: 'login' as const,
      entityType: null,
      entityId: null,
      metadata: null,
      createdAt: DateTime.now().minus({ days: 100 }),
    })

    // Log récent (hier)
    const recentLog = await AuditLog.create({
      organizationId: org.id,
      userId: null,
      action: 'logout' as const,
      entityType: null,
      entityId: null,
      metadata: null,
      createdAt: DateTime.now().minus({ days: 1 }),
    })

    await svc.purgeExpired()

    const deletedOld = await AuditLog.find(oldLog.id)
    const keptRecent = await AuditLog.find(recentLog.id)
    assert.isNull(deletedOld)
    assert.isNotNull(keptRecent)
  })

  test("purgeExpired ne supprime rien pour un org avec plan 'enterprise' (retentionDays=null)", async ({
    assert,
  }) => {
    // enterprise → auditLogRetentionDays = null → keep forever
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const svc = new AuditLogService()

    const oldLog = await AuditLog.create({
      organizationId: org.id,
      userId: null,
      action: 'login' as const,
      entityType: null,
      entityId: null,
      metadata: null,
      createdAt: DateTime.now().minus({ days: 500 }),
    })

    await svc.purgeExpired()

    const found = await AuditLog.find(oldLog.id)
    assert.isNotNull(found)
  })

  // ── canAccessAuditLog ────────────────────────────────────────────────────

  test("canAccessAuditLog retourne false pour un org avec plan 'starter'", async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const fullOrg = await Organization.findOrFail(org.id)
    const svc = new AuditLogService()

    assert.isFalse(svc.canAccessAuditLog(fullOrg))
  })

  test("canAccessAuditLog retourne true pour un org avec plan 'pro'", async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const fullOrg = await Organization.findOrFail(org.id)
    const svc = new AuditLogService()

    assert.isTrue(svc.canAccessAuditLog(fullOrg))
  })

  test("canAccessAuditLog retourne true pour un org avec plan 'enterprise'", async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const fullOrg = await Organization.findOrFail(org.id)
    const svc = new AuditLogService()

    assert.isTrue(svc.canAccessAuditLog(fullOrg))
  })
})
