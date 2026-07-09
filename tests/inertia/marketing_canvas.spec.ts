import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import GradientMeshCanvas from '../../inertia/components/marketing/canvas/GradientMeshCanvas.vue'
import ParticleNetworkCanvas from '../../inertia/components/marketing/canvas/ParticleNetworkCanvas.vue'

// En jsdom, getContext('2d') est absent/throw : les composants doivent monter
// sans erreur et rendre un <canvas> de secours (fallback CSS derrière).

test('GradientMeshCanvas mounts and renders a canvas', () => {
  const w = mount(GradientMeshCanvas, { props: { variant: 'navy', intensity: 0.5 } })
  expect(w.find('canvas').exists()).toBe(true)
  w.unmount()
})

test('ParticleNetworkCanvas mounts and renders a canvas', () => {
  const w = mount(ParticleNetworkCanvas, { props: { color: '#8a9aab', density: 0.7 } })
  expect(w.find('canvas').exists()).toBe(true)
  w.unmount()
})
