import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    props: {
      appT: {
        'incidents.target.engine': 'Moteur',
        'incidents.target.sail': 'Voile',
        'incidents.target.rig': 'Gréement',
        'incidents.target.safety': 'Sécurité',
        'incidents.target.engine_part': 'Pièce',
        'boats.options.sailType.main': 'Grand-voile',
        'boats.options.safetyEquipmentType.life_jacket': 'Gilet de sauvetage',
      },
      locale: 'fr',
    },
  }),
}))
vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
}))

import IncidentTargetBadge from '../../inertia/components/boats/incidents/IncidentTargetBadge.vue'

test('an engine target links to the engine page with its brand and model (#813)', () => {
  const w = mount(IncidentTargetBadge, {
    props: { boatId: 7, target: { type: 'engine', id: 12, name: 'Yamaha F100' } },
  })

  expect(w.text()).toBe('Moteur · Yamaha F100')
  expect(w.find('a').attributes('href')).toBe('/boats/7/engines/12')
})

test('sail and safety names are enum keys, translated on the fly', () => {
  const sail = mount(IncidentTargetBadge, {
    props: { boatId: 7, target: { type: 'sail', id: 3, name: 'main' } },
  })
  expect(sail.text()).toBe('Voile · Grand-voile')
  expect(sail.find('a').attributes('href')).toBe('/boats/7/sails/3')

  const safety = mount(IncidentTargetBadge, {
    props: { boatId: 7, target: { type: 'safety', id: 4, name: 'life_jacket' } },
  })
  expect(safety.text()).toBe('Sécurité · Gilet de sauvetage')
  expect(safety.find('a').attributes('href')).toBe('/boats/7/safety-equipment/4')
})

test('the rig has no name; a part links through its engine, or stays plain text without it', () => {
  const rig = mount(IncidentTargetBadge, {
    props: { boatId: 7, target: { type: 'rig', id: 1, name: null } },
  })
  expect(rig.text()).toBe('Gréement')
  expect(rig.find('a').attributes('href')).toBe('/boats/7/rig')

  const part = mount(IncidentTargetBadge, {
    props: { boatId: 7, target: { type: 'engine_part', id: 9, name: 'Bougie NGK', engineId: 12 } },
  })
  expect(part.text()).toBe('Pièce · Bougie NGK')
  expect(part.find('a').attributes('href')).toBe('/boats/7/engines/12/parts/9')

  const orphan = mount(IncidentTargetBadge, {
    props: { boatId: 7, target: { type: 'engine_part', id: 9, name: 'Bougie NGK' } },
  })
  expect(orphan.find('a').exists()).toBe(false)
  expect(orphan.text()).toBe('Pièce · Bougie NGK')
})
