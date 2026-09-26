<script setup lang="ts">
import { computed } from 'vue'
import DashboardWidget from '~/components/dashboard/DashboardWidget.vue'
import DashboardWidgetFrame from '~/components/dashboard/DashboardWidgetFrame.vue'
import type { DashboardWidgetId, DashboardWidgetZone } from '#shared/constants/dashboard_widgets'
import { groupDashboardWidgets } from '#shared/helpers/dashboard_layout'
import type { DashboardWidgetData } from '~/types/dashboard_widgets'

const props = defineProps<{
  zone: DashboardWidgetZone
  /** Widgets visibles de la colonne, dans l'ordre choisi par l'utilisateur. */
  widgets: DashboardWidgetId[]
  data: DashboardWidgetData
  /** Mode édition : chaque widget est encadré (retrait, flèches) et son contenu inerte. */
  editing?: boolean
}>()

const emit = defineEmits<{
  (e: 'remove', id: DashboardWidgetId): void
  (e: 'move', id: DashboardWidgetId, direction: -1 | 1): void
}>()

// Deux widgets `half` consécutifs (« En mer » + « Prochains départs ») se
// partagent une ligne dès `md` ; un `half` isolé prend toute la largeur. En
// colonne principale pour garder l'ordre mobile sans dupliquer le DOM (#832).
const rows = computed(() => groupDashboardWidgets(props.widgets))

function canMove(id: DashboardWidgetId, direction: -1 | 1): boolean {
  const index = props.widgets.indexOf(id)
  const target = index + direction
  return index !== -1 && target >= 0 && target < props.widgets.length
}
</script>

<template>
  <div class="space-y-6">
    <template v-for="row in rows" :key="row.join('+')">
      <div
        v-if="row.length > 1"
        class="grid grid-cols-1 gap-6 md:grid-cols-2"
        data-testid="dashboard-half-row"
      >
        <DashboardWidgetFrame
          v-for="id in row"
          :id="id"
          :key="id"
          :editing="editing === true"
          reorderable
          :can-move-up="canMove(id, -1)"
          :can-move-down="canMove(id, 1)"
          @remove="emit('remove', id)"
          @move-up="emit('move', id, -1)"
          @move-down="emit('move', id, 1)"
        >
          <DashboardWidget :id="id" :data="data" :editing="editing" />
        </DashboardWidgetFrame>
      </div>
      <DashboardWidgetFrame
        v-else
        :id="row[0]"
        :editing="editing === true"
        reorderable
        :can-move-up="canMove(row[0], -1)"
        :can-move-down="canMove(row[0], 1)"
        @remove="emit('remove', row[0])"
        @move-up="emit('move', row[0], -1)"
        @move-down="emit('move', row[0], 1)"
      >
        <DashboardWidget :id="row[0]" :data="data" :editing="editing" />
      </DashboardWidgetFrame>
    </template>
  </div>
</template>
