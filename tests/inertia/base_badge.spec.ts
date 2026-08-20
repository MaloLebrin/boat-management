import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import BaseBadge from '../../inertia/components/base/BaseBadge.vue'

test('renders slot text', () => {
  const w = mount(BaseBadge, { slots: { default: 'Status' } })
  expect(w.text()).toBe('Status')
})

test('applies neutral variant classes by default', () => {
  const w = mount(BaseBadge, { slots: { default: 'N' } })
  expect(w.classes().join(' ')).toContain('bg-lilac-100')
})

test('applies success variant classes', () => {
  const w = mount(BaseBadge, { props: { variant: 'success' }, slots: { default: 'OK' } })
  expect(w.classes().join(' ')).toContain('text-mint-700')
})

describe('dark mode (#416)', () => {
  // Les 6 variantes doivent puiser dans les palettes de marque : elles seules
  // sont inversées par `[data-theme='dark']` (paliers -50/-100 en fond,
  // -700/-800 en encre). Une palette Tailwind par défaut resterait figée.
  const VARIANT_TOKENS = [
    ['neutral', 'bg-lilac-100', 'text-lilac-800'],
    ['info', 'bg-sky-100', 'text-sky-800'],
    ['success', 'bg-mint-100', 'text-mint-700'],
    ['warning', 'bg-peach-100', 'text-peach-800'],
    ['danger', 'bg-coral-100', 'text-coral-700'],
    ['empty', 'bg-surface-muted', 'text-fg-muted'],
  ] as const

  test.each(VARIANT_TOKENS)('la variante %s bascule via %s / %s', (variant, bg, fg) => {
    const w = mount(BaseBadge, { props: { variant }, slots: { default: 'X' } })
    const classes = w.classes().join(' ')
    expect(classes).toContain(bg)
    expect(classes).toContain(fg)
  })

  test('aucune variante ne retombe sur la palette Tailwind par défaut', () => {
    for (const [variant] of VARIANT_TOKENS) {
      const w = mount(BaseBadge, { props: { variant }, slots: { default: 'X' } })
      expect(w.classes().join(' '), `variante ${variant}`).not.toMatch(
        /-(red|green|blue|gray|slate|emerald|teal|purple)-\d/
      )
    }
  })
})
