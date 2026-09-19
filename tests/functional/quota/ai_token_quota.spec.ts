import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { OrganizationFactory } from '#database/factories/organization_factory'
import AiTokenQuotaService, { AI_CALL_TOKEN_RESERVATION } from '#services/ai_token_quota_service'
import AiTokenUsage from '#models/ai_token_usage'
import { QuotaExceededError } from '#exceptions/quota_errors'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

test.group('AiTokenQuota (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('getUsage returns 0 when no record exists', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    const usage = await svc.getUsage(org.id)
    assert.equal(usage, 0)
  })

  test('getUsage returns current month tokens', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)
    const month = svc.currentMonthKey()

    await AiTokenUsage.create({ organizationId: org.id, month, tokensUsed: 42000 })

    const usage = await svc.getUsage(org.id)
    assert.equal(usage, 42000)
  })

  test('assertCanUseTokens does not throw when under limit', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    assert.doesNotThrow(() => svc.assertCanUseTokens(org, 500_000))
  })

  test('assertCanUseTokens throws QuotaExceededError when at limit', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    assert.throws(() => svc.assertCanUseTokens(org, 1_000_000), 'Quota exceeded: ai_tokens')
  })

  test('assertCanUseTokens does not throw for enterprise (unlimited)', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    assert.doesNotThrow(() => svc.assertCanUseTokens(org, 5_000_000))
  })

  test('recordUsage creates a new row on first call', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    await svc.recordUsage(org, 1000)

    const month = svc.currentMonthKey()
    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', month)
      .first()
    assert.isNotNull(row)
    assert.equal(Number(row!.tokensUsed), 1000)
  })

  test('recordUsage increments existing row', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)
    const month = svc.currentMonthKey()

    await AiTokenUsage.create({ organizationId: org.id, month, tokensUsed: 5000 })

    await svc.recordUsage(org, 3000)

    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', month)
      .first()
    assert.equal(Number(row!.tokensUsed), 8000)
  })

  test('recordUsage ignores zero tokens', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    await svc.recordUsage(org, 0)

    const rows = await AiTokenUsage.query().where('organizationId', org.id)
    assert.equal(rows.length, 0)
  })

  test('resetMonth deletes records for that month', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)
    const month = DateTime.now().minus({ months: 1 }).toFormat('yyyy-MM')

    await AiTokenUsage.create({ organizationId: org.id, month, tokensUsed: 99000 })

    await svc.resetMonth(month)

    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', month)
      .first()
    assert.isNull(row)
  })

  test('QuotaExceededError for ai_tokens has correct fields', ({ assert }) => {
    const error = new QuotaExceededError('ai_tokens', {
      limit: 1_000_000,
      current: 1_000_001,
      upgradeTo: 'enterprise',
    })
    assert.equal(error.feature, 'ai_tokens')
    assert.equal(error.limit, 1_000_000)
    assert.equal(error.current, 1_000_001)
    assert.equal(error.upgradeTo, 'enterprise')
  })

  // ── réservation atomique — protection TOCTOU inter-processus (#776) ──────

  test('deux réservations concurrentes au bord du plafond : une seule passe', async ({
    assert,
  }) => {
    // Le test qui échouait avant #776, et qui vaut l'issue. Les deux appels
    // partent en parallèle sur **deux connexions distinctes** du pool : c'est
    // la situation du serveur web et du worker IA, chacun avec sa propre
    // `Map` de verrous en mémoire. Seule une garantie portée par la base peut
    // les départager.
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)
    const month = svc.currentMonthKey()

    // Il reste exactement de quoi couvrir **une** réservation.
    await AiTokenUsage.create({
      organizationId: org.id,
      month,
      tokensUsed: 1_000_000 - AI_CALL_TOKEN_RESERVATION,
    })

    const [first, second] = await Promise.allSettled([
      svc.reserveTokens(org),
      svc.reserveTokens(org),
    ])

    const outcomes = [first.status, second.status].sort()
    assert.deepEqual(outcomes, ['fulfilled', 'rejected'])

    const refused = [first, second].find((r) => r.status === 'rejected')
    assert.instanceOf((refused as PromiseRejectedResult).reason, QuotaExceededError)
  })

  test('une réservation est relâchée et ne consomme rien', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    const reservation = await svc.reserveTokens(org)
    assert.equal(reservation.amount, AI_CALL_TOKEN_RESERVATION)

    await reservation.release()

    // La consommation réelle, elle, n'a jamais bougé : la réservation vit
    // dans sa propre colonne.
    assert.equal(await svc.getUsage(org.id), 0)
    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', svc.currentMonthKey())
      .firstOrFail()
    assert.equal(Number(row.reservedTokens), 0)
  })

  test('la réservation redevient disponible après libération', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    await AiTokenUsage.create({
      organizationId: org.id,
      month: svc.currentMonthKey(),
      tokensUsed: 1_000_000 - AI_CALL_TOKEN_RESERVATION,
    })

    const first = await svc.reserveTokens(org)
    await assert.rejects(() => svc.reserveTokens(org), QuotaExceededError)

    await first.release()

    // Sans libération, un appel terminé fermerait le quota pour le reste du
    // mois.
    const second = await svc.reserveTokens(org)
    assert.equal(second.amount, AI_CALL_TOKEN_RESERVATION)
  })

  test('un plan sans plafond ne réserve rien', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    const reservation = await svc.reserveTokens(org)

    assert.equal(reservation.amount, 0)
    assert.isNull(
      await AiTokenUsage.query()
        .where('organizationId', org.id)
        .where('month', svc.currentMonthKey())
        .first(),
      'aucune ligne ne doit être créée pour un plan illimité'
    )
  })

  test('withReservedTokens relâche même quand l’appel lève', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    await assert.rejects(
      () =>
        svc.withReservedTokens(org, async () => {
          throw new Error('appel IA en échec')
        }),
      'appel IA en échec'
    )

    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', svc.currentMonthKey())
      .firstOrFail()
    assert.equal(Number(row.reservedTokens), 0)
  })

  test('clearReservations rattrape une réservation orpheline', async ({ assert }) => {
    // Un processus tué en plein appel ne relâche pas : la fuite est bornée à
    // une réservation, et se rattrape sans attendre la remise à zéro
    // mensuelle.
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const svc = await app.container.make(AiTokenQuotaService)

    await svc.reserveTokens(org)
    await svc.clearReservations(org.id)

    const row = await AiTokenUsage.query()
      .where('organizationId', org.id)
      .where('month', svc.currentMonthKey())
      .firstOrFail()
    assert.equal(Number(row.reservedTokens), 0)
  })

  // ── verrou best-effort, conservé pour les plafonds hors tokens ───────────

  test('withBestEffortOrgLock sérialise les appels concurrents du même org', async ({ assert }) => {
    const svc = await app.container.make(AiTokenQuotaService)
    const order: number[] = []

    const task = (id: number) =>
      svc.withBestEffortOrgLock(42, async () => {
        order.push(id)
        await new Promise<void>((res) => setTimeout(res, 10))
        order.push(-id)
      })

    await Promise.all([task(1), task(2), task(3)])

    for (let i = 0; i < order.length - 1; i += 2) {
      assert.equal(order[i + 1], -order[i])
    }
  })

  test('withBestEffortOrgLock laisse passer deux orgs différents', async ({ assert }) => {
    const svc = await app.container.make(AiTokenQuotaService)
    const order: string[] = []

    const taskA = svc.withBestEffortOrgLock(1, async () => {
      order.push('A:start')
      await new Promise<void>((res) => setTimeout(res, 20))
      order.push('A:end')
    })
    const taskB = svc.withBestEffortOrgLock(2, async () => {
      order.push('B:start')
      await new Promise<void>((res) => setTimeout(res, 5))
      order.push('B:end')
    })

    await Promise.all([taskA, taskB])

    assert.isTrue(order.indexOf('B:start') < order.indexOf('A:end'))
    assert.isAbove(order.indexOf('A:start'), -1)
  })
})
