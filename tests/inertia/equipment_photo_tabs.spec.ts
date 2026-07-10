import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import EnginePartShowTabPhotos from '../../inertia/components/engine/parts/show/tabs/EnginePartShowTabPhotos.vue'
import EngineShowTabPhotos from '../../inertia/components/engine/show/tabs/EngineShowTabPhotos.vue'
import GenericShowTabPhotos from '../../inertia/components/boats/equipment/show/tabs/GenericShowTabPhotos.vue'
import RigShowTabPhotos from '../../inertia/components/boats/rig/show/tabs/RigShowTabPhotos.vue'
import SafetyShowTabPhotos from '../../inertia/components/boats/safety/show/tabs/SafetyShowTabPhotos.vue'
import SailShowTabPhotos from '../../inertia/components/boats/sail/show/tabs/SailShowTabPhotos.vue'

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => ({ files: [], processing: false, post: vi.fn(), reset: vi.fn() }),
  router: { delete: vi.fn() },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('~/components/base/BaseCard.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

/** Captures the URLs each tab hands to the shared gallery. */
const gallerySpy = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))

vi.mock('~/components/media/MediaPhotoGallery.vue', () => ({
  default: {
    template: '<div class="gallery" />',
    props: ['uploadUrl', 'deleteUrlFor', 'photos', 'canUpload', 'canDelete'],
    setup(props: Record<string, unknown>) {
      gallerySpy.props = props
    },
  },
}))

const boat = { id: 7, name: 'Mistral' }
const photos = [
  {
    id: 3,
    kind: 'photo' as const,
    secureUrl: 'https://cdn.test/a.jpg',
    originalFilename: 'a.jpg',
    format: 'jpg',
    bytes: 10,
    width: 1,
    height: 1,
    position: 0,
    caption: null,
  },
]

function galleryProps() {
  if (!gallerySpy.props) throw new Error('MediaPhotoGallery was not rendered')
  return gallerySpy.props as {
    uploadUrl: string
    deleteUrlFor: (id: number) => string
    photos: unknown[]
    canUpload: boolean
    canDelete: boolean
  }
}

describe('equipment photo tabs', () => {
  // Reset between tests so a component that fails to render cannot pass on stale props.
  beforeEach(() => {
    gallerySpy.props = null
  })

  test('engine tab targets the engine photo routes', () => {
    mount(EngineShowTabPhotos, {
      props: { boat, engine: { id: 4, photos } as never, canManage: true },
    })

    const p = galleryProps()
    expect(p.uploadUrl).toBe('/boats/7/engines/4/photos')
    expect(p.deleteUrlFor(9)).toBe('/boats/7/engines/4/photos/9')
    expect(p.photos).toHaveLength(1)
  })

  test('engine part tab nests under its engine', () => {
    mount(EnginePartShowTabPhotos, {
      props: { boat, engine: { id: 4 }, part: { id: 11, photos } as never, canManage: true },
    })

    const p = galleryProps()
    expect(p.uploadUrl).toBe('/boats/7/engines/4/parts/11/photos')
    expect(p.deleteUrlFor(9)).toBe('/boats/7/engines/4/parts/11/photos/9')
  })

  test('sail tab targets the sail photo routes', () => {
    mount(SailShowTabPhotos, {
      props: { boat, sail: { id: 5, photos } as never, canManage: true },
    })

    const p = galleryProps()
    expect(p.uploadUrl).toBe('/boats/7/sails/5/photos')
    expect(p.deleteUrlFor(9)).toBe('/boats/7/sails/5/photos/9')
  })

  test('rig tab targets the singleton rig route', () => {
    mount(RigShowTabPhotos, {
      props: { boat, rig: { id: 2, photos } as never, canManage: true },
    })

    const p = galleryProps()
    expect(p.uploadUrl).toBe('/boats/7/rig/photos')
    expect(p.deleteUrlFor(9)).toBe('/boats/7/rig/photos/9')
  })

  test('generic equipment tab targets the generic-equipment routes', () => {
    mount(GenericShowTabPhotos, {
      props: { boat, item: { id: 8, photos } as never, canManage: true },
    })

    const p = galleryProps()
    expect(p.uploadUrl).toBe('/boats/7/generic-equipment/8/photos')
    expect(p.deleteUrlFor(9)).toBe('/boats/7/generic-equipment/8/photos/9')
  })

  test('safety equipment tab targets the safety-equipment routes', () => {
    mount(SafetyShowTabPhotos, {
      props: { boat, item: { id: 6, photos } as never, canManage: true },
    })

    const p = galleryProps()
    expect(p.uploadUrl).toBe('/boats/7/safety-equipment/6/photos')
    expect(p.deleteUrlFor(9)).toBe('/boats/7/safety-equipment/6/photos/9')
  })

  test('canManage=false makes the gallery read-only', () => {
    mount(SailShowTabPhotos, {
      props: { boat, sail: { id: 5, photos } as never, canManage: false },
    })

    const p = galleryProps()
    expect(p.canUpload).toBe(false)
    expect(p.canDelete).toBe(false)
  })
})
