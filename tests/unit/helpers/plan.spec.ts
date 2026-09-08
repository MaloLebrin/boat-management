import { test } from '@japa/runner'
import {
  applyOrganizationProfileOverrides,
  canManagePortsFor,
  isPortlessOrganizationProfile,
  resolveEffectiveQuotas,
} from '#shared/helpers/plan'
import { PLAN_LIMITS } from '#shared/types/plan'

test.group('resolveEffectiveQuotas', () => {
  test('without module, effective quotas equal the tier quotas', ({ assert }) => {
    assert.deepEqual(resolveEffectiveQuotas('pro', []), PLAN_LIMITS.pro)
    assert.deepEqual(resolveEffectiveQuotas('starter', []), PLAN_LIMITS.starter)
    assert.deepEqual(resolveEffectiveQuotas('enterprise', []), PLAN_LIMITS.enterprise)
  })

  test('charter module grants pricing only', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', ['charter'])

    assert.isTrue(quotas.canManagePricing)
    assert.isFalse(quotas.canManageClients)
    assert.isFalse(quotas.canManageInvoices)
  })

  test('crm_invoicing module grants clients and invoices', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', ['crm_invoicing'])

    assert.isTrue(quotas.canManageClients)
    assert.isTrue(quotas.canManageInvoices)
    assert.isFalse(quotas.canManagePricing)
  })

  test('modules combine and never alter numeric quotas of the tier', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', ['charter', 'crm_invoicing'])

    assert.isTrue(quotas.canManagePricing)
    assert.isTrue(quotas.canManageClients)
    assert.isTrue(quotas.canManageInvoices)
    assert.equal(quotas.maxBoats, PLAN_LIMITS.pro.maxBoats)
    assert.equal(quotas.maxMembers, PLAN_LIMITS.pro.maxMembers)
    assert.equal(quotas.storageGb, PLAN_LIMITS.pro.storageGb)
    assert.equal(quotas.canWhiteLabel, PLAN_LIMITS.pro.canWhiteLabel)
  })

  test('enterprise with modules stays identical to enterprise', ({ assert }) => {
    assert.deepEqual(
      resolveEffectiveQuotas('enterprise', ['charter', 'crm_invoicing']),
      PLAN_LIMITS.enterprise
    )
  })

  test('resolution never mutates PLAN_LIMITS', ({ assert }) => {
    const before = { ...PLAN_LIMITS.pro }
    resolveEffectiveQuotas('pro', ['charter', 'crm_invoicing'])
    assert.deepEqual(PLAN_LIMITS.pro, before)
  })

  test('extra_boats add-on raises maxBoats by its quantity', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', [], [{ addon: 'extra_boats', quantity: 3 }])
    assert.equal(quotas.maxBoats, (PLAN_LIMITS.pro.maxBoats as number) + 3)
    // Les autres quotas numériques restent inchangés.
    assert.equal(quotas.maxMembers, PLAN_LIMITS.pro.maxMembers)
  })

  test('extra_boats combines with modules (flags + numeric raise)', ({ assert }) => {
    const quotas = resolveEffectiveQuotas(
      'pro',
      ['charter'],
      [{ addon: 'extra_boats', quantity: 5 }]
    )
    assert.isTrue(quotas.canManagePricing)
    assert.equal(quotas.maxBoats, (PLAN_LIMITS.pro.maxBoats as number) + 5)
  })

  test('extra_boats with quantity 0 leaves the tier quota unchanged', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('pro', [], [{ addon: 'extra_boats', quantity: 0 }])
    assert.equal(quotas.maxBoats, PLAN_LIMITS.pro.maxBoats)
  })

  test('extra_boats never degrades an unlimited (null) quota', ({ assert }) => {
    const quotas = resolveEffectiveQuotas('enterprise', [], [{ addon: 'extra_boats', quantity: 4 }])
    assert.isNull(quotas.maxBoats)
  })
})

/**
 * Restriction de profil sur la cartographie de port : une organisation déclarée
 * « particulier » à l'inscription n'a pas de marina à modéliser, quel que soit
 * son plan. Un profil non renseigné (`null`) ne restreint rien — un compte qui
 * n'a jamais eu l'occasion de se déclarer ne doit pas perdre l'accès.
 */
test.group('restriction de profil — cartographie de port', () => {
  test('isPortlessOrganizationProfile ne restreint que le profil particulier', ({ assert }) => {
    assert.isTrue(isPortlessOrganizationProfile('private'))
    assert.isFalse(isPortlessOrganizationProfile('marina'))
    assert.isFalse(isPortlessOrganizationProfile('rental'))
    assert.isFalse(isPortlessOrganizationProfile('school'))
    assert.isFalse(isPortlessOrganizationProfile(null))
  })

  test('applyOrganizationProfileOverrides renvoie les quotas tels quels hors particulier', ({
    assert,
  }) => {
    assert.strictEqual(
      applyOrganizationProfileOverrides(PLAN_LIMITS.pro, null),
      PLAN_LIMITS.pro,
      "un profil sans restriction ne recopie même pas l'objet"
    )
    assert.strictEqual(
      applyOrganizationProfileOverrides(PLAN_LIMITS.pro, 'marina'),
      PLAN_LIMITS.pro
    )
  })

  test('applyOrganizationProfileOverrides ne coupe que les ports et ne mute pas la source', ({
    assert,
  }) => {
    const before = { ...PLAN_LIMITS.enterprise }
    const quotas = applyOrganizationProfileOverrides(PLAN_LIMITS.enterprise, 'private')

    assert.isFalse(quotas.canManagePorts)
    assert.deepEqual(
      { ...quotas, canManagePorts: true },
      PLAN_LIMITS.enterprise,
      'aucun autre quota ne bouge'
    )
    assert.deepEqual(PLAN_LIMITS.enterprise, before, "l'objet source reste intact")
  })

  test('canManagePortsFor croise le plan et le profil', ({ assert }) => {
    assert.isTrue(canManagePortsFor('pro', null))
    assert.isTrue(canManagePortsFor('pro', 'marina'))
    assert.isTrue(canManagePortsFor('enterprise', 'rental'))
    assert.isFalse(canManagePortsFor('pro', 'private'))
    assert.isFalse(canManagePortsFor('enterprise', 'private'))
    // Le plan continue de gouverner indépendamment du profil.
    assert.isFalse(canManagePortsFor('starter', 'marina'))
    assert.isFalse(canManagePortsFor('starter', 'private'))
  })

  test('le profil est appliqué après les modules et les add-ons', ({ assert }) => {
    const quotas = resolveEffectiveQuotas(
      'pro',
      ['charter', 'crm_invoicing'],
      [{ addon: 'extra_boats', quantity: 2 }],
      'private'
    )

    assert.isFalse(quotas.canManagePorts, 'le profil retire les ports')
    assert.isTrue(quotas.canManageReservations, 'les modules restent accordés')
    assert.isTrue(quotas.canManageInvoices)
    assert.equal(
      quotas.maxBoats,
      (PLAN_LIMITS.pro.maxBoats as number) + 2,
      "l'add-on reste appliqué"
    )
  })

  test('le quatrième argument omis ou nul laisse la résolution inchangée', ({ assert }) => {
    assert.deepEqual(resolveEffectiveQuotas('pro', []), PLAN_LIMITS.pro)
    assert.deepEqual(resolveEffectiveQuotas('pro', [], [], null), PLAN_LIMITS.pro)
    assert.deepEqual(resolveEffectiveQuotas('pro', [], [], 'marina'), PLAN_LIMITS.pro)
  })
})
