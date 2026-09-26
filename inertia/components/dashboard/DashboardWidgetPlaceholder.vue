<script setup lang="ts">
import type { DashboardWidgetId } from '#shared/constants/dashboard_widgets'
import { useT } from '~/composables/use_t'

/**
 * Tenant-lieu d'un widget réajouté pendant l'édition : ses données ont été
 * omises par le serveur tant qu'il était masqué, elles arriveront au
 * rechargement qui suit « Terminé ».
 */
defineProps<{ id: DashboardWidgetId }>()

const { t } = useT()
</script>

<template>
  <div
    class="flex min-h-32 flex-col items-center justify-center gap-1 rounded-(--radius-card) border-2 border-dashed border-border bg-surface-muted/40 px-6 py-8 text-center"
    data-testid="dashboard-widget-placeholder"
    :data-widget="id"
  >
    <p class="text-sm font-semibold text-fg">{{ t(`dashboard.widgets.${id}`) }}</p>
    <p class="text-xs text-fg-muted">{{ t('dashboard.customize.placeholder') }}</p>
  </div>
</template>
