import { test } from '@japa/runner'
import QuotaService from '#services/quota_service'
import OrganizationModuleService from '#services/organization_module_service'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { OrganizationFactory } from '#database/factories/organization_factory'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationMembershipFactory } from '#database/factories/organization_membership_factory'
import app from '@adonisjs/core/services/app'

test.group('QuotaService (unit)', () => {
  // ── canAddBoat ───────────────────────────────────────────────────────────

  test('canAddBoat retourne true quand sous la limite du plan', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    // starter: maxBoats = 2, on crée 1 bateau → sous la limite
    await BoatFactory.merge({ organizationId: org.id }).create()

    const svc = await app.container.make(QuotaService)
    const result = await svc.canAddBoat(org)

    assert.isTrue(result)
  })

  test('canAddBoat retourne false quand la limite est atteinte', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    // starter: maxBoats = 2, on crée 2 bateaux → limite atteinte
    await BoatFactory.merge({ organizationId: org.id }).createMany(2)

    const svc = await app.container.make(QuotaService)
    const result = await svc.canAddBoat(org)

    assert.isFalse(result)
  })

  test('canAddBoat retourne true sans limite pour le plan enterprise', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    await BoatFactory.merge({ organizationId: org.id }).createMany(50)

    const svc = await app.container.make(QuotaService)
    const result = await svc.canAddBoat(org)

    assert.isTrue(result)
  })

  // ── assertCanAddBoat ─────────────────────────────────────────────────────

  test('assertCanAddBoat ne throw pas quand sous la limite', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()

    const svc = await app.container.make(QuotaService)
    await assert.doesNotReject(() => svc.assertCanAddBoat(org))
  })

  test('assertCanAddBoat throw QuotaExceededError quand limite atteinte', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    // starter: maxBoats = 2
    await BoatFactory.merge({ organizationId: org.id }).createMany(2)

    const svc = await app.container.make(QuotaService)
    await assert.rejects(() => svc.assertCanAddBoat(org), QuotaExceededError)
  })

  test('assertCanAddBoat QuotaExceededError a la bonne feature et upgradeTo', async ({
    assert,
  }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    await BoatFactory.merge({ organizationId: org.id }).createMany(2)

    const svc = await app.container.make(QuotaService)
    let error: QuotaExceededError | undefined
    try {
      await svc.assertCanAddBoat(org)
    } catch (err) {
      error = err as QuotaExceededError
    }

    assert.instanceOf(error, QuotaExceededError)
    assert.equal(error!.feature, 'boats')
    assert.equal(error!.upgradeTo, 'pro')
  })

  test('extra_boats add-on lifts the boat quota beyond the Pro plan', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    // Pro = 8 bateaux ; on en crée 8 → limite du plan atteinte.
    await BoatFactory.merge({ organizationId: org.id }).createMany(8)

    const svc = await app.container.make(QuotaService)
    assert.isFalse(await svc.canAddBoat(org))

    // Ajout de 2 bateaux supplémentaires (add-on) → quota effectif = 10.
    const moduleSvc = await app.container.make(OrganizationModuleService)
    await moduleSvc.setAddonQuantity(org.id, 'extra_boats', 2, { source: 'granted' })

    assert.isTrue(await svc.canAddBoat(org))
    await assert.doesNotReject(() => svc.assertCanAddBoat(org))
  })

  // ── canAddMember ─────────────────────────────────────────────────────────

  test('canAddMember retourne true quand sous la limite du plan', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    // starter: maxMembers = 1, aucun membre → sous la limite

    const svc = await app.container.make(QuotaService)
    const result = await svc.canAddMember(org)

    assert.isTrue(result)
  })

  test('canAddMember retourne false quand la limite est atteinte', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const user = await UserFactory.with('organization').create()
    // starter: maxMembers = 1, on crée 1 membership → limite atteinte
    await OrganizationMembershipFactory.merge({
      organizationId: org.id,
      userId: user.id,
    }).create()

    const svc = await app.container.make(QuotaService)
    const result = await svc.canAddMember(org)

    assert.isFalse(result)
  })

  // ── assertCanAddMember ───────────────────────────────────────────────────

  test('assertCanAddMember ne throw pas quand sous la limite', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()

    const svc = await app.container.make(QuotaService)
    await assert.doesNotReject(() => svc.assertCanAddMember(org))
  })

  test('assertCanAddMember throw QuotaExceededError quand limite atteinte', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const user = await UserFactory.with('organization').create()
    // starter: maxMembers = 1
    await OrganizationMembershipFactory.merge({
      organizationId: org.id,
      userId: user.id,
    }).create()

    const svc = await app.container.make(QuotaService)
    await assert.rejects(() => svc.assertCanAddMember(org), QuotaExceededError)
  })

  test('assertCanAddMember QuotaExceededError a la bonne feature', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const user = await UserFactory.with('organization').create()
    await OrganizationMembershipFactory.merge({
      organizationId: org.id,
      userId: user.id,
    }).create()

    const svc = await app.container.make(QuotaService)
    let error: QuotaExceededError | undefined
    try {
      await svc.assertCanAddMember(org)
    } catch (err) {
      error = err as QuotaExceededError
    }

    assert.instanceOf(error, QuotaExceededError)
    assert.equal(error!.feature, 'members')
    assert.equal(error!.upgradeTo, 'pro')
  })

  // ── assertCanUseAI ───────────────────────────────────────────────────────

  test('assertCanUseAI throw pour le plan starter', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).make()

    const svc = await app.container.make(QuotaService)
    assert.throws(() => svc.assertCanUseAI(org), QuotaExceededError)
  })

  test('assertCanUseAI ne throw pas pour le plan pro', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).make()

    const svc = await app.container.make(QuotaService)
    assert.doesNotThrow(() => svc.assertCanUseAI(org))
  })

  test('assertCanUseAI ne throw pas pour le plan enterprise', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).make()

    const svc = await app.container.make(QuotaService)
    assert.doesNotThrow(() => svc.assertCanUseAI(org))
  })

  // ── assertCanExport ──────────────────────────────────────────────────────

  test('assertCanExport throw pour le plan starter', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).make()

    const svc = await app.container.make(QuotaService)
    assert.throws(() => svc.assertCanExport(org), QuotaExceededError)
  })

  test('assertCanExport ne throw pas pour le plan pro', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).make()

    const svc = await app.container.make(QuotaService)
    assert.doesNotThrow(() => svc.assertCanExport(org))
  })

  test('assertCanExport QuotaExceededError a la bonne feature', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).make()

    const svc = await app.container.make(QuotaService)
    let error: QuotaExceededError | undefined
    try {
      svc.assertCanExport(org)
    } catch (err) {
      error = err as QuotaExceededError
    }

    assert.instanceOf(error, QuotaExceededError)
    assert.equal(error!.feature, 'export')
    assert.equal(error!.upgradeTo, 'pro')
  })
})
