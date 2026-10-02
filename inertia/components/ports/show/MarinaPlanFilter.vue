<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { SPOT_MATCH_STROKE, SPOT_STATUS_COLORS } from '~/composables/use_marina'
import { useT } from '~/composables/use_t'
import type { SpotEffectiveStatus } from '../../../../shared/types/spot'

/**
 * Filtre « places libres pour un bateau de N m » et légende du plan (#891).
 * La longueur saisie remonte au parent, qui surligne les places adaptées.
 */
const props = defineProps<{
  modelValue: string
  matchCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useT()

const LEGEND: SpotEffectiveStatus[] = ['available', 'occupied', 'reserved', 'out_of_service']

const hasFilter = computed(() => Number(props.modelValue) > 0)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex items-end gap-2">
      <div class="w-40">
        <BaseInput
          :model-value="modelValue"
          type="number"
          step="0.1"
          min="0"
          :label="t('ports.plan.filter.label')"
          :placeholder="t('ports.plan.filter.placeholder')"
          data-testid="marina-length-filter"
          @update:model-value="emit('update:modelValue', $event)"
        />
      </div>
      <p v-if="hasFilter" class="pb-2 text-sm text-fg-muted" data-testid="marina-filter-count">
        {{ t('ports.plan.filter.matches', { count: String(matchCount) }) }}
        <button
          type="button"
          class="ml-2 text-brand hover:underline"
          @click="emit('update:modelValue', '')"
        >
          {{ t('ports.plan.filter.clear') }}
        </button>
      </p>
    </div>
    <ul class="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
      <li v-for="status in LEGEND" :key="status" class="flex items-center gap-1.5">
        <!-- Pastille en SVG : la CSP refuse les attributs `style` (#831). -->
        <svg class="h-3 w-3" viewBox="0 0 12 12" aria-hidden="true">
          <rect
            x="0.5"
            y="0.5"
            width="11"
            height="11"
            rx="2"
            :fill="SPOT_STATUS_COLORS[status].fill"
            :stroke="SPOT_STATUS_COLORS[status].stroke"
          />
        </svg>
        {{ t(`ports.plan.legend.${status}`) }}
      </li>
      <li class="flex items-center gap-1.5">
        <svg class="h-3 w-3" viewBox="0 0 12 12" aria-hidden="true">
          <rect
            x="1"
            y="1"
            width="10"
            height="10"
            rx="2"
            fill="transparent"
            :stroke="SPOT_MATCH_STROKE"
            stroke-width="2"
          />
        </svg>
        {{ t('ports.plan.legend.match') }}
      </li>
    </ul>
  </div>
</template>
