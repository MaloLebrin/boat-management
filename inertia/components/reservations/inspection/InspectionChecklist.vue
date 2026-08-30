<script setup lang="ts">
import { computed, ref } from 'vue'
import InspectionChecklistItem from '~/components/reservations/inspection/InspectionChecklistItem.vue'
import InspectionDefectModal from '~/components/reservations/inspection/InspectionDefectModal.vue'
import { useT } from '~/composables/use_t'
import { inspectionSectionsForCategory } from '#shared/helpers/inspection_checklist'
import type { BoatCategory } from '#shared/types/boat_catalog'
import type { BoatInspectionItemRow } from '~/types/inspection'

const props = defineProps<{
  boatId: number
  reservationId: number
  inspectionId: number
  /** Catégorie effective du bateau (#571, repli legacy) — null = checklist entière. */
  category: BoatCategory | null
  items: BoatInspectionItemRow[]
  /**
   * Constats du check-out de la même réservation, affichés en regard sur le
   * check-in (#584). Null sur le panneau check-out.
   */
  counterpartItems: BoatInspectionItemRow[] | null
  canEdit: boolean
  canManageActions: boolean
}>()

const { t } = useT()

const sections = computed(() => inspectionSectionsForCategory(props.category))

const rowsByKey = computed(() => new Map(props.items.map((row) => [row.itemKey, row])))
const counterpartByKey = computed(
  () => new Map((props.counterpartItems ?? []).map((row) => [row.itemKey, row]))
)

const totalCount = computed(() =>
  sections.value.reduce((total, section) => total + section.items.length, 0)
)
const checkedCount = computed(() =>
  sections.value.reduce(
    (total, section) =>
      total + section.items.filter((entry) => rowsByKey.value.has(entry.key)).length,
    0
  )
)

// Un dommage constaté propose une action d'équipement pré-remplie : le libellé
// du point + la note saisie deviennent le brouillon de l'action (#584).
const defectModalOpen = ref(false)
const defectPrefill = ref<{ label: string; notes: string } | null>(null)

function openDefectModal(prefill: { label: string; notes: string }) {
  defectPrefill.value = prefill
  defectModalOpen.value = true
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold text-fg">{{ t('inspections.checklist.title') }}</h4>
      <p class="text-sm text-fg-muted">
        {{
          t('inspections.checklist.progress', {
            checked: String(checkedCount),
            total: String(totalCount),
          })
        }}
      </p>
    </div>

    <div class="mt-3 space-y-4">
      <div v-for="section in sections" :key="section.key">
        <h5 class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t(section.titleKey) }}
        </h5>
        <ul class="mt-2 space-y-2">
          <InspectionChecklistItem
            v-for="entry in section.items"
            :key="entry.key"
            :boat-id="boatId"
            :reservation-id="reservationId"
            :inspection-id="inspectionId"
            :item="entry"
            :row="rowsByKey.get(entry.key) ?? null"
            :counterpart="counterpartItems ? (counterpartByKey.get(entry.key) ?? null) : undefined"
            :can-edit="canEdit"
            :can-manage-actions="canManageActions"
            @report-damage="openDefectModal"
          />
        </ul>
      </div>
    </div>

    <InspectionDefectModal
      v-model:open="defectModalOpen"
      :boat-id="boatId"
      :reservation-id="reservationId"
      :inspection-id="inspectionId"
      :prefill="defectPrefill"
    />
  </section>
</template>
