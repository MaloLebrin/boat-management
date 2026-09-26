<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import {
  DASHBOARD_WIDGET_ZONES,
  type DashboardWidgetId,
  type DashboardWidgetZone,
} from '#shared/constants/dashboard_widgets'
import { useT } from '~/composables/use_t'

/** Galerie des widgets retirés (le « + » d'iOS) : « Ajouter » les remet dans leur colonne. */
const props = defineProps<{
  open: boolean
  addable: Record<DashboardWidgetZone, DashboardWidgetId[]>
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'add', id: DashboardWidgetId): void
}>()

const { t } = useT()

const zones = computed(() =>
  DASHBOARD_WIDGET_ZONES.filter((zone) => props.addable[zone].length > 0)
)

function add(id: DashboardWidgetId) {
  emit('add', id)
  emit('update:open', false)
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="t('dashboard.customize.addTitle')"
    :close-label="t('common.close')"
    size="md"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5" data-testid="dashboard-add-widget-modal">
      <p v-if="zones.length === 0" class="text-sm text-fg-muted" data-testid="dashboard-add-empty">
        {{ t('dashboard.customize.addEmpty') }}
      </p>
      <section v-for="zone in zones" :key="zone" :data-testid="`dashboard-add-zone-${zone}`">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t(`dashboard.customize.zone.${zone}`) }}
        </h3>
        <ul class="space-y-2">
          <li
            v-for="id in addable[zone]"
            :key="id"
            class="flex items-center justify-between gap-3 rounded-(--radius-control) border border-border bg-surface-elevated px-3 py-2"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold text-fg">{{ t(`dashboard.widgets.${id}`) }}</p>
              <p class="text-xs text-fg-muted">{{ t(`dashboard.widgetDescriptions.${id}`) }}</p>
            </div>
            <BaseButton
              variant="outline"
              size="sm"
              :data-testid="`dashboard-add-${id}`"
              @click="add(id)"
            >
              {{ t('dashboard.customize.add') }}
            </BaseButton>
          </li>
        </ul>
      </section>
    </div>
  </BaseModal>
</template>
