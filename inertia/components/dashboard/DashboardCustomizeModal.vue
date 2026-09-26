<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import DashboardCustomizeRow from '~/components/dashboard/DashboardCustomizeRow.vue'
import { DASHBOARD_WIDGET_ZONES } from '#shared/constants/dashboard_widgets'
import type { ResolvedDashboardLayout } from '#shared/types/dashboard_layout'
import { useDashboardLayout } from '~/composables/use_dashboard_layout'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  open: boolean
  layout: ResolvedDashboardLayout
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t } = useT()
const {
  draftOrder,
  isSaving,
  isDirty,
  isCustomized,
  resetDraft,
  isVisible,
  toggle,
  isReorderable,
  canMove,
  move,
  save,
  reset,
} = useDashboardLayout(() => props.layout)

// Le brouillon repart de la disposition servie à chaque ouverture : une
// modification annulée ne réapparaît pas à l'ouverture suivante.
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetDraft()
  }
)

const zones = computed(() =>
  DASHBOARD_WIDGET_ZONES.filter((zone) => draftOrder.value[zone].length > 0)
)

function close() {
  emit('update:open', false)
}

function onSave() {
  save({ onSuccess: close })
}

function onReset() {
  reset({ onSuccess: close })
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('dashboard.customize.title')"
    :subtitle="t('dashboard.customize.subtitle')"
    :close-label="t('common.close')"
    size="lg"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5" data-testid="dashboard-customize-modal">
      <section v-for="zone in zones" :key="zone" :data-testid="`dashboard-customize-zone-${zone}`">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t(`dashboard.customize.zone.${zone}`) }}
        </h3>
        <ul class="space-y-2">
          <DashboardCustomizeRow
            v-for="id in draftOrder[zone]"
            :id="id"
            :key="id"
            :visible="isVisible(id)"
            :reorderable="isReorderable(zone)"
            :can-move-up="canMove(zone, id, -1)"
            :can-move-down="canMove(zone, id, 1)"
            @toggle="toggle(id)"
            @move-up="move(zone, id, -1)"
            @move-down="move(zone, id, 1)"
          />
        </ul>
      </section>
      <p class="text-xs text-fg-subtle">{{ t('dashboard.customize.hint') }}</p>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <BaseButton
          variant="ghost"
          size="sm"
          :disabled="!isCustomized || isSaving"
          data-testid="dashboard-customize-reset"
          @click="onReset"
        >
          {{ t('dashboard.customize.reset') }}
        </BaseButton>
        <div class="ml-auto flex items-center gap-2">
          <BaseButton variant="secondary" size="sm" :disabled="isSaving" @click="close">
            {{ t('common.cancel') }}
          </BaseButton>
          <BaseButton
            variant="primary"
            size="sm"
            :disabled="!isDirty || isSaving"
            data-testid="dashboard-customize-save"
            @click="onSave"
          >
            {{ t('common.save') }}
          </BaseButton>
        </div>
      </div>
    </template>
  </BaseModal>
</template>
