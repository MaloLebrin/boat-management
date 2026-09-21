<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { ref, watch } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BoatSafetyEquipmentModals from './BoatSafetyEquipmentModals.vue'
import EquipmentAddTaskButton from '~/components/boats/maintenance/EquipmentAddTaskButton.vue'
import EquipmentReportIncidentButton from '~/components/boats/incidents/EquipmentReportIncidentButton.vue'
import { useT } from '~/composables/use_t'
import { useDateFormat } from '~/composables/use_date_format'
import { suggestEquipmentActionType } from '#shared/helpers/equipment_action'
import type { BoatShowSafetyEquipment, EquipmentActionPrefill } from '~/types/boat_show'
import type { IncidentTargetRef } from '#shared/types/incident'
import type { TaskEquipmentRef } from '#shared/types/maintenance'
import { safetyStatusVariant } from '~/utils/status_variants'

const props = withDefaults(
  defineProps<{
    boatId: number
    items: BoatShowSafetyEquipment[]
    canManage: boolean
    canManageActions: boolean
    canAddTask?: boolean
    canReportIncident?: boolean
    /**
     * Type demandé par le panneau de conformité (#582) : ouvre la modale de
     * création pré-remplie sur ce type d'équipement.
     */
    prefillEquipmentType?: string | null
  }>(),
  { prefillEquipmentType: null, canAddTask: false, canReportIncident: false }
)

const emit = defineEmits<{
  (e: 'addToActions', payload: EquipmentActionPrefill): void
  (e: 'prefillConsumed'): void
  (e: 'addTask', equipment: TaskEquipmentRef): void
  (e: 'reportIncident', target: IncidentTargetRef): void
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

function emitAddToActions(item: BoatShowSafetyEquipment) {
  emit('addToActions', {
    equipmentType: 'safety',
    equipmentId: item.id,
    label: t(`boats.options.safetyEquipmentType.${item.equipmentType}`),
    actionType: suggestEquipmentActionType(item.status),
  })
}

const isCreateOpen = ref(false)
const createEquipmentType = ref('')
const editingItem = ref<BoatShowSafetyEquipment | null>(null)

// L'intention d'ajout vient d'un autre composant : on la consomme aussitôt pour
// que refermer puis re-cliquer la même ligne rouvre bien la modale.
watch(
  () => props.prefillEquipmentType,
  (equipmentType) => {
    if (!equipmentType) return
    createEquipmentType.value = equipmentType
    isCreateOpen.value = true
    emit('prefillConsumed')
  },
  { immediate: true }
)

function openCreate() {
  createEquipmentType.value = ''
  isCreateOpen.value = true
}

const openEdit = (item: BoatShowSafetyEquipment) => (editingItem.value = item)
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-fg">{{ t('boats.safetyEquipment.title') }}</p>
        <BaseButton
          v-if="canManage"
          variant="secondary"
          size="sm"
          type="button"
          :aria-label="t('boats.safetyEquipment.add')"
          @click="openCreate()"
        >
          {{ t('boats.safetyEquipment.add') }}
        </BaseButton>
      </div>
    </template>

    <div v-if="items.length === 0" class="text-sm text-fg-muted">
      {{ t('boats.safetyEquipment.noItems') }}
    </div>

    <ul v-else class="space-y-3 text-sm">
      <li
        v-for="item in items"
        :key="item.id"
        class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
      >
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-fg">
                {{ t(`boats.options.safetyEquipmentType.${item.equipmentType}`) }}
              </p>
              <BaseBadge :variant="safetyStatusVariant(item.status)">
                {{ t(`boats.options.safetyEquipmentStatus.${item.status}`) }}
              </BaseBadge>
            </div>

            <div class="mt-2 flex flex-wrap gap-2 text-xs text-fg-subtle">
              <span
                v-if="item.quantity !== null"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ t('boats.safetyEquipment.quantity') }}: {{ item.quantity }}
              </span>
              <span
                v-if="item.expiryDate"
                class="rounded-full bg-surface-elevated px-2 py-1 ring-1 ring-border"
              >
                {{ t('boats.safetyEquipment.expiryDate') }}: {{ formatDate(item.expiryDate) }}
              </span>
            </div>

            <p v-if="item.notes" class="mt-2 text-xs text-fg-muted">{{ item.notes }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2 md:justify-end">
            <BaseButton
              variant="ghost"
              size="sm"
              route="boats.safetyEquipment.show"
              :params="{ boatId, itemId: item.id }"
            >
              {{ t('boats.safetyEquipment.viewDetail') }}
            </BaseButton>
            <EquipmentAddTaskButton
              v-if="canAddTask"
              :equipment="{ type: 'safety', id: item.id }"
              @add-task="emit('addTask', $event)"
            />
            <EquipmentReportIncidentButton
              v-if="canReportIncident"
              :target="{ type: 'safety', id: item.id }"
              @report-incident="emit('reportIncident', $event)"
            />
            <BaseButton
              v-if="canManageActions && item.status !== 'ok'"
              variant="secondary"
              size="sm"
              type="button"
              @click="emitAddToActions(item)"
            >
              {{ t('equipmentActions.prefill.addButton') }}
            </BaseButton>
            <template v-if="canManage">
              <BaseButton
                variant="ghost"
                size="sm"
                type="button"
                :aria-label="t('boats.safetyEquipment.edit')"
                @click="openEdit(item)"
              >
                {{ t('boats.safetyEquipment.edit') }}
              </BaseButton>
              <Form
                :action="{ url: `/boats/${boatId}/safety-equipment/${item.id}`, method: 'delete' }"
                #default="{ processing }"
                class="inline"
              >
                <BaseButton
                  type="submit"
                  variant="danger"
                  size="sm"
                  :disabled="processing"
                  :aria-label="t('boats.safetyEquipment.delete')"
                >
                  {{ t('boats.safetyEquipment.delete') }}
                </BaseButton>
              </Form>
            </template>
          </div>
        </div>
      </li>
    </ul>

    <BoatSafetyEquipmentModals
      v-model:create-open="isCreateOpen"
      v-model:editing-item="editingItem"
      :boat-id="boatId"
      :create-equipment-type="createEquipmentType"
    />
  </BaseCard>
</template>
