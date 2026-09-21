import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
  Head: { template: '<div />' },
}))
vi.mock('@adonisjs/inertia/vue', () => ({
  Link: { props: ['href'], template: '<a :href="href"><slot /></a>' },
}))
vi.mock('~/composables/use_t', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/use_date_format', () => ({
  useDateFormat: () => ({
    formatDateTime: (v: string) => `dt:${v}`,
    formatDate: (v: string) => `d:${v}`,
  }),
}))
vi.mock('~/components/media/MediaPhotoGallery.vue', () => ({
  default: {
    props: ['uploadUrl', 'deleteUrlFor', 'photos', 'canUpload', 'canDelete'],
    template:
      '<div data-testid="gallery" :data-upload="uploadUrl" :data-delete="deleteUrlFor(9)" :data-can-upload="String(canUpload)" />',
  },
}))
vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot name="header" /><slot /></div>' },
}))
vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: false,
  },
}))

import IncidentShowTabPhotos from '../../inertia/components/boats/incidents/show/IncidentShowTabPhotos.vue'
import IncidentShowHeader from '../../inertia/components/boats/incidents/show/IncidentShowHeader.vue'
import type { BoatIncidentRow } from '../../inertia/types/boat_show'

const incident: BoatIncidentRow = {
  id: 42,
  boatId: 7,
  type: 'engine_failure',
  status: 'in_progress',
  occurredAt: '2026-06-25T10:00:00.000Z',
  location: 'Port',
  description: 'Ne démarre plus',
  insuranceClaimed: true,
  insuranceClaimRef: 'CLM-42',
  closedAt: null,
  createdAt: '2026-06-25T10:00:00.000Z',
  boatEngineId: 12,
  boatSailId: null,
  boatRigId: null,
  boatSafetyEquipmentId: null,
  boatGenericEquipmentId: null,
  boatEnginePartId: null,
  target: { type: 'engine', id: 12, name: 'Yamaha F100' },
  photosCount: 0,
}

describe('IncidentShowTabPhotos (#814)', () => {
  test('uploads to and deletes from the incident photo routes, gated by canManage', () => {
    const w = mount(IncidentShowTabPhotos, {
      props: { boatId: 7, incidentId: 42, photos: [], canManage: true },
    })

    const gallery = w.find('[data-testid="gallery"]')
    expect(gallery.attributes('data-upload')).toBe('/boats/7/incidents/42/photos')
    expect(gallery.attributes('data-delete')).toBe('/boats/7/incidents/42/photos/9')
    expect(gallery.attributes('data-can-upload')).toBe('true')
    expect(w.text()).toContain('incidents.show.photosHint')
  })

  test('a reader sees the gallery without upload nor hint', () => {
    const w = mount(IncidentShowTabPhotos, {
      props: { boatId: 7, incidentId: 42, photos: [], canManage: false },
    })

    expect(w.find('[data-testid="gallery"]').attributes('data-can-upload')).toBe('false')
    expect(w.text()).not.toContain('incidents.show.photosHint')
  })
})

describe('IncidentShowHeader (#814)', () => {
  test('shows type, status, target badge, insurance and emits edit/delete', async () => {
    const w = mount(IncidentShowHeader, {
      props: { boatId: 7, incident, canManage: true, canDelete: true },
    })

    expect(w.text()).toContain('incidents.type.engine_failure')
    expect(w.text()).toContain('incidents.status.in_progress')
    expect(w.find('[data-testid="incident-target"]').text()).toBe(
      'incidents.target.engine · Yamaha F100'
    )
    expect(w.text()).toContain('#CLM-42')

    const buttons = w.findAll('button[type="button"]')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
    expect(w.emitted('delete')).toHaveLength(1)
  })

  test('hides edit and delete without the rights', () => {
    const w = mount(IncidentShowHeader, {
      props: { boatId: 7, incident, canManage: false, canDelete: false },
    })

    expect(w.findAll('button[type="button"]')).toHaveLength(0)
    expect(w.text()).not.toContain('incidents.show.edit')
  })
})
