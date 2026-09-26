<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'

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

// Tokens sémantiques plutôt qu'hex : les segments suivent le thème (#416).
// En classes et non en `:style` : la CSP ne couvre pas les attributs (#831).
const segmentClasses = ['bg-bone', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success']
const labelClasses = ['text-bone', 'text-danger', 'text-warning', 'text-success', 'text-success']
const labels = computed(() => [
  t('auth.passwordStrength.tooShort'),
  t('auth.passwordStrength.weak'),
  t('auth.passwordStrength.fair'),
  t('auth.passwordStrength.strong'),
  t('auth.passwordStrength.excellent'),
])

const activeSegmentClass = computed(() => segmentClasses[score.value])
const activeLabelClass = computed(() => labelClasses[score.value])
const label = computed(() => (props.value ? labels.value[score.value] : ''))
</script>

<template>
  <div class="mt-1.5 flex items-center gap-2">
    <div class="flex flex-1 gap-1">
      <div
        v-for="i in 4"
        :key="i"
        class="h-0.5 flex-1 rounded-full transition-colors duration-150"
        :class="i - 1 < score ? activeSegmentClass : 'bg-bone'"
      />
    </div>
    <span
      v-if="value"
      class="min-w-[54px] text-right text-[11px] font-semibold transition-colors duration-150"
      :class="activeLabelClass"
    >
      {{ label }}
    </span>
  </div>
</template>
