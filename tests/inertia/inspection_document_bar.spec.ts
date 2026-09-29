import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/vue3', () => ({
  router: { post: mockPost },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}(${Object.values(params).join('|')})` : key,
    locale: { value: 'en' },
  }),
}))

vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `dt:${value}` }),
}))

import InspectionDocumentBar from '../../inertia/components/reservations/inspection/InspectionDocumentBar.vue'
import type { InspectionWithPhotos } from '../../inertia/types/inspection'

/** Barre « document » d'un état des lieux : brouillon, signature, envoi (#889). */
describe('InspectionDocumentBar (#889)', () => {
  beforeEach(() => mockPost.mockReset())

  const draft: InspectionWithPhotos = {
    id: 5,
    reservationId: 7,
    kind: 'checkout',
    performedAt: '2026-07-01T08:00:00.000Z',
    fuelLevel: 80,
    engineHours: null,
    notes: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
    lockedAt: null,
    sentAt: null,
    signatures: [],
    photos: [],
    actions: [],
    items: [],
  }

  const signed: InspectionWithPhotos = {
    ...draft,
    lockedAt: '2026-07-01T09:00:00.000Z',
    signatures: [
      { role: 'client', signerName: 'Alice Martin', signedAt: '2026-07-01T09:00:00.000Z' },
      { role: 'staff', signerName: 'Marc Le Goff', signedAt: '2026-07-01T09:00:00.000Z' },
    ],
  }

  function mountBar(inspection: InspectionWithPhotos, canEdit = true) {
    return mount(InspectionDocumentBar, {
      props: { basePath: '/boats/3/reservations/7', inspection, clientName: 'Alice', canEdit },
      global: {
        stubs: {
          BaseButton: {
            props: ['href'],
            template: '<button :data-href="href" v-bind="$attrs"><slot /></button>',
          },
          InspectionSignModal: {
            props: ['open', 'signUrl', 'clientName'],
            template: '<div data-testid="sign-modal" :data-open="open" :data-url="signUrl" />',
          },
        },
      },
    })
  }

  function button(wrapper: ReturnType<typeof mountBar>, label: string) {
    return wrapper.findAll('button').find((candidate) => candidate.text() === label)
  }

  test('a draft offers the draft PDF and the signature', async () => {
    const wrapper = mountBar(draft)

    expect(wrapper.text()).toContain('inspections.signature.draft')
    expect(button(wrapper, 'inspections.signature.pdfDraft')!.attributes('data-href')).toBe(
      '/boats/3/reservations/7/inspections/5/pdf?inline=1'
    )
    expect(button(wrapper, 'inspections.signature.send')).toBeUndefined()

    await button(wrapper, 'inspections.signature.sign')!.trigger('click')
    const modal = wrapper.get('[data-testid="sign-modal"]')
    expect(modal.attributes('data-open')).toBe('true')
    expect(modal.attributes('data-url')).toBe('/boats/3/reservations/7/inspections/5/sign')
  })

  test('a signed inspection shows its signers and can be sent', async () => {
    const wrapper = mountBar(signed)

    expect(wrapper.text()).toContain('inspections.signature.signedOn(dt:2026-07-01T09:00:00.000Z)')
    expect(wrapper.text()).toContain('Alice Martin')
    expect(wrapper.text()).toContain('Marc Le Goff')
    expect(button(wrapper, 'inspections.signature.sign')).toBeUndefined()
    expect(wrapper.find('[data-testid="sign-modal"]').exists()).toBe(false)

    await button(wrapper, 'inspections.signature.send')!.trigger('click')
    expect(mockPost).toHaveBeenCalledWith(
      '/boats/3/reservations/7/inspections/5/send',
      {},
      expect.objectContaining({ preserveScroll: true })
    )
  })

  test('once sent, the button offers to send again', () => {
    const wrapper = mountBar({ ...signed, sentAt: '2026-07-01T10:00:00.000Z' })

    expect(button(wrapper, 'inspections.signature.resend')).toBeDefined()
    expect(wrapper.text()).toContain('inspections.signature.sentOn(dt:2026-07-01T10:00:00.000Z)')
  })

  test('without edit rights, only the PDF remains', () => {
    const wrapper = mountBar(draft, false)

    expect(wrapper.findAll('button').map((candidate) => candidate.text())).toEqual([
      'inspections.signature.pdfDraft',
    ])
  })
})
