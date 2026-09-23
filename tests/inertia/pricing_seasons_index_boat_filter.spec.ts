import { describe, expect, test, vi } from 'vitest'
import PricingSeasonsIndex from '../../inertia/pages/pricing/seasons/index.vue'
import type { BoatOption } from '../../shared/types/pricing_season'
import { mountWithStubs, routerSpies } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

vi.mock('~/composables/use_number_format', () => ({
  useNumberFormat: () => ({ formatCurrency: (v: number) => `${v} €` }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDate: (s: string) => s, formatDateTime: (s: string) => s }),
}))

const fleet: BoatOption[] = [
  { id: 3, name: 'Pen Duick' },
  { id: 4, name: 'Mistral' },
]

function mountPage(boatOptions: BoatOption[]) {
  return mountWithStubs(PricingSeasonsIndex, {
    props: { seasons: [], boatOptions, filters: { boatId: null }, canDelete: false },
    stubs: {
      PricingSeasonList: { template: '<div />' },
      PricingSeasonForm: { template: '<div />' },
    },
  })
}

describe('pages/pricing/seasons — filtre bateau', () => {
  test('offers the boat filter and navigates with the chosen boat', async () => {
    const w = mountPage(fleet)
    const select = w.find('[data-base-select] select')
    expect(select.exists()).toBe(true)

    await select.setValue('3')
    expect(routerSpies.get).toHaveBeenCalledWith(
      '/pricing/seasons',
      { boatId: '3' },
      expect.objectContaining({ preserveScroll: true, replace: true })
    )
  })

  test('hides the boat filter for a single-boat fleet (#823)', () => {
    const w = mountPage([fleet[0]])
    expect(w.find('[data-base-select]').exists()).toBe(false)
    expect(w.text()).not.toContain('pricingSeasons.filter.boat')
  })
})
