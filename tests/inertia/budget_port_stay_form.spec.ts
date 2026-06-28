import { mount } from '@vue/test-utils'
import { test, expect, vi } from 'vitest'
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
