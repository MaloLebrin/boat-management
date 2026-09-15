import { expect, test, vi } from 'vitest'
import NewBoatButton from '../../inertia/components/boats/NewBoatButton.vue'
import type { QuotaUsage } from '../../shared/types/plan'
import { mountWithStubs, routerSpies } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

function mountButton(canAddBoat: boolean, quota: QuotaUsage['boats']) {
  return mountWithStubs(NewBoatButton, {
    props: { canAddBoat, quota },
    stubs: {
      // La variante warning (pêche) du vrai `BaseBadge` fait partie de l'assertion.
      BaseBadge: false,
      // Modale d'upsell : on vérifie seulement son ouverture (prop `open`).
      UpgradePlanModal: { props: ['open'], template: '<div class="upgrade-modal" v-if="open" />' },
    },
  })
}

test('shows the used/limit badge below the quota and navigates on click', async () => {
  const w = mountButton(true, { used: 1, limit: 2 })

  const badge = w.find('.inline-flex').text()
  expect(badge).toContain('1/2')
  // Pas de tooltip « limite atteinte » quand il reste de la place.
  expect(w.find('.inline-flex').attributes('title')).toBeUndefined()

  await w.find('button').trigger('click')
  expect(routerSpies.visit).toHaveBeenCalledWith('/boats/new')
  expect(w.find('.upgrade-modal').exists()).toBe(false)
})

test('at the quota: warning badge, tooltip, and opens the upsell modal instead of navigating', async () => {
  const w = mountButton(false, { used: 2, limit: 2 })

  expect(w.text()).toContain('2/2')
  // Variante warning de BaseBadge (péche) au plafond.
  expect(w.html()).toContain('bg-peach-100')
  expect(w.find('.inline-flex').attributes('title')).toBe('boats.index.quotaReached')

  await w.find('button').trigger('click')
  expect(routerSpies.visit).not.toHaveBeenCalled()
  expect(w.find('.upgrade-modal').exists()).toBe(true)
})

test('hides the badge for an unlimited (enterprise) quota', () => {
  const w = mountButton(true, { used: 5, limit: null })

  expect(w.text()).not.toContain('5/')
  expect(w.find('.upgrade-modal').exists()).toBe(false)
})
