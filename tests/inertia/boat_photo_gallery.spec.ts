import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

const mockIsOnline = vi.hoisted(() => ({ value: true }))
// Un vrai ref est requis : le template déballe `isOnline` (pas d'accès `.value` en script)
vi.mock('~/composables/use_network_status', async () => {
  const { computed } = await import('vue')
  return {
    useNetworkStatus: () => ({ isOnline: computed(() => mockIsOnline.value) }),
  }
})

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
    mockIsOnline.value = true
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

  // #485 — le bouton « Prendre une photo » a son propre input capture, car
  // `capture` sur l'input principal supprimerait la sélection multiple.
  test('renders a dedicated camera input with capture and without multiple', () => {
    const wrapper = mount(BoatPhotoGallery, { props: baseProps as never })
    const inputs = wrapper.findAll('input[type="file"]')

    expect(inputs).toHaveLength(2)
    const [galleryInput, cameraInput] = inputs
    expect(galleryInput.attributes('multiple')).toBeDefined()
    expect(galleryInput.attributes('capture')).toBeUndefined()
    expect(cameraInput.attributes('capture')).toBe('environment')
    expect(cameraInput.attributes('multiple')).toBeUndefined()
    expect(wrapper.text()).toContain('boats.show.mediaUpload.takePhoto')
  })

  test('posts the captured photo from the camera input', async () => {
    const wrapper = mount(BoatPhotoGallery, { props: baseProps as never })
    const file = new File(['x'], 'capture.jpg', { type: 'image/jpeg' })
    const cameraInput = wrapper.find('input[capture="environment"]')

    Object.defineProperty(cameraInput.element, 'files', { value: [file] })
    await cameraInput.trigger('change')

    expect(mockFormPost).toHaveBeenCalledTimes(1)
    expect(mockFormPost).toHaveBeenCalledWith(
      '/boats/3/photos',
      expect.objectContaining({ forceFormData: true, preserveScroll: true })
    )
    expect(mockForm.files).toEqual([file])
  })

  // #621 — refus explicite hors-ligne : la file IndexedDB ne transporte pas de multipart.
  test('disables the upload buttons and tile and shows an offline message when offline', () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatPhotoGallery, {
      props: { ...baseProps, boat: { id: 3, media: [photo(1)] } } as never,
    })

    const uploadButtons = wrapper.findAll('button[type="button"]')
    expect(uploadButtons.length).toBeGreaterThanOrEqual(3)
    for (const button of uploadButtons) {
      expect(button.attributes('disabled')).toBeDefined()
    }
    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('common.offline.photoUploadUnavailable')
  })

  test('does not post files selected while offline', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatPhotoGallery, { props: baseProps as never })
    const file = new File(['x'], 'boat.jpg', { type: 'image/jpeg' })
    const input = wrapper.find('input[type="file"]')

    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')

    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('keeps the upload enabled and hides the offline message when online', () => {
    const wrapper = mount(BoatPhotoGallery, { props: baseProps as never })

    for (const button of wrapper.findAll('button[type="button"]')) {
      expect(button.attributes('disabled')).toBeUndefined()
    }
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  test('does not open the file picker from the empty state when offline', async () => {
    mockIsOnline.value = false
    const wrapper = mount(BoatPhotoGallery, { props: baseProps as never })
    const input = wrapper.find('input[type="file"]')
    const clickSpy = vi.spyOn(input.element as HTMLInputElement, 'click')

    await wrapper.find('.border-dashed').trigger('click')

    expect(clickSpy).not.toHaveBeenCalled()
  })

  test('takePhoto key is translated in both locales', () => {
    for (const locale of ['en', 'fr'] as const) {
      const json = JSON.parse(
        readFileSync(resolve(__dirname, `../../resources/lang/${locale}/boats.json`), 'utf8')
      ) as { show: { mediaUpload: Record<string, string> } }
      expect(
        json.show.mediaUpload.takePhoto,
        `boats.show.mediaUpload.takePhoto (${locale})`
      ).toBeTruthy()
    }
  })
})
