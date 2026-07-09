<script setup lang="ts">
import { computed } from 'vue'
import { useCountUp } from '~/composables/use_count_up'

const props = defineProps<{ value: string }>()

// Découpe « ×3 », « 2500+ », « 98% », « -40% » → préfixe / nombre / suffixe.
const parsed = computed(() => {
  const match = props.value.match(/^(\D*?)(\d[\d\s.,]*\d|\d)(\D*)$/)
  if (!match) return null
  const [, prefix, rawNumber, suffix] = match
  const normalized = rawNumber.replace(/[\s,]/g, '')
  const target = Number.parseFloat(normalized)
  if (Number.isNaN(target)) return null
  const dot = normalized.indexOf('.')
  const decimals = dot === -1 ? 0 : normalized.length - dot - 1
  return { prefix, suffix, target, decimals }
})

const { el, display } = useCountUp(parsed.value?.target ?? 0, {
  prefix: parsed.value?.prefix ?? '',
  suffix: parsed.value?.suffix ?? '',
  decimals: parsed.value?.decimals ?? 0,
})

defineExpose({ parsed })
</script>

<template>
  <span v-if="parsed" ref="el">{{ display }}</span>
  <span v-else>{{ value }}</span>
</template>
