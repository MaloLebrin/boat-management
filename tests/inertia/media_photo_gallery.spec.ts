import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import MediaPhotoGallery from '../../inertia/components/media/MediaPhotoGallery.vue'

const mockFormPost = vi.hoisted(() => vi.fn())
const mockRouterDelete = vi.hoisted(() => vi.fn())
const mockForm = vi.hoisted(() => ({
  files: [] as File[],
  processing: false,
  post: mockFormPost,
  reset: vi.fn(),
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => mockForm,
  router: { delete: mockRouterDelete },
  usePage: () => ({ props: { appT: {}, locale: 'en' } }),
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
  uploadUrl: '/boats/1/engines/2/photos',
  deleteUrlFor: (mediaId: number) => `/boats/1/engines/2/photos/${mediaId}`,
  photos: [],
  canUpload: true,
  canDelete: true,
}

describe('MediaPhotoGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    mockForm.files = []
    mockForm.processing = false
  })

  test('renders the empty state when there are no photos', () => {
    const wrapper = mount(MediaPhotoGallery, { props: baseProps })

    expect(wrapper.text()).toContain('media.photos.empty')
    expect(wrapper.findAll('img')).toHaveLength(0)
  })

  test('renders one image per photo with its secureUrl', () => {
    const wrapper = mount(MediaPhotoGallery, {
      props: { ...baseProps, photos: [photo(1), photo(2)] },
    })

    const images = wrapper.findAll('img')
    expect(images).toHaveLength(2)
    expect(images[0].attributes('src')).toBe('https://cdn.test/photo-1.jpg')
    expect(images[1].attributes('src')).toBe('https://cdn.test/photo-2.jpg')
  })

  test('posts the selected file to uploadUrl with forceFormData', async () => {
    const wrapper = mount(MediaPhotoGallery, { props: baseProps })
    const file = new File(['x'], 'engine.jpg', { type: 'image/jpeg' })
    const input = wrapper.find('input[type="file"]')

    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')

    expect(mockFormPost).toHaveBeenCalledTimes(1)
    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/1/engines/2/photos',
      expect.objectContaining({ forceFormData: true, preserveScroll: true })
    )
    expect(mockForm.files).toEqual([file])
  })

  test('posts all selected files in a single request when several are chosen at once', async () => {
    const wrapper = mount(MediaPhotoGallery, { props: baseProps })
    const files = [
      new File(['x'], 'engine-1.jpg', { type: 'image/jpeg' }),
      new File(['y'], 'engine-2.jpg', { type: 'image/jpeg' }),
      new File(['z'], 'engine-3.jpg', { type: 'image/jpeg' }),
    ]
    const input = wrapper.find('input[type="file"]')

    expect(input.attributes('multiple')).toBeDefined()

    Object.defineProperty(input.element, 'files', { value: files })
    await input.trigger('change')

    expect(mockFormPost).toHaveBeenCalledTimes(1)
    expect(mockForm.files).toEqual(files)
  })

  test('does not post when the file input is cleared', async () => {
    const wrapper = mount(MediaPhotoGallery, { props: baseProps })
    const input = wrapper.find('input[type="file"]')

    Object.defineProperty(input.element, 'files', { value: [] })
    await input.trigger('change')

    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('deletes a photo through deleteUrlFor after confirmation', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
    const wrapper = mount(MediaPhotoGallery, {
      props: { ...baseProps, photos: [photo(42)] },
    })

    await wrapper.findAll('button').at(-1)!.trigger('click')

    expect(mockRouterDelete).toHaveBeenCalledWith('/boats/1/engines/2/photos/42', {
      preserveScroll: true,
    })
  })

  test('does not delete when the confirmation is dismissed', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false)
    )
    const wrapper = mount(MediaPhotoGallery, {
      props: { ...baseProps, photos: [photo(42)] },
    })

    await wrapper.findAll('button').at(-1)!.trigger('click')

    expect(mockRouterDelete).not.toHaveBeenCalled()
  })

  test('hides the upload control and the file input when canUpload is false', () => {
    const wrapper = mount(MediaPhotoGallery, {
      props: { ...baseProps, canUpload: false, photos: [photo(1)] },
    })

    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('media.photos.add')
  })

  test('hides the delete control when canDelete is false', () => {
    const wrapper = mount(MediaPhotoGallery, {
      props: { ...baseProps, canDelete: false, photos: [photo(1)] },
    })

    expect(wrapper.text()).not.toContain('media.photos.delete')
  })
})
