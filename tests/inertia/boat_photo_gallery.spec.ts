import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test } from 'vitest'
import { vi } from 'vitest'
import BoatPhotoGallery from '../../inertia/components/boats/show/BoatPhotoGallery.vue'

const mockFormPost = vi.hoisted(() => vi.fn())
const mockForm = vi.hoisted(() => ({
  files: [] as File[],
  processing: false,
  post: mockFormPost,
  reset: vi.fn(),
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => mockForm,
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
}))

vi.mock('@adonisjs/inertia/vue', () => ({
  Form: {
    template: '<form><slot :processing="false" /></form>',
    props: ['action'],
  },
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template:
      '<button :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled', 'route'],
  },
}))

function photo(id: number) {
  return {
    id,
    kind: 'photo' as const,
    secureUrl: `https://cdn.test/photo-${id}.jpg`,
    originalFilename: `photo-${id}.jpg`,
    format: 'jpg',
    bytes: 1024,
    width: 800,
    height: 600,
    position: id,
    caption: null,
  }
}

const baseProps = {
  boat: { id: 3, media: [] as unknown[] },
  canManage: true,
}

describe('BoatPhotoGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockForm.files = []
    mockForm.processing = false
  })

  test('renders the empty state when the boat has no photos', () => {
    const wrapper = mount(BoatPhotoGallery, { props: baseProps as never })

    expect(wrapper.text()).toContain('boats.show.mediaUpload.noPhotos')
    expect(wrapper.findAll('img')).toHaveLength(0)
  })

  test('renders one image per photo, filtered to kind=photo', () => {
    const wrapper = mount(BoatPhotoGallery, {
      props: { ...baseProps, boat: { id: 3, media: [photo(1), photo(2)] } } as never,
    })

    const images = wrapper.findAll('img')
    expect(images).toHaveLength(2)
  })

  test('allows selecting multiple files and posts them in one request', async () => {
    const wrapper = mount(BoatPhotoGallery, { props: baseProps as never })
    const files = [
      new File(['x'], 'boat-1.jpg', { type: 'image/jpeg' }),
      new File(['y'], 'boat-2.jpg', { type: 'image/jpeg' }),
    ]
    const input = wrapper.find('input[type="file"]')

    expect(input.attributes('multiple')).toBeDefined()

    Object.defineProperty(input.element, 'files', { value: files })
    await input.trigger('change')

    expect(mockFormPost).toHaveBeenCalledTimes(1)
    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/3/photos',
      expect.objectContaining({ forceFormData: true, preserveScroll: true })
    )
    expect(mockForm.files).toEqual(files)
  })

  test('does not post when the file input is cleared', async () => {
    const wrapper = mount(BoatPhotoGallery, { props: baseProps as never })
    const input = wrapper.find('input[type="file"]')

    Object.defineProperty(input.element, 'files', { value: [] })
    await input.trigger('change')

    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('hides the upload controls when canManage is false', () => {
    const wrapper = mount(BoatPhotoGallery, {
      props: { ...baseProps, canManage: false } as never,
    })

    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  })
})
