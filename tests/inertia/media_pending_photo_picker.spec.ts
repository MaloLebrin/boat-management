import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import MediaPendingPhotoPicker from '../../inertia/components/media/MediaPendingPhotoPicker.vue'

/**
 * Sélecteur de photos **en attente** : il ne poste rien, il remonte des `File`.
 * Les bornes viennent de `shared/constants/media.ts` — les mêmes que le
 * validateur VineJS —, appliquées dès la sélection : un fichier écarté ici
 * n'ira pas se faire refuser en 422 après que l'incident a été créé.
 */

vi.mock('~/composables/use_t', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
  }),
}))

vi.mock('~/composables/use_byte_format', () => ({
  useByteFormat: () => ({ formatFileSize: (bytes: number) => `${bytes}B` }),
}))

vi.mock('~/components/base/BaseButton.vue', () => ({
  default: {
    template: '<button :type="type" :disabled="disabled"><slot /></button>',
    props: ['type', 'variant', 'size', 'disabled'],
  },
}))

function photo(name = 'photo.jpg', size = 1024) {
  const file = new File(['x'], name, { type: 'image/jpeg' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/** Pose une liste de fichiers sur une entrée et déclenche son `change`. */
async function selectFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  input.dispatchEvent(new Event('change'))
}

describe('MediaPendingPhotoPicker', () => {
  beforeEach(() => {
    // happy-dom ne fournit pas createObjectURL : le composant doit rester
    // montable sans lui, et le révoquer quand il est là.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  test('selected files are emitted, appended to the ones already held', async () => {
    const wrapper = mount(MediaPendingPhotoPicker, { props: { modelValue: [photo('a.jpg')] } })

    const input = wrapper.find('[data-testid="photo-picker-input"]').element as HTMLInputElement
    await selectFiles(input, [photo('b.jpg')])

    // L'ordre compte : le composant ajoute à la suite, il ne remplace pas.
    const emitted = wrapper.emitted('update:modelValue')![0][0] as File[]
    expect(emitted.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg'])
  })

  test('an unsupported extension is dropped and reported', async () => {
    const wrapper = mount(MediaPendingPhotoPicker, { props: { modelValue: [] } })

    const input = wrapper.find('[data-testid="photo-picker-input"]').element as HTMLInputElement
    await selectFiles(input, [photo('notice.pdf')])

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('rejected')![0][0]).toContain('media.photos.rejectedExtension')
  })

  test('a file over the size limit is dropped and reported', async () => {
    const wrapper = mount(MediaPendingPhotoPicker, { props: { modelValue: [] } })

    const input = wrapper.find('[data-testid="photo-picker-input"]').element as HTMLInputElement
    await selectFiles(input, [photo('huge.jpg', 11 * 1024 * 1024)])

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('rejected')![0][0]).toContain('media.photos.rejectedSize')
  })

  test('the batch limit is enforced against the files already held', async () => {
    const held = Array.from({ length: 2 }, (_, i) => photo(`held-${i}.jpg`))
    const wrapper = mount(MediaPendingPhotoPicker, {
      props: { modelValue: held, maxFiles: 3 },
    })

    const input = wrapper.find('[data-testid="photo-picker-input"]').element as HTMLInputElement
    await selectFiles(input, [photo('c.jpg'), photo('d.jpg')])

    // Une seule place restait.
    expect(wrapper.emitted('update:modelValue')![0][0]).toHaveLength(3)
    expect(wrapper.emitted('rejected')![0][0]).toContain('media.photos.rejectedCount')
  })

  test('removing a thumbnail emits the remaining files', async () => {
    const wrapper = mount(MediaPendingPhotoPicker, {
      props: { modelValue: [photo('a.jpg'), photo('b.jpg')] },
    })

    await wrapper.findAll('li button')[0].trigger('click')

    const remaining = wrapper.emitted('update:modelValue')![0][0] as File[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].name).toBe('b.jpg')
  })

  test('disabled: no file is accepted and the notice is rendered', async () => {
    const wrapper = mount(MediaPendingPhotoPicker, {
      props: { modelValue: [], disabled: true, notice: 'offline' },
    })

    const input = wrapper.find('[data-testid="photo-picker-input"]').element as HTMLInputElement
    await selectFiles(input, [photo()])

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.text()).toContain('offline')
  })

  test('the error message is rendered when the parent passes one', () => {
    const wrapper = mount(MediaPendingPhotoPicker, {
      props: { modelValue: [], error: 'at least one photo' },
    })

    expect(wrapper.find('[data-testid="photo-picker-error"]').text()).toBe('at least one photo')
  })

  test('object URLs are revoked when the component goes away', () => {
    const wrapper = mount(MediaPendingPhotoPicker, { props: { modelValue: [photo()] } })
    wrapper.unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
