import { expect, test } from 'vitest'
import { BOAT_MARKER_HTML, trackDotHtml } from '../../inertia/utils/map_markers'

test('a track dot is sized and painted with the brand token, without any raw hex', () => {
  const html = trackDotHtml({ size: 8, opacity: 0.5 })

  expect(html).toContain('width:8px')
  expect(html).toContain('height:8px')
  expect(html).toContain('background:var(--color-brand)')
  expect(html).toContain('opacity:0.5')
  expect(html).not.toContain('border:')
  expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
})

test('the ring variant borders the dot with the elevated surface token', () => {
  const html = trackDotHtml({ size: 10, ring: true })

  expect(html).toContain('border:2px solid var(--color-surface-elevated)')
  expect(html).not.toContain('opacity')
  expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
})

test('the boat marker keeps its CSS hook', () => {
  expect(BOAT_MARKER_HTML).toBe('<div class="boat-marker">⚓</div>')
})
