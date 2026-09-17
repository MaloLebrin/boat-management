import { useForm } from '@inertiajs/vue3'
import { type MaybeRefOrGetter, ref, toValue } from 'vue'
import { useNetworkStatus } from '~/composables/use_network_status'

/**
 * Envoi de photos : le formulaire multipart, les deux entrées de fichiers
 * (galerie et caméra) et le refus hors-ligne, pour les deux galeries qui les
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
  const form = useForm({ files: [] as File[] })

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    form.files = input.files ? Array.from(input.files) : []
    if (form.files.length > 0) submitPhotos()
  }

  function submitPhotos() {
    // Refus explicite hors-ligne : la file IndexedDB ne transporte pas de multipart (#621)
    if (!isOnline.value) return
    form.post(toValue(uploadUrl), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        if (fileInput.value) fileInput.value.value = ''
        if (cameraInput.value) cameraInput.value.value = ''
      },
    })
  }

  return { form, fileInput, cameraInput, isOnline, onFileChange }
}
