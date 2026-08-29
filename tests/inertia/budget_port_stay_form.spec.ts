import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BaseCombobox from '../../inertia/components/base/BaseCombobox.vue'
import BudgetPortStayForm from '../../inertia/components/boats/budget/BudgetPortStayForm.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

const mockPost = vi.fn()
vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({
    portName: '',
    startedAt: '',
    endedAt: '',
    cost: '',
    notes: '',
    errors: {},
    processing: false,
    post: mockPost,
    reset: vi.fn(),
  }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: { template: '<button><slot /></button>' },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: { template: '<input />', props: ['modelValue', 'label', 'error', 'type', 'required'] },
}))

test('renders the form title', () => {
  const w = mount(BudgetPortStayForm, { props: { boatId: 1 } })
  expect(w.text()).toContain('budget.portStay.formTitle')
})

test('renders submit button', () => {
  const w = mount(BudgetPortStayForm, { props: { boatId: 1 } })
  expect(w.text()).toContain('budget.portStay.submit')
})

test('calls form.post on submit', async () => {
  const w = mount(BudgetPortStayForm, { props: { boatId: 7 } })
  await w.find('form').trigger('submit')
  expect(mockPost).toHaveBeenCalledWith('/boats/7/port-stays', expect.any(Object))
})

// Nom du port assisté par les ports de l'organisation (#579) — saisie libre conservée.
const PORTS = [
  { id: 4, name: 'Concarneau' },
  { id: 7, name: 'Port-la-Forêt' },
]

test('le nom du port est une combobox alimentée par les ports de l’organisation', () => {
  const w = mount(BudgetPortStayForm, { props: { boatId: 1, portOptions: PORTS } })
  const combobox = w.findComponent(BaseCombobox)

  expect(combobox.props('options')).toEqual([
    { value: '4', label: 'Concarneau' },
    { value: '7', label: 'Port-la-Forêt' },
  ])
  expect(combobox.props('hint')).toBe('budget.portStay.portNameHint')
})

test('sans port enregistré, la combobox ne propose rien et n’affiche pas d’aide', () => {
  const w = mount(BudgetPortStayForm, { props: { boatId: 1 } })
  const combobox = w.findComponent(BaseCombobox)

  expect(combobox.props('options')).toEqual([])
  expect(combobox.props('hint')).toBeUndefined()
})

test('la saisie libre du nom de port remonte telle quelle au formulaire', async () => {
  const w = mount(BudgetPortStayForm, { props: { boatId: 1, portOptions: PORTS } })

  await w.find('input#portStayPortName').setValue('Mouillage des Glénan')

  // La combobox ne normalise rien : la valeur hors référentiel part telle quelle.
  expect(w.findComponent(BaseCombobox).emitted('update:modelValue')).toEqual([
    ['Mouillage des Glénan'],
  ])
})
