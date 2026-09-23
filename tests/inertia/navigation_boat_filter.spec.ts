import { describe, expect, test, vi } from 'vitest'
import NavigationBoatFilter from '../../inertia/components/navigation/NavigationBoatFilter.vue'
import { mountWithStubs, routerSpies } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

const boats = [
  { id: 1, name: 'Mistral' },
  { id: 2, name: 'Zephyr' },
]

function mountFilter(props: Partial<{ boats: typeof boats; selectedBoatId: number | null }>) {
  return mountWithStubs(NavigationBoatFilter, {
    props: { boats, selectedBoatId: null, basePath: '/navigation/logbook', ...props },
  })
}

describe('NavigationBoatFilter', () => {
  test('lists every boat behind an "all boats" placeholder', () => {
    const w = mountFilter({})
    const options = w.findAll('[data-base-select] option')
    expect(options.map((o) => o.attributes('value'))).toEqual(['', '1', '2'])
    expect(options[0].text()).toBe('navigation.filter.allBoats')
    expect(w.find('label').text()).toBe('navigation.filter.filterByBoat')
  })

  test('choosing a boat navigates to the base path with its id', async () => {
    const w = mountFilter({})
    await w.find('[data-base-select] select').setValue('2')
    expect(routerSpies.get).toHaveBeenCalledWith(
      '/navigation/logbook',
      { boatId: '2' },
      { preserveScroll: true, replace: true }
    )
  })

  test('clearing the filter navigates without any boat id', async () => {
    const w = mountFilter({ selectedBoatId: 2 })
    await w.find('[data-base-select] select').setValue('')
    expect(routerSpies.get).toHaveBeenCalledWith(
      '/navigation/logbook',
      {},
      { preserveScroll: true, replace: true }
    )
  })

  test('follows the selected boat served by the server', async () => {
    const w = mountFilter({})
    await w.setProps({ selectedBoatId: 2 })
    expect((w.find('[data-base-select] select').element as HTMLSelectElement).value).toBe('2')
  })

  test('disappears entirely for a single-boat fleet (#823)', () => {
    const w = mountFilter({ boats: [{ id: 7, name: 'Mistral' }] })
    expect(w.find('[data-base-select]').exists()).toBe(false)
    expect(w.find('label').exists()).toBe(false)
  })

  test('comes back when a second boat joins the fleet', async () => {
    const w = mountFilter({ boats: [{ id: 7, name: 'Mistral' }] })
    await w.setProps({ boats })
    expect(w.find('[data-base-select]').exists()).toBe(true)
  })
})
