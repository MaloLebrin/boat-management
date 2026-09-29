<script setup lang="ts">
import { useT } from '~/composables/use_t'

defineProps<{ title: string; hasData: boolean }>()

const { t } = useT()
</script>

<template>
  <section
    class="rounded-(--radius-card) border border-border bg-surface-elevated p-5 shadow-(--shadow-xs)"
  >
    <h2 class="mb-4 text-sm font-semibold text-fg-muted">{{ title }}</h2>
    <div v-if="hasData" class="h-72">
      <slot />
    </div>
    <p v-else class="py-10 text-center text-sm text-fg-subtle" data-test="chart-empty">
      {{ t('reports.charts.noData') }}
    </p>
  </section>
</template>
