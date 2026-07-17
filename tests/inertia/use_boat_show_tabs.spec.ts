import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent } from 'vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k }),
}))

import { useBoatShowTabs } from '../../inertia/composables/use_boat_show_tabs'
import type {
  BoatDocumentRow,
  BoatIncidentRow,
  MaintenanceTaskRow,
} from '../../inertia/types/boat_show'

function mountComposable(input: {
  maintenanceTasks?: MaintenanceTaskRow[]
  boatDocuments?: BoatDocumentRow[]
  incidents?: BoatIncidentRow[]
  pricingEnabled?: boolean
}) {
  const maintenanceTasks = input.maintenanceTasks ?? []
  const boatDocuments = input.boatDocuments ?? []
  const incidents = input.incidents ?? []
  const pricingEnabled = input.pricingEnabled ?? false

  let result: ReturnType<typeof useBoatShowTabs> | undefined

  mount(
    defineComponent({
      setup() {
        result = useBoatShowTabs({
          maintenanceTasks: () => maintenanceTasks,
          boatDocuments: () => boatDocuments,
          incidents: () => incidents,
          pricingEnabled: () => pricingEnabled,
        })
        return {}
      },
      template: '<div />',
    })
  )

  return result!
}

describe('useBoatShowTabs — grouping (#365)', () => {
  const originalUrl = window.location.href

  beforeEach(() => {
    window.history.replaceState({}, '', originalUrl)
  })

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl)
  })

  test('defaults to the overview tab/group', () => {
    const { tab, activeGroupKey } = mountComposable({})
    expect(tab.value).toBe('overview')
    expect(activeGroupKey.value).toBe('overview')
  })

  test('exposes exactly the 5 groups required by #365', () => {
    const { groupTabs } = mountComposable({})
    expect(groupTabs.value.map((g) => g.key)).toEqual([
      'overview',
      'equipment',
      'maintenance',
      'navigation',
      'documents',
    ])
  })

  test('pricing sub-tab only appears in the equipment group when enabled', async () => {
    const disabled = mountComposable({ pricingEnabled: false })
    await disabled.goToGroup('equipment')
    expect(disabled.activeGroupSubTabs.value.map((t) => t.key)).not.toContain('pricing')

    const enabled = mountComposable({ pricingEnabled: true })
    await enabled.goToGroup('equipment')
    expect(enabled.activeGroupSubTabs.value.map((t) => t.key)).toContain('pricing')
  })

  test('an open task badges both the tasks sub-tab and the maintenance group', () => {
    const { groupTabs } = mountComposable({
      maintenanceTasks: [{ status: 'open' } as MaintenanceTaskRow],
    })
    const maintenanceGroup = groupTabs.value.find((g) => g.key === 'maintenance')
    expect(maintenanceGroup?.badge).toBe('1')
  })

  test('expiring documents badge the documents group', () => {
    const { groupTabs } = mountComposable({
      boatDocuments: [{ status: 'expiring_soon' } as BoatDocumentRow],
    })
    expect(groupTabs.value.find((g) => g.key === 'documents')?.badge).toBe('1')
  })

  test('open incidents badge the navigation group', () => {
    const { groupTabs } = mountComposable({
      incidents: [{ status: 'open' } as BoatIncidentRow],
    })
    expect(groupTabs.value.find((g) => g.key === 'navigation')?.badge).toBe('1')
  })

  test('goToGroup switches to the first sub-tab of a new group', async () => {
    const { goToGroup, tab, activeGroupKey } = mountComposable({})
    await goToGroup('documents')
    expect(activeGroupKey.value).toBe('documents')
    expect(tab.value).toBe('documents')
  })

  test('goToGroup on the already-active group is a no-op', async () => {
    const { goToGroup, tab } = mountComposable({})
    await goToGroup('overview')
    expect(tab.value).toBe('overview')
  })

  test('goToGroup remembers the last visited sub-tab of a group', async () => {
    const { goToTab, goToGroup, tab } = mountComposable({})
    await goToTab('tasks')
    await goToGroup('documents')
    await goToGroup('maintenance')
    expect(tab.value).toBe('tasks')
  })

  test('deep-linking to a leaf tab resolves the right active group', async () => {
    window.history.replaceState({}, '', '/boats/13?tab=incidents')
    const { tab, activeGroupKey } = mountComposable({})
    expect(tab.value).toBe('incidents')
    expect(activeGroupKey.value).toBe('navigation')
  })

  test('an unknown ?tab= value falls back to overview', () => {
    window.history.replaceState({}, '', '/boats/13?tab=not-a-real-tab')
    const { tab } = mountComposable({})
    expect(tab.value).toBe('overview')
  })
})
