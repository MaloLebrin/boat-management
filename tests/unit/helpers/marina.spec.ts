import { test } from '@japa/runner'
import {
  addPeriods,
  contractRenewalDue,
  occupancyRate,
  overlapNights,
  previousDay,
  spotEffectiveStatus,
  spotFitsLength,
  stayNights,
  stayTotal,
} from '#shared/helpers/marina'
import { toIsoDay } from '#shared/helpers/date'
import { DateTime } from 'luxon'

/**
 * Calculs purs de l'exploitation marina (#891) : nuitées, occupation,
 * échéances de contrat. Ce sont eux qui fixent un montant de facture.
 */
test.group('marina — nuitées et montants', () => {
  test('le jour du départ ne compte pas', ({ assert }) => {
    assert.equal(stayNights('2026-07-01', '2026-07-04'), 3)
    assert.equal(stayNights('2026-07-01', '2026-07-02'), 1)
  })

  test("un passage à l'heure d'été ne vole pas de nuitée", ({ assert }) => {
    assert.equal(stayNights('2026-03-28', '2026-03-30'), 2)
    assert.equal(stayNights('2026-10-24', '2026-10-26'), 2)
  })

  test('des dates inversées donnent zéro, jamais un négatif', ({ assert }) => {
    assert.equal(stayNights('2026-07-04', '2026-07-01'), 0)
  })

  test('le montant additionne nuitées × tarif et services, au centime', ({ assert }) => {
    const total = stayTotal(3, 25.5, [
      { label: 'Électricité', quantity: 3, unitPrice: 4.1 },
      { label: 'Eau', quantity: 1, unitPrice: 2 },
    ])
    assert.equal(total, 90.8)
  })
})

test.group('marina — occupation', () => {
  test('ne compte que la part du séjour dans la période', ({ assert }) => {
    assert.equal(overlapNights('2026-06-28', '2026-07-03', '2026-07-01', '2026-08-01'), 2)
    assert.equal(overlapNights('2026-07-30', '2026-08-05', '2026-07-01', '2026-08-01'), 2)
    assert.equal(overlapNights('2026-08-02', '2026-08-05', '2026-07-01', '2026-08-01'), 0)
  })

  test('un séjour ouvert court jusqu’à la fin de période', ({ assert }) => {
    assert.equal(overlapNights('2026-07-10', null, '2026-07-01', '2026-08-01'), 22)
  })

  test('le taux est un entier plafonné à 100, nul sans capacité', ({ assert }) => {
    assert.equal(occupancyRate(31, 2, 31), 50)
    assert.equal(occupancyRate(999, 1, 31), 100)
    assert.equal(occupancyRate(5, 0, 31), 0)
  })
})

test.group('marina — places', () => {
  test('une dimension inconnue ne permet pas de conclure', ({ assert }) => {
    assert.isTrue(spotFitsLength(12, 11.5))
    assert.isTrue(spotFitsLength(12, 12))
    assert.isFalse(spotFitsLength(12, 12.4))
    assert.isNull(spotFitsLength(null, 10))
    assert.isNull(spotFitsLength(12, null))
  })

  test('occupée se déduit, sauf hors service qui prime', ({ assert }) => {
    assert.equal(spotEffectiveStatus('available', false), 'available')
    assert.equal(spotEffectiveStatus('available', true), 'occupied')
    assert.equal(spotEffectiveStatus('reserved', true), 'occupied')
    assert.equal(spotEffectiveStatus('reserved', false), 'reserved')
    assert.equal(spotEffectiveStatus('out_of_service', true), 'out_of_service')
  })
})

test.group('marina — échéances de contrat', () => {
  test('avance de N périodes depuis l’ancrage', ({ assert }) => {
    assert.equal(addPeriods('2026-01-15', 'monthly', 1), '2026-02-15')
    assert.equal(addPeriods('2026-01-15', 'quarterly', 1), '2026-04-15')
    assert.equal(addPeriods('2026-01-15', 'annual', 1), '2027-01-15')
    assert.equal(addPeriods('2026-11-15', 'monthly', 3), '2027-02-15')
  })

  test('un 31 retombe sur le dernier jour du mois, sans dériver ensuite', ({ assert }) => {
    assert.equal(addPeriods('2026-01-31', 'monthly', 1), '2026-02-28')
    assert.equal(addPeriods('2026-01-31', 'monthly', 2), '2026-03-31')
    assert.equal(addPeriods('2028-01-31', 'monthly', 1), '2028-02-29')
  })

  test('la veille sert de fin incluse', ({ assert }) => {
    assert.equal(previousDay('2026-03-01'), '2026-02-28')
  })

  test('à renouveler : fin dans les 30 jours, pas encore passée', ({ assert }) => {
    assert.isTrue(contractRenewalDue('2026-07-20', '2026-07-01'))
    assert.isTrue(contractRenewalDue('2026-07-01', '2026-07-01'))
    assert.isFalse(contractRenewalDue('2026-09-01', '2026-07-01'))
    assert.isFalse(contractRenewalDue('2026-06-30', '2026-07-01'))
    assert.isFalse(contractRenewalDue(null, '2026-07-01'))
  })
})

test.group('toIsoDay', () => {
  test('accepte un DateTime, une Date ou une chaîne ISO', ({ assert }) => {
    assert.equal(toIsoDay('2026-07-01T10:00:00Z'), '2026-07-01')
    assert.equal(toIsoDay(DateTime.fromISO('2026-07-01')), '2026-07-01')
    assert.equal(toIsoDay(new Date(2026, 6, 1, 12)), '2026-07-01')
  })
})
