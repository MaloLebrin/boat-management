import { mount } from '@vue/test-utils'
import { describe, expect, test, vi, beforeEach } from 'vitest'

const patchMock = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
  router: { patch: patchMock },
}))

import DiagnosticStepList from '../../inertia/components/diagnostic/DiagnosticStepList.vue'
import { GLOBAL_CHECKLIST } from '../../shared/constants/diagnostic/diagnostic_content'

const steps = GLOBAL_CHECKLIST.steps

function mountList(overrides: Record<string, unknown> = {}) {
  return mount(DiagnosticStepList, {
    props: {
      steps,
      checkedKeys: new Set<string>(),
      canManage: true,
      boatId: 1,
      engineId: 2,
      ...overrides,
    },
  })
}

describe('DiagnosticStepList (#515)', () => {
  beforeEach(() => {
    patchMock.mockClear()
  })

  test("rend les étapes dans l'ordre du tableau de constantes", () => {
    const wrapper = mountList()
    const labels = wrapper.findAll('li p').map((p) => p.text())

    expect(wrapper.findAll('li')).toHaveLength(steps.length)
    // Les clés i18n sont rendues telles quelles par le mock de t() : l'ordre
    // des labels doit suivre l'ordre des étapes (du moins cher au plus cher).
    expect(labels[0]).toBe(steps[0].labelKey)
  })

  test('une étape cochée est barrée et son bouton pressé', () => {
    const wrapper = mountList({ checkedKeys: new Set([steps[0].key]) })

    const firstButton = wrapper.find('li button')
    expect(firstButton.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('li p').classes()).toContain('line-through')
  })

  test('le clic déclenche router.patch avec le payload et preserveScroll', async () => {
    const wrapper = mountList()

    await wrapper.find('li button').trigger('click')

    expect(patchMock).toHaveBeenCalledWith(
      '/boats/1/engines/2/diagnostic/steps',
      { stepKey: steps[0].key, checked: true },
      { preserveScroll: true }
    )
  })

  test('décocher envoie checked=false', async () => {
    const wrapper = mountList({ checkedKeys: new Set([steps[0].key]) })

    await wrapper.find('li button').trigger('click')

    expect(patchMock).toHaveBeenCalledWith(
      '/boats/1/engines/2/diagnostic/steps',
      { stepKey: steps[0].key, checked: false },
      { preserveScroll: true }
    )
  })

  test('une étape avec fiche liée rend un lien vers la fiche', () => {
    const wrapper = mountList()
    const linked = steps.find((step) => step.linkedSheet)!

    const links = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(links).toContain(`/boats/1/engines/2/diagnostic/sheets/${linked.linkedSheet}`)
  })

  test("le mode local n'appelle pas router.patch et émet toggle", async () => {
    const wrapper = mountList({ mode: 'local', boatId: undefined, engineId: undefined })

    await wrapper.find('li button').trigger('click')

    expect(patchMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('toggle')?.[0]).toEqual([steps[0].key])
  })

  test('canManage=false désactive le toggle', async () => {
    const wrapper = mountList({ canManage: false })

    await wrapper.find('li button').trigger('click')

    expect(patchMock).not.toHaveBeenCalled()
  })
})
