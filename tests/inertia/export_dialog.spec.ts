import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import ExportDialog from '../../inertia/components/exports/ExportDialog.vue'

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
  BaseModal: {
    name: 'BaseModal',
    props: ['open', 'title'],
    emits: ['update:open'],
    template: '<div v-if="open" data-base-modal><slot /><slot name="footer" /></div>',
  },
}

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(ExportDialog, {
    props: {
      label: 'Export',
      title: 'Export data',
      baseUrl: '/test/export.csv',
      ...props,
    },
    global: { stubs: BASE_STUBS },
  })
}

describe('ExportDialog — href building', () => {
  test('basic URL without params', async () => {
    const w = mountDialog()
    await w.find('[data-base-button]').trigger('click')

    const anchor = w.find('a')
    expect(anchor.attributes('href')).toBe('/test/export.csv')
  })

  test('omits empty period params', async () => {
    const w = mountDialog()
    await w.find('[data-base-button]').trigger('click')

    // Leave from/to empty
    const anchor = w.find('a')
    expect(anchor.attributes('href')).toBe('/test/export.csv')
  })

  test('includes period params when set', async () => {
    const w = mountDialog()
    await w.find('[data-base-button]').trigger('click')

    const inputs = w.findAll('input')
    await inputs[0].setValue('2024-01-01')
    await inputs[1].setValue('2024-12-31')

    const anchor = w.find('a')
    expect(anchor.attributes('href')).toBe('/test/export.csv?from=2024-01-01&to=2024-12-31')
  })

  test('includes extra params', async () => {
    const w = mountDialog({
      params: { status: 'active', kind: 'invoice' },
    })
    await w.find('[data-base-button]').trigger('click')

    const anchor = w.find('a')
    expect(anchor.attributes('href')).toBe('/test/export.csv?status=active&kind=invoice')
  })

  test('omits null and empty string params', async () => {
    const w = mountDialog({
      params: { status: null, kind: '', valid: 'yes' },
    })
    await w.find('[data-base-button]').trigger('click')

    const anchor = w.find('a')
    expect(anchor.attributes('href')).toBe('/test/export.csv?valid=yes')
  })

  test('hides period inputs when showPeriod is false', async () => {
    const w = mountDialog({ showPeriod: false })
    await w.find('[data-base-button]').trigger('click')

    const inputs = w.findAll('input')
    expect(inputs).toHaveLength(0)
  })
})
