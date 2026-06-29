import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
import BudgetEntryForm from '../../inertia/components/boats/budget/BudgetEntryForm.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string) => key,
  }),
}))

const mockPost = vi.fn()
vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({
    label: '',
    amount: '',
    date: '',
    category: '',
    description: '',
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

vi.mock('~/components/base/BaseSelect.vue', () => ({
  default: {
    template: '<select />',
    props: ['modelValue', 'label', 'options', 'error'],
  },
}))

vi.mock('~/components/base/BaseTextarea.vue', () => ({
  default: { template: '<textarea />', props: ['modelValue', 'label', 'error', 'rows'] },
}))

test('renders the form title', () => {
  const w = mount(BudgetEntryForm, { props: { boatId: 1 } })
  expect(w.text()).toContain('budget.entries.formTitle')
})

test('renders all required inputs', () => {
  const w = mount(BudgetEntryForm, { props: { boatId: 1 } })
  expect(w.findAll('input').length).toBeGreaterThanOrEqual(3)
})

test('renders the submit button', () => {
  const w = mount(BudgetEntryForm, { props: { boatId: 1 } })
  expect(w.text()).toContain('budget.entries.submit')
})

test('calls form.post on submit', async () => {
  const w = mount(BudgetEntryForm, { props: { boatId: 42 } })
  await w.find('form').trigger('submit')
  expect(mockPost).toHaveBeenCalledWith('/boats/42/budget/entries', expect.any(Object))
})
