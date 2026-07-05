import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import type { InvoiceLineInput } from '../../shared/types/invoice'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :aria-label="ariaLabel" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'ariaLabel'],
  },
}))

vi.mock('~/components/base/BaseInput.vue', () => ({
  default: {
    template: '<input :name="name" :value="modelValue" />',
    props: ['modelValue', 'label', 'name', 'type', 'inputmode', 'min', 'step'],
  },
}))

import InvoiceLinesEditor from '../../inertia/components/invoices/InvoiceLinesEditor.vue'

function mountEditor(lines: InvoiceLineInput[]) {
  return mount(InvoiceLinesEditor, {
    props: { modelValue: lines, taxRate: 20, currency: 'EUR' },
  })
}

describe('InvoiceLinesEditor', () => {
  test('shows the live computed amount for each line', () => {
    const wrapper = mountEditor([{ label: 'A', quantity: 2, unitPrice: 100 }])
    expect(wrapper.text()).toContain('200') // 2 * 100, formatted with currency
  })

  test('adding a line emits an extra default line', async () => {
    const wrapper = mountEditor([{ label: 'A', quantity: 2, unitPrice: 100 }])
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('invoices.lines.add'))
    expect(addBtn).toBeDefined()
    await addBtn!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')!
    const lastPayload = emitted[emitted.length - 1][0] as InvoiceLineInput[]
    expect(lastPayload).toHaveLength(2)
    expect(lastPayload[1]).toEqual({ label: '', quantity: 1, unitPrice: 0 })
  })

  test('removing a line emits the remaining lines', async () => {
    const wrapper = mountEditor([
      { label: 'A', quantity: 1, unitPrice: 100 },
      { label: 'B', quantity: 1, unitPrice: 50 },
    ])
    const removeBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === 'invoices.lines.remove')
    expect(removeBtn).toBeDefined()
    await removeBtn!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')!
    const payload = emitted[emitted.length - 1][0] as InvoiceLineInput[]
    expect(payload).toHaveLength(1)
    expect(payload[0].label).toBe('B')
  })
})
