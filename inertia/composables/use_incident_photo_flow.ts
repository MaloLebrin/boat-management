import { router } from '@inertiajs/vue3'
import { ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { useT } from '~/composables/use_t'
import { CREATE_INCIDENT_ACTION, UPDATE_INCIDENT_ACTION } from '#shared/constants/offline_queue'
import { tzOffsetMinutes } from '~/utils/local_datetime'

/**
 * Charge utile acceptée par une visite Inertia. `@inertiajs/core` n'est pas une
 * dépendance directe : on dérive le type de la signature de `router.post`,
 * comme `use_offline_queue.ts`.
 */
type InertiaPayload = Extract<
  NonNullable<Parameters<typeof router.post>[1]>,
  Record<string, unknown>
>

/**
 * Page Inertia rendue après la création. Volontairement large : `Page<PageProps>`
 * ne serait pas assignable à une forme plus étroite, et on n'en lit que `flash`.
 */
interface SubmittedPage {
  props: Record<string, unknown>
}

/**
 * Ce que le flux attend du `useForm` de l'incident : de quoi poster et relire
 * la charge utile pour la file hors-ligne, rien de plus.
 */
interface IncidentForm {
  tzOffsetMinutes: number
  data(): InertiaPayload
  post(
    url: string,
    options: { preserveScroll: boolean; onSuccess: (page: SubmittedPage) => void }
  ): void
  put(url: string, options: { preserveScroll: boolean; onSuccess: () => void }): void
}

export interface IncidentPhotoFlowOptions {
  form: IncidentForm
  photos: Ref<File[]>
  boatId: MaybeRefOrGetter<number>
  actionUrl: MaybeRefOrGetter<string>
  isEditing: MaybeRefOrGetter<boolean>
  onDone: () => void
}

/**
 * Soumission d'un incident, photos comprises.
 *
 * Une photo est **obligatoire** à la déclaration, mais la création est un POST
 * JSON rejouable hors-ligne : on ne peut ni y glisser des `File` (la file
 * IndexedDB ne transporte que du `FormDataConvertible`, #621) ni basculer la
 * route en multipart (les six FK de cible repartiraient en chaînes vides).
 *
 * D'où deux temps : on crée l'incident, le contrôleur rend son id par le flash
 * `createdResourceId`, puis on envoie les photos sur `…/incidents/:id/photos`,
 * la route déjà validée et déjà plafonnée pour les lots.
 *
 * **Hors-ligne, la photo est exemptée** : mieux vaut un incident déclaré sans
 * photo sur un ponton qu'une saisie perdue. Le verrou de clôture côté serveur
 * la réclamera au retour du réseau.
 */
export function useIncidentPhotoFlow(options: IncidentPhotoFlowOptions) {
  const { t } = useT()
  const { isOnline } = useNetworkStatus()
  const { enqueue } = useOfflineQueue()

  const photoError = ref<string | null>(null)
  const isUploadingPhotos = ref(false)
  /**
   * Id de l'incident déjà créé dans cette session de formulaire. Il évite le
   * doublon : si l'envoi des photos échoue et que l'utilisateur resoumet, on
   * rejoue la seconde étape, jamais la première.
   */
  const createdIncidentId = ref<number | null>(null)

  function uploadPhotos(incidentId: number) {
    isUploadingPhotos.value = true
    router.post(
      `/boats/${toValue(options.boatId)}/incidents/${incidentId}/photos`,
      { files: options.photos.value },
      {
        forceFormData: true,
        preserveScroll: true,
        onError: () => toast.error(t('incidents.form.photoUploadFailed')),
        // `onFinish` et non `onSuccess` : l'incident existe déjà, laisser la
        // modale ouverte inviterait à le déclarer une seconde fois.
        onFinish: () => {
          isUploadingPhotos.value = false
          options.onDone()
        },
      }
    )
  }

  function submit() {
    photoError.value = null

    // Relu à la soumission, pas à la construction : une saisie mise en file
    // part avec le fuseau dans lequel elle a été tapée et n'est jamais
    // recalculée au rejeu (#452, #489)
    options.form.tzOffsetMinutes = tzOffsetMinutes()

    if (!isOnline.value) {
      enqueue({
        type: toValue(options.isEditing) ? UPDATE_INCIDENT_ACTION : CREATE_INCIDENT_ACTION,
        url: toValue(options.actionUrl),
        method: toValue(options.isEditing) ? 'put' : 'post',
        payload: options.form.data(),
      })
      options.onDone()
      return
    }

    if (toValue(options.isEditing)) {
      options.form.put(toValue(options.actionUrl), {
        preserveScroll: true,
        onSuccess: () => options.onDone(),
      })
      return
    }

    // Reprise après un envoi de photos raté : l'incident est déjà là.
    if (createdIncidentId.value !== null) {
      uploadPhotos(createdIncidentId.value)
      return
    }

    if (options.photos.value.length === 0) {
      photoError.value = t('incidents.form.photoRequired')
      return
    }

    options.form.post(toValue(options.actionUrl), {
      preserveScroll: true,
      onSuccess: (page: SubmittedPage) => {
        const flash = page.props.flash as Record<string, unknown> | undefined
        const createdId =
          flash?.createdResourceType === CREATE_INCIDENT_ACTION ? flash?.createdResourceId : null

        // Flash perdu (session recyclée) : l'incident est créé, on ne peut
        // plus lui rattacher les photos. Le badge « photo manquante » et le
        // verrou de clôture prennent le relais.
        if (!createdId) {
          toast.error(t('incidents.form.photoUploadFailed'))
          options.onDone()
          return
        }

        createdIncidentId.value = Number(createdId)
        uploadPhotos(createdIncidentId.value)
      },
    })
  }

  return { submit, photoError, isUploadingPhotos, createdIncidentId }
}
