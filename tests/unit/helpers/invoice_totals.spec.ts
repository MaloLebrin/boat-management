import { test } from '@japa/runner'
import { computeInvoiceTotals } from '#shared/helpers/invoice_totals'

test.group('invoice_totals / computeInvoiceTotals', () => {
  test('sums line amounts into the subtotal (no tax)', ({ assert }) => {
    const r = computeInvoiceTotals(
      [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50 },
      ],
      0
    )
    assert.deepEqual(
      r.lines.map((l) => l.amount),
      [200, 50]
    )
    assert.equal(r.subtotal, 250)
    assert.equal(r.taxAmount, 0)
    assert.equal(r.total, 250)
  })

  test('applies a single VAT rate on the subtotal', ({ assert }) => {
    const r = computeInvoiceTotals([{ quantity: 1, unitPrice: 1000 }], 20)
    assert.equal(r.subtotal, 1000)
    assert.equal(r.taxAmount, 200)
    assert.equal(r.total, 1200)
  })

  test('rounds each line amount to 2 decimals before summing', ({ assert }) => {
    const r = computeInvoiceTotals(
      [
        { quantity: 3, unitPrice: 0.1 }, // 0.30000000000000004 -> 0.3
        { quantity: 3, unitPrice: 33.333 }, // 99.999 -> 100.0
      ],
      0
    )
    assert.deepEqual(
      r.lines.map((l) => l.amount),
      [0.3, 100]
    )
    assert.equal(r.subtotal, 100.3)
  })

  test('handles fractional quantities', ({ assert }) => {
    const r = computeInvoiceTotals([{ quantity: 2.5, unitPrice: 40 }], 10)
    assert.equal(r.subtotal, 100)
    assert.equal(r.taxAmount, 10)
    assert.equal(r.total, 110)
  })

  test('rounds VAT to 2 decimals', ({ assert }) => {
    const r = computeInvoiceTotals([{ quantity: 1, unitPrice: 99.99 }], 20)
    assert.equal(r.subtotal, 99.99)
    assert.equal(r.taxAmount, 20) // 19.998 -> 20.00
    assert.equal(r.total, 119.99)
  })

  test('returns zeros for an empty line list', ({ assert }) => {
    const r = computeInvoiceTotals([], 20)
    assert.isEmpty(r.lines)
    assert.equal(r.subtotal, 0)
    assert.equal(r.taxAmount, 0)
    assert.equal(r.total, 0)
  })
})
