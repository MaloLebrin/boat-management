<script setup lang="ts">
import { computed } from 'vue'
import { useCountUp } from '~/composables/use_count_up'
import { useT } from '~/composables/use_t'

const props = defineProps<{ value: string }>()

const { locale } = useT()

// Découpe « ×3 », « 2500+ », « 98% », « -40% » → préfixe / nombre / suffixe.
const parsed = computed(() => {
  const match = props.value.match(/^(\D*?)(\d[\d\s.,]*\d|\d)(\D*)$/)
  if (!match) return null
  const [, prefix, rawNumber, suffix] = match
  // Le séparateur de milliers diffère selon la locale de la traduction :
  // « 28 240 » en fr, « 28,240 » en en. En fr la virgule est décimale — la
  // supprimer comme en en transformerait « 1,2 M€ » en « 12 M€ » (#465).
  const normalized =
    locale.value === 'fr'
      ? rawNumber.replace(/\s/g, '').replace(',', '.')
      : rawNumber.replace(/[\s,]/g, '')
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
  locale: locale.value,
})

defineExpose({ parsed })
</script>

<template>
  <span v-if="parsed" ref="el">{{ display }}</span>
  <span v-else>{{ value }}</span>
</template>
