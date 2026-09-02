<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import InspectionChecklist from '~/components/reservations/inspection/InspectionChecklist.vue'
import InspectionForm from '~/components/reservations/inspection/InspectionForm.vue'
import InspectionPhotos from '~/components/reservations/inspection/InspectionPhotos.vue'
import InspectionDefects from '~/components/reservations/inspection/InspectionDefects.vue'
import { usePendingInspection } from '~/composables/use_pending_inspection'
import { useT } from '~/composables/use_t'
import type { BoatCategory } from '#shared/types/boat_catalog'
import type { InspectionKind, InspectionWithPhotos } from '~/types/inspection'

const props = defineProps<{
  boatId: number
  reservationId: number
  kind: InspectionKind
  inspection: InspectionWithPhotos | null
  /** Catégorie effective du bateau — filtre la checklist (#584). */
  category: BoatCategory | null
  /** Inspection de check-out affichée en regard sur le panneau check-in (#584). */
  counterpart: InspectionWithPhotos | null
  canEdit: boolean
  canDelete: boolean
  canManageActions: boolean
  canDeleteActions: boolean
}>()

const { t } = useT()

const basePath = `/boats/${props.boatId}/reservations/${props.reservationId}`

/**
 * État des lieux saisi hors-ligne et pas encore synchronisé (#622) : dérivé de
 * la file, il porte un jeton temporaire que les défauts référencent. Il n'est
 * pris en compte que tant que le serveur n'a pas rendu l'inspection réelle.
 */
const pendingInspection = usePendingInspection(props.boatId, props.reservationId, props.kind)

function deleteInspection() {
  if (!props.inspection) return
  if (!window.confirm(t('inspections.form.confirmDelete'))) return
  router.delete(`${basePath}/inspections/${props.inspection.id}`, { preserveScroll: true })
}
</script>

<template>
  <BaseCard class="space-y-4 p-5">
    <div class="flex items-center justify-between">
      <h3 class="font-semibold text-fg">{{ t(`inspections.kind.${kind}`) }}</h3>
      <BaseButton
        v-if="inspection && canDelete"
        variant="danger"
        size="sm"
        type="button"
        @click="deleteInspection"
      >
        {{ t('inspections.form.delete') }}
      </BaseButton>
    </div>

    <div
      v-if="!inspection && pendingInspection"
      class="rounded-md border border-warning/40 bg-surface-muted px-3 py-2 space-y-1"
      role="status"
    >
      <p class="text-sm font-medium text-fg">{{ t('inspections.pending.badge') }}</p>
      <p class="text-xs text-fg-muted">{{ t('inspections.pending.description') }}</p>
    </div>

    <InspectionForm
      v-if="canEdit"
      :boat-id="boatId"
      :reservation-id="reservationId"
      :kind="kind"
      :inspection="inspection"
      :pending="pendingInspection"
    />

    <p v-else-if="!inspection" class="text-sm text-fg-muted">
      {{ t(`inspections.empty.${kind}`) }}
    </p>

    <template v-if="inspection">
      <InspectionChecklist
        :boat-id="boatId"
        :reservation-id="reservationId"
        :inspection-id="inspection.id"
        :category="category"
        :items="inspection.items"
        :counterpart-items="counterpart ? counterpart.items : null"
        :can-edit="canEdit"
        :can-manage-actions="canManageActions"
      />

      <InspectionPhotos
        :upload-url="`${basePath}/inspections/${inspection.id}/photos`"
        :delete-url-for="
          (mediaId: number) => `${basePath}/inspections/${inspection!.id}/photos/${mediaId}`
        "
        :photos="inspection.photos"
        :can-upload="canEdit"
        :can-delete="canDelete"
      />

      <InspectionDefects
        :boat-id="boatId"
        :reservation-id="reservationId"
        :inspection-id="inspection.id"
        :actions="inspection.actions"
        :can-manage="canManageActions"
        :can-delete="canDeleteActions"
      />
    </template>

    <!-- Inspection encore en file : seuls les défauts sont saisissables (#622).
         La checklist et les photos exigent un ID réel côté serveur. -->
    <template v-else-if="pendingInspection">
      <p class="border-t border-border pt-4 text-sm text-fg-muted" role="alert">
        {{ t('inspections.pending.checklistUnavailable') }}
      </p>
      <p class="text-sm text-fg-muted" role="alert">
        {{ t('inspections.pending.photosUnavailable') }}
      </p>

      <InspectionDefects
        :boat-id="boatId"
        :reservation-id="reservationId"
        :inspection-id="pendingInspection.id"
        :actions="pendingInspection.actions"
        :can-manage="canManageActions"
        :can-delete="false"
      />
    </template>
  </BaseCard>
</template>
