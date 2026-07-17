import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BoatShowRigCard from '../../inertia/components/boats/rig/BoatShowRigCard.vue'
import type { BoatShowRig } from '../../inertia/types/boat_show'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    template: '<form><slot :processing="false" /></form>',
    props: ['action'],
  },
}))

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot name="header" /><slot /></div>' },
}))

vi.mock('~/components/base/BaseBadge.vue', () => ({
  default: { template: '<span><slot /></span>' },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

const sampleRig: BoatShowRig = {
  id: 1,
  rigType: 'Sloop',
  manufacturedAt: null,
  mastCount: 1,
  spreaders: 2,
  status: 'operational',
}

test('shows an "add rig" label and aria-label on the link when there is no rig', () => {
  const w = mount(BoatShowRigCard, {
    props: { boatId: 10, rig: null, canManage: true },
  })
  const link = w.get('a')
  expect(link.attributes('aria-label')).toBe('boats.rig.addTitle')
  expect(link.text()).toContain('boats.rig.addTitle')
})

test('shows an "edit rig" label and aria-label on the link when a rig exists', () => {
  const w = mount(BoatShowRigCard, {
    props: { boatId: 10, rig: sampleRig, canManage: true },
  })
  const link = w.get('a')
  expect(link.attributes('aria-label')).toBe('boats.rig.editTitle')
  expect(link.text()).toContain('boats.rig.editTitle')
})

test('does not render the manage link when canManage is false', () => {
  const w = mount(BoatShowRigCard, {
    props: { boatId: 10, rig: null, canManage: false },
  })
  expect(w.find('a').exists()).toBe(false)
})
