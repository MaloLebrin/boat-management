import { test } from '@japa/runner'
import {
  balanceDue,
  defaultDepositAmount,
  paymentAttention,
  paymentStatusFor,
  type PaymentAttentionInput,
} from '#shared/helpers/reservation_payment'

const NOW = new Date('2026-07-01T12:00:00.000Z')

function reservation(overrides: Partial<PaymentAttentionInput> = {}): PaymentAttentionInput {
  return {
    status: 'confirmed',
    paymentStatus: 'unpaid',
    depositAmount: '300.00',
    totalPrice: '1000.00',
    paidAmount: '0.00',
    startsAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

test.group('reservation payment — amounts (#875)', () => {
  test('the default deposit is 30 % of the price, rounded to the cent', ({ assert }) => {
    assert.equal(defaultDepositAmount('1000.00'), '300.00')
    assert.equal(defaultDepositAmount('333.33'), '100.00')
    assert.equal(defaultDepositAmount(99.99), '30.00')
    assert.equal(defaultDepositAmount('1000', 50), '500.00')
  })

  test('no price, no deposit to ask for', ({ assert }) => {
    assert.isNull(defaultDepositAmount(null))
    assert.isNull(defaultDepositAmount('0'))
    assert.isNull(defaultDepositAmount(''))
  })

  test('the balance due never goes negative', ({ assert }) => {
    assert.equal(balanceDue('1000.00', '300.00'), '700.00')
    assert.equal(balanceDue('1000.00', '1200.00'), '0.00')
    assert.equal(balanceDue('0.30', '0.10'), '0.20')
    assert.isNull(balanceDue(null, '100'))
  })

  test('the status follows the amount received', ({ assert }) => {
    assert.equal(paymentStatusFor('1000', '0'), 'unpaid')
    assert.equal(paymentStatusFor('1000', '300'), 'deposit_paid')
    assert.equal(paymentStatusFor('1000', '1000'), 'paid')
    assert.equal(paymentStatusFor(null, '50'), 'paid')
  })
})

test.group('reservation payment — attention (#875)', () => {
  test('a confirmed booking awaits its deposit', ({ assert }) => {
    assert.equal(paymentAttention(reservation(), NOW), 'deposit_due')
  })

  test('within 7 days of departure, the balance is due — even before the deposit', ({ assert }) => {
    const soon = '2026-07-06T10:00:00.000Z'
    assert.equal(paymentAttention(reservation({ startsAt: soon }), NOW), 'balance_due')
    assert.equal(
      paymentAttention(
        reservation({ startsAt: soon, paymentStatus: 'deposit_paid', paidAmount: '300.00' }),
        NOW
      ),
      'balance_due'
    )
  })

  test('a deposit received far from departure asks for nothing yet', ({ assert }) => {
    assert.isNull(
      paymentAttention(reservation({ paymentStatus: 'deposit_paid', paidAmount: '300.00' }), NOW)
    )
  })

  test('options, cancellations, paid and refunded bookings ask for nothing', ({ assert }) => {
    assert.isNull(paymentAttention(reservation({ status: 'option' }), NOW))
    assert.isNull(paymentAttention(reservation({ status: 'cancelled' }), NOW))
    assert.isNull(paymentAttention(reservation({ paymentStatus: 'paid' }), NOW))
    assert.isNull(paymentAttention(reservation({ paymentStatus: 'refunded' }), NOW))
  })

  test('without price nor deposit, nothing to claim', ({ assert }) => {
    assert.isNull(paymentAttention(reservation({ totalPrice: null, depositAmount: null }), NOW))
  })
})
