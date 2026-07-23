import { mount } from '@vue/test-utils'
import { test, expect, vi, beforeEach } from 'vitest'
import NewBoatButton from '../../inertia/components/boats/NewBoatButton.vue'
import type { QuotaUsage } from '../../shared/types/plan'

const { visit } = vi.hoisted(() => ({ visit: vi.fn() }))

vi.mock('@inertiajs/vue3', () => ({
  router: { visit },
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (key: string) => key }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
}))

// Stub de la modale d'upsell : on vérifie seulement son ouverture (prop `open`).
vi.mock('~/components/base/UpgradePlanModal.vue', () => ({
  default: { props: ['open'], template: '<div class="upgrade-modal" v-if="open" />' },
}))

function mountButton(canAddBoat: boolean, quota: QuotaUsage['boats']) {
  return mount(NewBoatButton, { props: { canAddBoat, quota } })
}

beforeEach(() => visit.mockClear())

test('shows the used/limit badge below the quota and navigates on click', async () => {
  const w = mountButton(true, { used: 1, limit: 2 })

  const badge = w.find('.inline-flex').text()
  expect(badge).toContain('1/2')
  // Pas de tooltip « limite atteinte » quand il reste de la place.
  expect(w.find('.inline-flex').attributes('title')).toBeUndefined()

  await w.find('button').trigger('click')
  expect(visit).toHaveBeenCalledWith('/boats/new')
  expect(w.find('.upgrade-modal').exists()).toBe(false)
})

test('at the quota: warning badge, tooltip, and opens the upsell modal instead of navigating', async () => {
  const w = mountButton(false, { used: 2, limit: 2 })

  expect(w.text()).toContain('2/2')
  // Variante warning de BaseBadge (péche) au plafond.
  expect(w.html()).toContain('bg-peach-100')
  expect(w.find('.inline-flex').attributes('title')).toBe('boats.index.quotaReached')

  await w.find('button').trigger('click')
  expect(visit).not.toHaveBeenCalled()
  expect(w.find('.upgrade-modal').exists()).toBe(true)
})

test('hides the badge for an unlimited (enterprise) quota', () => {
  const w = mountButton(true, { used: 5, limit: null })

  expect(w.text()).not.toContain('5/')
  expect(w.find('.upgrade-modal').exists()).toBe(false)
})
