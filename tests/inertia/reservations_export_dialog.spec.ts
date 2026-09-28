import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import ReservationsExportDialog from '../../inertia/components/reservations/ReservationsExportDialog.vue'
import ClientsExportDialog from '../../inertia/components/clients/ClientsExportDialog.vue'

vi.mock('~/composables/use_t', () => ({
  useT: () => ({ t: (k: string) => k, locale: { value: 'fr' } }),
}))

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'fr' } }),
}))

/**
 * Exports flotte (#879) : les dialogues réservations et clients passent par
 * `ExportDialog` ; leurs filtres doivent arriver dans l'URL de l'export.
 */
const STUBS = {
  BaseButton: {
    props: ['variant', 'size', 'disabled', 'type', 'href', 'externalHref'],
    emits: ['click'],
    template:
      '<a v-if="href" data-base-button :href="href" @click="$emit(\'click\', $event)"><slot /></a><button v-else data-base-button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  BaseInput: {
    props: ['label', 'id', 'type', 'modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :id="id" :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  BaseSelect: {
    props: ['label', 'id', 'options', 'modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :id="id" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
  },
  BaseModal: {
    props: ['open', 'title'],
    template: '<div v-if="open"><slot /><slot name="footer" /></div>',
  },
}

describe('ReservationsExportDialog', () => {
  test('boat, status and payment filters land in the export URL', async () => {
    const w = mount(ReservationsExportDialog, {
      props: { boats: [{ id: 7, name: 'Ondine' }] },
      global: { stubs: STUBS },
    })
    await w.find('button[data-base-button]').trigger('click')

    expect(w.find('a').attributes('href')).toBe('/reservations/export.csv')

    await w.find('#reservation-export-boat').setValue('7')
    await w.find('#reservation-export-status').setValue('confirmed')
    await w.find('#reservation-export-payment').setValue('deposit_paid')
    await w.find('#export-from').setValue('2026-06-01')

    expect(w.find('a').attributes('href')).toBe(
      '/reservations/export.csv?from=2026-06-01&boatId=7&status=confirmed&paymentStatus=deposit_paid'
    )
  })
})

describe('ClientsExportDialog', () => {
  test('exports the client records, with the anonymized hint', async () => {
    const w = mount(ClientsExportDialog, { global: { stubs: STUBS } })
    await w.find('button[data-base-button]').trigger('click')

    expect(w.find('a').attributes('href')).toBe('/clients/export.csv')
    expect(w.text()).toContain('common.exports.clients.anonymizedHint')
  })
})
