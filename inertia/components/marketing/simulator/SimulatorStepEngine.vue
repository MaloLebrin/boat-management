<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import type { SimulatorBoatInput, SimulatorWearLevel } from '../../../../shared/types/simulator'
import { SIMULATOR_WEAR_LEVELS } from '../../../../shared/types/simulator'

interface Props {
  modelValue: Partial<SimulatorBoatInput>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: Partial<SimulatorBoatInput>]
  next: []
  back: []
}>()

const { t } = useT()

const wearOptions: { value: SimulatorWearLevel; labelKey: string }[] = SIMULATOR_WEAR_LEVELS.map(
  (level) => ({
    value: level,
    labelKey: `marketing.simulator.wear_${level}`,
  })
)

function selectWear(value: SimulatorWearLevel) {
  emit('update:modelValue', { ...props.modelValue, engineWear: value })
}

const canProceed = computed(() => Boolean(props.modelValue.engineWear))
</script>

<template>
  <div class="space-y-8">
    <div>
      <label class="mb-3 block text-sm font-medium text-fg">
        {{ t('marketing.simulator.engine_wear_label') }}
      </label>
      <div class="space-y-3">
        <button
          v-for="opt in wearOptions"
          :key="opt.value"
          type="button"
          :class="[
            'w-full rounded-xl border-2 px-5 py-4 text-left transition-all',
            modelValue.engineWear === opt.value
              ? 'border-coral-500 bg-coral-50'
              : 'border-bone bg-paper hover:border-fg-subtle',
          ]"
          @click="selectWear(opt.value)"
        >
          <span
            :class="[
              'text-base font-medium',
              modelValue.engineWear === opt.value ? 'text-coral-700' : 'text-fg',
            ]"
          >
            {{ t(opt.labelKey) }}
          </span>
        </button>
      </div>
    </div>

    <div class="flex gap-3">
      <button
        type="button"
        class="flex-1 rounded-xl border-2 border-bone bg-paper px-6 py-4 text-base font-semibold text-fg transition-colors hover:border-fg-subtle"
        @click="emit('back')"
      >
        {{ t('marketing.simulator.back') }}
      </button>
      <button
        type="button"
        :disabled="!canProceed"
        class="flex-1 rounded-xl bg-coral-500 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
        @click="emit('next')"
      >
        {{ t('marketing.simulator.next') }}
      </button>
    </div>
  </div>
</template>
