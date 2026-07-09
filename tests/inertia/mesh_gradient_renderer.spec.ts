import { describe, expect, test } from 'vitest'
import { createBlobMeshRenderer } from '../../inertia/components/marketing/canvas/mesh_gradient_2d'
import {
  MESH_PALETTES,
  hexToRgb01,
  hexToRgba,
} from '../../inertia/components/marketing/canvas/mesh_gradient_shared'
import { createWebglMeshRenderer } from '../../inertia/components/marketing/canvas/mesh_gradient_webgl'

describe('mesh_gradient_shared', () => {
  test('hexToRgb01 normalise en 0–1', () => {
    const [r, g, b] = hexToRgb01('#e2674f')
    expect(r).toBeCloseTo(226 / 255)
    expect(g).toBeCloseTo(103 / 255)
    expect(b).toBeCloseTo(79 / 255)
  })

  test('hexToRgba produit un rgba() valide', () => {
    expect(hexToRgba('#0b1d2e', 0.5)).toBe('rgba(11, 29, 46, 0.5)')
  })

  test('chaque variante a 5 couleurs hex et un mode', () => {
    for (const palette of Object.values(MESH_PALETTES)) {
      expect(palette.colors).toHaveLength(5)
      expect(['dark', 'light']).toContain(palette.mode)
      for (const color of palette.colors) expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('createWebglMeshRenderer', () => {
  test('retourne null sans WebGL (environnement de test)', () => {
    const canvas = document.createElement('canvas')
    expect(createWebglMeshRenderer(canvas, 'navy', 0.5)).toBeNull()
  })
})

describe('createBlobMeshRenderer', () => {
  test('retourne null sans contexte 2D (environnement de test)', () => {
    const canvas = document.createElement('canvas')
    expect(createBlobMeshRenderer(canvas, 'navy', 0.5)).toBeNull()
  })

  test('resize + drawFrame ne jettent pas avec un contexte 2D stubé', () => {
    const gradientStub = { addColorStop: () => {} }
    const ctxStub = {
      setTransform: () => {},
      clearRect: () => {},
      createRadialGradient: () => gradientStub,
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      globalCompositeOperation: 'source-over',
      fillStyle: '',
    }
    const canvas = document.createElement('canvas')
    Object.defineProperty(canvas, 'getContext', { value: () => ctxStub })
    const renderer = createBlobMeshRenderer(canvas, 'dawn', 0.5)
    expect(renderer).not.toBeNull()
    renderer?.resize(800, 400, 2)
    renderer?.drawFrame(0)
    renderer?.drawFrame(16)
    renderer?.destroy()
  })
})
