import { mount } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'
import GradientMeshCanvas from '../../inertia/components/marketing/canvas/GradientMeshCanvas.vue'
import ParticleNetworkCanvas from '../../inertia/components/marketing/canvas/ParticleNetworkCanvas.vue'
import PortsMapCanvas from '../../inertia/components/marketing/canvas/PortsMapCanvas.vue'

// En jsdom/happy-dom, getContext est absent/null : les composants doivent
// monter sans erreur et rendre un <canvas> de secours (fallback CSS derrière).

afterEach(() => {
  vi.restoreAllMocks()
})

test('GradientMeshCanvas mounts and renders a canvas', () => {
  const w = mount(GradientMeshCanvas, { props: { variant: 'navy', intensity: 0.5 } })
  expect(w.find('canvas').exists()).toBe(true)
  w.unmount()
})

test('GradientMeshCanvas supports the light "dawn" variant', () => {
  const w = mount(GradientMeshCanvas, { props: { variant: 'dawn', intensity: 0.5 } })
  expect(w.find('canvas').exists()).toBe(true)
  w.unmount()
})

test('GradientMeshCanvas tries WebGL first, then falls back to 2D', () => {
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  const w = mount(GradientMeshCanvas, { props: { variant: 'navy', intensity: 0.5 } })
  const requested = getContext.mock.calls.map(([kind]) => kind)
  expect(requested).toContain('webgl')
  expect(requested).toContain('2d')
  expect(requested.indexOf('webgl')).toBeLessThan(requested.indexOf('2d'))
  w.unmount()
})

test('ParticleNetworkCanvas mounts and renders a canvas', () => {
  const w = mount(ParticleNetworkCanvas, { props: { color: '#8a9aab', density: 0.7 } })
  expect(w.find('canvas').exists()).toBe(true)
  w.unmount()
})

test('PortsMapCanvas mounts and renders a canvas (dark et light)', () => {
  for (const variant of ['dark', 'light'] as const) {
    const w = mount(PortsMapCanvas, { props: { variant, intensity: 0.6 } })
    expect(w.find('canvas').exists()).toBe(true)
    w.unmount()
  }
})
