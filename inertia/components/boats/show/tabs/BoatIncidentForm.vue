<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { toast } from 'vue-sonner'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import IncidentInsuranceFields from '~/components/boats/incidents/IncidentInsuranceFields.vue'
import IncidentTargetSelect from '~/components/boats/incidents/IncidentTargetSelect.vue'
import MediaPendingPhotoPicker from '~/components/media/MediaPendingPhotoPicker.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import { useIncidentPhotoFlow } from '~/composables/use_incident_photo_flow'
import { incidentTargetColumns, incidentTargetRefOf } from '#shared/helpers/incident_target'
import { INCIDENT_TYPES } from '#shared/types/incident'
import { useT } from '~/composables/use_t'
import { isoToDatetimeLocalValue, tzOffsetMinutes } from '~/utils/local_datetime'
import type { TaskEquipmentSource } from '#shared/types/maintenance'
import type {
  BoatIncidentRow,
  IncidentFormPrefill,
  IncidentStatus,
  IncidentTargetRef,
  IncidentType,
} from '~/types/boat_show'

/**
 * Formulaire d'incident, réutilisé par tous les points d'entrée. `equipment`
 * alimente le sélecteur de cible ; `prefill` + `lockTarget` la figent (carte ou
 * page équipement/pièce, #813). Les six colonnes de cible voyagent dans le
 * formulaire lui-même : le payload enfilé hors-ligne les porte tel quel.
 *
 * Les photos, elles, ne sont **pas** dans le `useForm` : la création reste un
 * POST JSON, l'envoi des fichiers suit dans un second temps — voir
 * `use_incident_photo_flow.ts`.
 */
const props = withDefaults(
  defineProps<{
    boatId: number
    editingIncident: BoatIncidentRow | null
    equipment?: TaskEquipmentSource | null
    prefill?: IncidentFormPrefill | null
    lockTarget?: boolean
  }>(),
  { equipment: null, prefill: null, lockTarget: false }
)

const emit = defineEmits<{
  close: []
}>()

const { t } = useT()
const { isOnline } = useNetworkStatus()

const initialTarget = props.prefill?.target ?? incidentTargetRefOf(props.editingIncident ?? {})
const lockedTarget = props.lockTarget ? (props.prefill?.target ?? null) : null

const form = useForm({
  occurredAt: props.editingIncident
    ? isoToDatetimeLocalValue(props.editingIncident.occurredAt)
    : '',
  // `occurredAt` is a naive wall-clock: the server needs the browser offset to
  // store the right instant (#452).
  tzOffsetMinutes: tzOffsetMinutes(),
  type: (props.editingIncident?.type ?? 'other') as IncidentType,
  status: (props.editingIncident?.status ?? 'open') as IncidentStatus,
  location: props.editingIncident?.location ?? '',
  description: props.editingIncident?.description ?? '',
  insuranceClaimed: props.editingIncident?.insuranceClaimed ?? false,
  insuranceClaimRef: props.editingIncident?.insuranceClaimRef ?? '',
  ...incidentTargetColumns(initialTarget),
})

const photos = ref<File[]>([])

// La cible n'est qu'une vue sur les six colonnes : la changer réécrit toutes
// les FK, ce qui permet aussi de la retirer en édition.
const target = computed<IncidentTargetRef | null>({
  get: () => incidentTargetRefOf(form),
  set: (ref) => Object.assign(form, incidentTargetColumns(ref)),
})

watch(
  () => props.editingIncident,
  (incident) => {
    form.occurredAt = incident ? isoToDatetimeLocalValue(incident.occurredAt) : ''
    form.type = incident?.type ?? 'other'
    form.status = incident?.status ?? 'open'
    form.location = incident?.location ?? ''
    form.description = incident?.description ?? ''
    form.insuranceClaimed = incident?.insuranceClaimed ?? false
    form.insuranceClaimRef = incident?.insuranceClaimRef ?? ''
    target.value = incidentTargetRefOf(incident ?? {})
  }
)

const INCIDENT_STATUSES: IncidentStatus[] = ['open', 'in_progress', 'closed']

const incidentTypeOptions = computed(() =>
  INCIDENT_TYPES.map((type) => ({ value: type, label: t(`incidents.type.${type}`) }))
)

/**
 * Un incident sans photo ne se clôture pas (règle tenue par le service) :
 * l'option disparaît plutôt que de faire échouer l'enregistrement. La clause
 * `status === 'closed'` garde l'option sur un incident historique déjà clos,
 * en miroir du garde de transition côté serveur.
 */
const canClose = computed(
  () => (props.editingIncident?.photosCount ?? 0) > 0 || props.editingIncident?.status === 'closed'
)

