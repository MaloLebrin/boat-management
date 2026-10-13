import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { toast } from 'vue-sonner'
import { useOfflineQueue, type QueuedAttachment } from '~/composables/use_offline_queue'
import { refreshStorageEstimate } from '~/composables/use_persistent_storage'
import { useT } from '~/composables/use_t'
import { compressPhoto, hasRoomFor } from '~/lib/offline_photos'
import { PHOTO_MAX_SIZE_MB } from '#shared/constants/media'
import { UPLOAD_PHOTOS_ACTION } from '#shared/constants/offline_queue'

/** Champ multipart lu par `storeBoatPhotosValidator` sur les quatre routes d'envoi. */
const PHOTO_FIELD = 'files'
const PHOTO_MAX_BYTES = PHOTO_MAX_SIZE_MB * 1024 * 1024

export interface QueuePhotosOptions {
  url: string
  files: File[]
  /** Jeton de la création parente quand l'URL en dépend (incident saisi hors-ligne). */
  dependsOn?: string
}

export interface PendingPhoto {
  key: string
  name: string
  src: string
}

async function toAttachment(file: File): Promise<QueuedAttachment> {
  return { field: PHOTO_FIELD, name: file.name, type: file.type, data: await file.arrayBuffer() }
}

/**
 * Photos prises hors-ligne (#969) : réduites, contrôlées contre le quota puis
 * enfilées en pièces jointes d'une action `upload-photos`, rejouée en
 * multipart sur la même route que l'envoi en ligne.
 */
export function useOfflinePhotos() {
  const { t } = useT()
  const { enqueue } = useOfflineQueue()

  /** `true` si les photos sont en file ; sinon un toast a dit pourquoi. */
  async function queuePhotos({ url, files, dependsOn }: QueuePhotosOptions): Promise<boolean> {
    if (files.length === 0) return true

    const compressed = await Promise.all(files.map((file) => compressPhoto(file)))
    const tooLarge = compressed.find((file) => file.size > PHOTO_MAX_BYTES)
    if (tooLarge) {
      toast.error(
        t('common.offline.photos.tooLarge', {
          name: tooLarge.name,
          max: String(PHOTO_MAX_SIZE_MB),
        })
      )
      return false
    }

    const bytes = compressed.reduce((total, file) => total + file.size, 0)
    if (!hasRoomFor(bytes, await refreshStorageEstimate())) {
      toast.error(t('common.offline.photos.quotaExceeded'))
      return false
    }

    try {
      const attachments = await Promise.all(compressed.map((file) => toAttachment(file)))
      const stored = await enqueue({
        type: UPLOAD_PHOTOS_ACTION,
        url,
        method: 'post',
        payload: {},
        attachments,
        ...(dependsOn ? { dependsOn } : {}),
      })
      if (!stored) toast.error(t('common.offline.photos.saveFailed'))
      return stored
    } catch {
      // `QuotaExceededError` malgré l'estimation : elle est arrondie, et
      // d'autres onglets écrivent sur la même origine.
      toast.error(t('common.offline.photos.saveFailed'))
      return false
    }
  }

  return { queuePhotos }
}

/**
 * Vignettes des photos encore en file pour une galerie (#969), identifiée par
 * son URL d'envoi. Les URLs d'objet sont créées une fois par pièce jointe et
 * révoquées quand la photo quitte la file ou que la galerie disparaît.
 */
export function usePendingPhotos(uploadUrl: MaybeRefOrGetter<string>) {
  const { pendingActions } = useOfflineQueue()
  const objectUrls = new Map<string, string>()
  const pendingPhotos = ref<PendingPhoto[]>([])

  const queued = computed(() =>
    pendingActions.value
      .filter((action) => action.type === UPLOAD_PHOTOS_ACTION && action.url === toValue(uploadUrl))
      .flatMap((action) =>
        (action.attachments ?? []).map((attachment, index) => ({
          key: `${action.id}-${index}`,
          attachment,
        }))
      )
  )

  watch(
    queued,
    (items) => {
      const keys = new Set(items.map((item) => item.key))
      for (const [key, src] of objectUrls) {
        if (keys.has(key)) continue
        URL.revokeObjectURL(src)
        objectUrls.delete(key)
      }
      pendingPhotos.value = items.map(({ key, attachment }) => {
        let src = objectUrls.get(key)
        if (!src) {
          src = URL.createObjectURL(new Blob([attachment.data], { type: attachment.type }))
          objectUrls.set(key, src)
        }
        return { key, name: attachment.name, src }
      })
    },
    { immediate: true }
  )

  onScopeDispose(() => {
    for (const src of objectUrls.values()) URL.revokeObjectURL(src)
    objectUrls.clear()
  })

  return { pendingPhotos }
}
