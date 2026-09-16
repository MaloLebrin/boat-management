import { expect, test, vi } from 'vitest'
import BudgetEntryForm from '../../inertia/components/boats/budget/BudgetEntryForm.vue'
import { formSpies, mountWithStubs } from './helpers/mount'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

test('renders the form title', () => {
  const w = mountWithStubs(BudgetEntryForm, { props: { boatId: 1 } })
  expect(w.text()).toContain('budget.entries.formTitle')
})

test('renders all required inputs', () => {
  const w = mountWithStubs(BudgetEntryForm, { props: { boatId: 1 } })
  expect(w.findAll('input').length).toBeGreaterThanOrEqual(3)
})

test('renders the submit button', () => {
  const w = mountWithStubs(BudgetEntryForm, { props: { boatId: 1 } })
  expect(w.text()).toContain('budget.entries.submit')
})

test('calls form.post on submit', async () => {
  const w = mountWithStubs(BudgetEntryForm, { props: { boatId: 42 } })
  await w.find('form').trigger('submit')
  expect(formSpies.post).toHaveBeenCalledWith('/boats/42/budget/entries', expect.any(Object))
})
