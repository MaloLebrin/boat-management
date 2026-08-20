<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'

const { t } = useT()

const props = defineProps<{
  checked: number
  total: number
}>()

const percent = computed(() =>
  props.total === 0 ? 0 : Math.round((props.checked / props.total) * 100)
)
</script>

<template>
  <div>
    <div class="flex items-center justify-between text-sm">
      <span class="font-medium text-fg">
        {{ t('diagnostic.common.progress', { checked: String(checked), total: String(total) }) }}
      </span>
    </div>
    <div
      class="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      role="progressbar"
      :aria-valuenow="checked"
      :aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="
        t('diagnostic.common.progressLabel', { checked: String(checked), total: String(total) })
      "
    >
      <div class="h-full rounded-full bg-brand transition-all" :style="{ width: `${percent}%` }" />
    </div>
  </div>
</template>
