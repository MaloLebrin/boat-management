<script setup lang="ts">
import { computed } from 'vue'
import DashboardWidget from '~/components/dashboard/DashboardWidget.vue'
import type { DashboardWidgetId } from '#shared/constants/dashboard_widgets'
import { groupDashboardWidgets } from '#shared/helpers/dashboard_layout'
import type { DashboardWidgetData } from '~/types/dashboard_widgets'

const props = defineProps<{
  /** Widgets visibles de la colonne, dans l'ordre choisi par l'utilisateur. */
  widgets: DashboardWidgetId[]
  data: DashboardWidgetData
}>()

// Deux widgets `half` consécutifs (« En mer » + « Prochains départs ») se
// partagent une ligne dès `md` ; un `half` isolé prend toute la largeur. En
// colonne principale pour garder l'ordre mobile sans dupliquer le DOM (#832).
const rows = computed(() => groupDashboardWidgets(props.widgets))
</script>

<template>
  <div class="space-y-6">
    <template v-for="row in rows" :key="row.join('+')">
      <div
        v-if="row.length > 1"
        class="grid grid-cols-1 gap-6 md:grid-cols-2"
        data-testid="dashboard-half-row"
      >
        <DashboardWidget v-for="id in row" :id="id" :key="id" :data="data" />
      </div>
      <DashboardWidget v-else :id="row[0]" :data="data" />
    </template>
  </div>
</template>
