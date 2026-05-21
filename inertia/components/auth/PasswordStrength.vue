<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/useT'

const props = defineProps<{ value: string }>()

const { t } = useT()

const score = computed(() => {
  const s = props.value
  if (!s) return 0
  let n = 0
  if (s.length >= 8) n++
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) n++
  if (/\d/.test(s)) n++
  if (/[^A-Za-z0-9]/.test(s) || s.length >= 14) n++
  return n
})

const segmentColors = ['#ebe2d0', '#c84a3a', '#b87b1d', '#1f6b54', '#1f6b54']
const labels = computed(() => [
  t('auth.passwordStrength.tooShort'),
  t('auth.passwordStrength.weak'),
  t('auth.passwordStrength.fair'),
  t('auth.passwordStrength.strong'),
  t('auth.passwordStrength.excellent'),
])

const activeColor = computed(() => segmentColors[score.value])
const label = computed(() => (props.value ? labels.value[score.value] : ''))
</script>

<template>
  <div class="mt-1.5 flex items-center gap-2">
    <div class="flex flex-1 gap-1">
      <div
        v-for="i in 4"
        :key="i"
        class="h-0.5 flex-1 rounded-full transition-colors duration-150"
        :style="{ background: i - 1 < score ? activeColor : '#ebe2d0' }"
      />
    </div>
    <span
      v-if="value"
      class="min-w-[54px] text-right text-[11px] font-semibold transition-colors duration-150"
      :style="{ color: activeColor }"
    >
      {{ label }}
    </span>
  </div>
</template>
