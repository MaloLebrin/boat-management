<script setup lang="ts">
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { computed } from 'vue'

const { t } = useT()
const { formatNumber } = useNumberFormat()

const props = defineProps<{
  label: string
  used: number | string
  limit: number | string | null
  isBytes?: boolean
}>()

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${t('settings.billing.usage.kb')}`
  if (bytes < 1024 * 1024 * 1024)
    return `${Math.round(bytes / (1024 * 1024))} ${t('settings.billing.usage.mb')}`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${t('settings.billing.usage.gb')}`
}

function formatCount(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? formatNumber(n) : String(value)
}

const displayUsed = computed(() => {
  if (props.isBytes) {
    return formatBytes(Number(props.used))
  }
  return formatCount(props.used)
})

const displayLimit = computed(() => {
  if (props.limit === null) {
    return t('settings.billing.usage.unlimited')
  }
  if (props.isBytes) {
    return formatBytes(Number(props.limit))
  }
  return formatCount(props.limit)
})

const percent = computed(() => {
  if (props.limit === null) return 0
  return Math.min(100, Math.round((Number(props.used) / Number(props.limit)) * 100))
})

const isOverLimit = computed(() => percent.value >= 100)
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between text-sm">
      <span class="text-fg">{{ label }}</span>
      <span class="text-fg-muted">
        {{ displayUsed }}
        {{ t('settings.billing.usage.of') }}
        {{ displayLimit }}
      </span>
    </div>
    <div v-if="limit !== null" class="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        class="h-full rounded-full bg-brand transition-all"
        :class="{ 'bg-red-500': isOverLimit }"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>
