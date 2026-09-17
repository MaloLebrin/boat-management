import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockFormPost = vi.hoisted(() => vi.fn())
const mockFormReset = vi.hoisted(() => vi.fn())
const mockForm = vi.hoisted(() => ({
  files: [] as File[],
  processing: false,
  post: mockFormPost,
  reset: mockFormReset,
}))

vi.mock('@inertiajs/vue3', () => ({
  useForm: () => mockForm,
}))

const mockIsOnline = vi.hoisted(() => ({ value: true }))
vi.mock('~/composables/use_network_status', async () => {
  const { computed } = await import('vue')
  return { useNetworkStatus: () => ({ isOnline: computed(() => mockIsOnline.value) }) }
})

import { usePhotoUpload } from '../../inertia/composables/use_photo_upload'

function changeEvent(files: File[] | null): Event {
  return { target: { files } } as unknown as Event
}

function file(name: string) {
  return new File(['x'], name, { type: 'image/jpeg' })
}

/**
 * Contrat d'envoi commun aux deux galeries — celle du bateau et celle des
 * médias — qui le recopiaient chacune. Ce que leurs specs vérifiaient à travers
 * le DOM est fixé ici directement.
 */
describe('usePhotoUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockForm.files = []
    mockIsOnline.value = true
  })

  test('envoie en multipart, sans perdre la position de défilement', () => {
    const { onFileChange } = usePhotoUpload('/boats/3/photos')

    onFileChange(changeEvent([file('a.jpg')]))

    expect(mockFormPost).toHaveBeenCalledWith('/boats/3/photos', {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: expect.any(Function),
    })
  })

  test('les fichiers choisis ensemble partent en une seule requête', () => {
    const { form, onFileChange } = usePhotoUpload('/media/photos')

    onFileChange(changeEvent([file('a.jpg'), file('b.jpg'), file('c.jpg')]))

    expect(form.files).toHaveLength(3)
    expect(mockFormPost).toHaveBeenCalledTimes(1)
  })

  test("l'URL est relue à chaque envoi, jamais figée à l'appel", () => {
    // La galerie du bateau la dérive d'une prop : figer l'URL enverrait les
    // photos au bateau précédent après une navigation.
    let boatId = 3
    const { onFileChange } = usePhotoUpload(() => `/boats/${boatId}/photos`)

    onFileChange(changeEvent([file('a.jpg')]))
    boatId = 7
    onFileChange(changeEvent([file('b.jpg')]))

    expect(mockFormPost.mock.calls.map((call) => call[0])).toEqual([
      '/boats/3/photos',
      '/boats/7/photos',
    ])
  })

  test("une entrée vidée n'envoie rien", () => {
    const { form, onFileChange } = usePhotoUpload('/media/photos')

    onFileChange(changeEvent(null))

    expect(form.files).toEqual([])
    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('hors-ligne, rien ne part', () => {
    // La file IndexedDB ne transporte pas de multipart (#621) : le refus est
    // explicite, il ne dépend pas de la désactivation des boutons.
    mockIsOnline.value = false
    const { onFileChange } = usePhotoUpload('/media/photos')

    onFileChange(changeEvent([file('a.jpg')]))

    expect(mockFormPost).not.toHaveBeenCalled()
  })

  test('au succès, le formulaire et les deux entrées sont remis à zéro', () => {
    const { fileInput, cameraInput, onFileChange } = usePhotoUpload('/media/photos')
    fileInput.value = { value: 'C:\\fakepath\\a.jpg' } as HTMLInputElement
    cameraInput.value = { value: 'C:\\fakepath\\b.jpg' } as HTMLInputElement

    onFileChange(changeEvent([file('a.jpg')]))
    mockFormPost.mock.calls[0][1].onSuccess()

    expect(mockFormReset).toHaveBeenCalledOnce()
    // Sans ce vidage, resélectionner le même fichier n'émet pas de `change`.
    expect(fileInput.value.value).toBe('')
    expect(cameraInput.value.value).toBe('')
  })

  test('le succès ne casse pas quand les entrées ne sont pas montées', () => {
    const { onFileChange } = usePhotoUpload('/media/photos')

    onFileChange(changeEvent([file('a.jpg')]))

    expect(() => mockFormPost.mock.calls[0][1].onSuccess()).not.toThrow()
  })
})
