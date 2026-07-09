import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  blurIn,
  fadeLeft,
  fadeRight,
  fadeUp,
  scaleIn,
} from '../../inertia/composables/use_motion_presets'

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('use_motion_presets', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('fadeUp part masqué et décalé vers le bas', () => {
    stubReducedMotion(false)
    const p = fadeUp()
    expect(p.initial).toEqual({ opacity: 0, y: 28 })
    expect(p.visibleOnce.opacity).toBe(1)
    expect(p.visibleOnce.y).toBe(0)
  })

  test('fadeLeft/fadeRight entrent depuis des côtés opposés', () => {
    stubReducedMotion(false)
    expect(fadeLeft().initial.x).toBe(-40)
    expect(fadeRight().initial.x).toBe(40)
  })

  test('scaleIn part réduit, blurIn part flouté', () => {
    stubReducedMotion(false)
    expect(scaleIn().initial.scale).toBe(0.94)
    expect(blurIn().initial.filter).toBe('blur(10px)')
  })

  test('le délai est propagé dans la transition', () => {
    stubReducedMotion(false)
    const p = fadeUp(250)
    expect(p.visibleOnce.transition).toMatchObject({ delay: 250 })
  })

  test('sous prefers-reduced-motion, aucun état masqué (déjà visible)', () => {
    stubReducedMotion(true)
    const p = fadeLeft(300)
    expect(p.initial).toEqual({ opacity: 1 })
    expect(p.visibleOnce).toEqual({ opacity: 1 })
  })
})
