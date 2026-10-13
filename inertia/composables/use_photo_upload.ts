import { useForm } from '@inertiajs/vue3'
import { type MaybeRefOrGetter, ref, toValue } from 'vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflinePhotos } from '~/composables/use_offline_photos'

/**
 * Envoi de photos : le formulaire multipart, les deux entrées de fichiers
 * (galerie et caméra) et la mise en file hors-ligne, pour les deux galeries qui les
 * recopiaient — celle du bateau (`boats/show/BoatPhotoGallery`) et celle des
 * médias (`media/MediaPhotoGallery`).
 *
 * Les `ref` des entrées sont rendues à l'appelant : chaque galerie ouvre aussi
 * le sélecteur depuis ses propres zones — état vide et tuile d'ajout côté
 * bateau, zone de dépôt côté médias.
 *
 * L'URL est acceptée en getter : côté bateau elle dérive d'une prop
 * (`/boats/:id/photos`), elle ne peut pas être figée à l'appel.
 */
export function usePhotoUpload(uploadUrl: MaybeRefOrGetter<string>) {
  const { isOnline } = useNetworkStatus()
  const fileInput = ref<HTMLInputElement>()
  const cameraInput = ref<HTMLInputElement>()
  const { queuePhotos } = useOfflinePhotos()
  const form = useForm({ files: [] as File[] })
  /** Réduction et écriture IndexedDB en cours : les boutons restent bloqués. */
  const isQueueing = ref(false)

  function clearInputs() {
    if (fileInput.value) fileInput.value.value = ''
    if (cameraInput.value) cameraInput.value.value = ''
  }

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    form.files = input.files ? Array.from(input.files) : []
    if (form.files.length > 0) void submitPhotos()
  }

  /**
   * Hors-ligne ou réseau dégradé, le lot part en file avec ses fichiers (#969) :
   * il sera rejoué en multipart sur la même URL au retour du réseau.
   */
  async function queueOffline() {
    isQueueing.value = true
    try {
      await queuePhotos({ url: toValue(uploadUrl), files: form.files })
    } finally {
      isQueueing.value = false
      form.reset()
      clearInputs()
    }
  }

  async function submitPhotos() {
    if (!isOnline.value) {
      await queueOffline()
      return
    }
    form.post(toValue(uploadUrl), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        clearInputs()
      },
    })
  }

  return { form, fileInput, cameraInput, isOnline, isQueueing, onFileChange }
}