const incidentStatusOptions = computed(() =>
  INCIDENT_STATUSES.filter((s) => s !== 'closed' || canClose.value).map((s) => ({
    value: s,
    label: t(`incidents.status.${s}`),
  }))
)

const actionUrl = computed(() =>
  props.editingIncident
    ? `/boats/${props.boatId}/incidents/${props.editingIncident.id}`
    : `/boats/${props.boatId}/incidents`
)

const { submit, photoError, isUploadingPhotos } = useIncidentPhotoFlow({
  form,
  photos,
  boatId: () => props.boatId,
  actionUrl: () => actionUrl.value,
  isEditing: () => props.editingIncident !== null,
  onDone: () => emit('close'),
})

/**
 * `.value` explicite plutôt que le déballage automatique du template : la même
 * expression reste juste que `isOnline` soit un `ref` ou un objet de test.
 */
const photoPickerDisabled = computed(() => !isOnline.value || isUploadingPhotos.value)
const photoNotice = computed(() => (isOnline.value ? null : t('incidents.form.photoOfflineNotice')))
</script>

<template>
  <!-- Toujours rendu dans une modale (onglet, cartes, pages, ajout rapide) qui porte le titre -->
  <div class="space-y-4">
    <form @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseInput
          v-model="form.occurredAt"
          type="datetime-local"
          id="occurredAt"
          name="occurredAt"
          :label="t('incidents.fields.occurredAt')"
          :error="form.errors.occurredAt"
          required
        />

        <!-- Type -->
        <BaseSelect
          v-model="form.type"
          name="type"
          :label="t('incidents.fields.type')"
          :options="incidentTypeOptions"
          :error="form.errors.type"
          required
        />

        <!-- Status (edit only) -->
        <div v-if="editingIncident" :class="canClose ? '' : 'sm:col-span-2'">
          <BaseSelect
            v-model="form.status"
            name="status"
            :label="t('incidents.fields.status')"
            :options="incidentStatusOptions"
            :error="form.errors.status"
          />
          <p v-if="!canClose" class="mt-1 text-xs text-warning">
            {{ t('incidents.form.closedNeedsPhoto') }}
            <Link
              :href="`/boats/${boatId}/incidents/${editingIncident.id}`"
              class="font-medium underline"
            >
              {{ t('incidents.form.goToIncident') }}
            </Link>
          </p>
        </div>

        <!-- Target: equipment or part (#813) -->
        <IncidentTargetSelect
          v-model:target="target"
          :class="editingIncident ? 'sm:col-span-2' : ''"
          :equipment="equipment"
          :locked-target="lockedTarget"
          :locked-label="prefill?.targetLabel ?? null"
          :error="form.errors.boatEngineId"
        />

        <BaseInput
          v-model="form.location"
          type="text"
          id="location"
          name="location"
          class="sm:col-span-2"
          :label="t('incidents.fields.location')"
          :error="form.errors.location"
        />

        <BaseTextarea
          v-model="form.description"
          name="description"
          :label="t('incidents.fields.description')"
          :error="form.errors.description"
          :rows="3"
          required
          class="sm:col-span-2"
        />

        <!-- Photos : obligatoires à la déclaration, sauf hors-ligne. En édition,
             elles se gèrent depuis la galerie de la page de détail. -->
        <div v-if="!editingIncident" class="sm:col-span-2">
          <p class="mb-1 block text-sm font-medium text-fg">{{ t('incidents.form.photos') }}</p>
          <p class="mb-2 text-xs text-fg-muted">{{ t('incidents.form.photoHint') }}</p>
          <MediaPendingPhotoPicker
            v-model="photos"
            :disabled="photoPickerDisabled"
            :error="photoError"
            :notice="photoNotice"
            @rejected="(message: string) => toast.error(message)"
          />
        </div>

        <IncidentInsuranceFields
          v-model:insurance-claimed="form.insuranceClaimed"
          v-model:insurance-claim-ref="form.insuranceClaimRef"
          :error="form.errors.insuranceClaimRef"
        />
      </div>

      <div class="mt-4 flex items-center justify-end gap-3">
        <BaseButton
          type="button"
          variant="ghost"
          size="sm"
          data-testid="incident-cancel"
          @click="emit('close')"
        >
          {{ t('incidents.form.cancel') }}
        </BaseButton>
        <BaseButton
          type="submit"
          variant="primary"
          size="sm"
          :disabled="form.processing || isUploadingPhotos"
        >
          {{ isUploadingPhotos ? t('incidents.form.photoUploading') : t('incidents.form.submit') }}
        </BaseButton>
      </div>
    </form>
  </div>
</template>
