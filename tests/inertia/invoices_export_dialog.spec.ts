import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import InvoicesExportDialog from '../../inertia/components/invoices/InvoicesExportDialog.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

const BASE_STUBS = {
  BaseButton: {
    name: 'BaseButton',
    props: ['variant', 'size', 'disabled', 'type', 'href', 'externalHref'],
    emits: ['click'],
    // Rendu réel : un `href` donne une ancre, sinon un bouton.
    template:
      '<a v-if="href" data-base-button :href="href" @click="$emit(\'click\', $event)"><slot /></a><button v-else data-base-button :type="type ?? \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  BaseInput: {
    name: 'BaseInput',
    props: ['label', 'id', 'type', 'modelValue'],
    emits: ['update:modelValue'],
    template:
      '<div data-base-input><input :id="id" :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
  },
  BaseSelect: {
    name: 'BaseSelect',
    props: ['label', 'id', 'modelValue', 'options'],
    emits: ['update:modelValue'],
    template: `<div data-base-select>
      <select :id="id" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
        <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>`,
  },
  BaseModal: {
    name: 'BaseModal',
    props: ['open', 'title', 'size'],
    emits: ['update:open'],
    template: '<div v-if="open" data-base-modal><slot /><slot name="footer" /></div>',
  },
}

function mountDialog() {
  return mount(InvoicesExportDialog, {
    global: { stubs: BASE_STUBS },
  })
}

describe('InvoicesExportDialog — CSV href', () => {
  test('default CSV href has detail=documents', async () => {
    const w = mountDialog()
    await w.find('[data-base-button]').trigger('click')

    const csvAnchor = w.findAll('a').find((a) => a.attributes('href')?.includes('export.csv'))
    expect(csvAnchor?.attributes('href')).toBe('/invoices/export.csv?detail=documents')
  })

  test('includes kind and status when selected', async () => {
    const w = mountDialog()
    await w.find('[data-base-button]').trigger('click')

    const selects = w.findAll('select')
    // Find the kind select (has invoice option)
    const kindSelect = selects.find((s) =>
      s.findAll('option').some((o) => o.attributes('value') === 'invoice')
    )!
    await kindSelect.setValue('invoice')

    // Find the status select (has paid option)
    const statusSelect = selects.find((s) =>
      s.findAll('option').some((o) => o.attributes('value') === 'paid')
    )!
    await statusSelect.setValue('paid')

    const csvAnchor = w.findAll('a').find((a) => a.attributes('href')?.includes('export.csv'))
    expect(csvAnchor?.attributes('href')).toContain('kind=invoice')
    expect(csvAnchor?.attributes('href')).toContain('status=paid')
  })

  test('detail=lines when per-line is selected', async () => {
    const w = mountDialog()
    await w.find('[data-base-button]').trigger('click')

    const selects = w.findAll('select')
    // Find the detail select (has lines option)
    const detailSelect = selects.find((s) =>
      s.findAll('option').some((o) => o.attributes('value') === 'lines')
    )!
    await detailSelect.setValue('lines')

    const csvAnchor = w.findAll('a').find((a) => a.attributes('href')?.includes('export.csv'))
    expect(csvAnchor?.attributes('href')).toContain('detail=lines')
  })
})

describe('InvoicesExportDialog — FEC href', () => {
  test('FEC href includes current year by default', async () => {
    const w = mountDialog()
    await w.find('[data-base-button]').trigger('click')

    const currentYear = new Date().getFullYear()
    const fecAnchor = w.findAll('a').find((a) => a.attributes('href')?.includes('/fec'))
    expect(fecAnchor?.attributes('href')).toBe(`/invoices/export/fec?year=${currentYear}`)
  })

  test('FEC year can be changed', async () => {
    const w = mountDialog()
    await w.find('[data-base-button]').trigger('click')

    const selects = w.findAll('select')
    // Find the year select (has numeric year values)
    const yearSelect = selects.find((s) =>
      s.findAll('option').some((o) => /^\d{4}$/.test(o.attributes('value') ?? ''))
    )!
    const previousYear = new Date().getFullYear() - 1
    await yearSelect.setValue(String(previousYear))

    const fecAnchor = w.findAll('a').find((a) => a.attributes('href')?.includes('/fec'))
    expect(fecAnchor?.attributes('href')).toBe(`/invoices/export/fec?year=${previousYear}`)
  })
})
