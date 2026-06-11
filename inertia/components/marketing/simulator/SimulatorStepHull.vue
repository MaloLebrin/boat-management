<script setup lang="ts">
import { useT } from '~/composables/use_t'
import type { SimulatorBoatInput, SimulatorWearLevel } from '../../../../shared/types/simulator'
import { SIMULATOR_WEAR_LEVELS } from '../../../../shared/types/simulator'

interface Props {
  modelValue: Partial<SimulatorBoatInput>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: Partial<SimulatorBoatInput>]
  'next': []
  'back': []
}>()

const { t } = useT()

interface WearOption {
  value: SimulatorWearLevel
  labelKey: string
  descKey: string
  colorSelected: string
  colorDefault: string
}

const wearOptions: WearOption[] = SIMULATOR_WEAR_LEVELS.map((level) => ({
  value: level,
  labelKey: `simulator.wear_${level}`,
  descKey: `simulator.wear_${level}_desc`,
  colorSelected: {
    new: 'border-mint-300 bg-mint-50 text-mint-700',
    good: 'border-navy-500 bg-navy-50 text-navy-700',
    worn: 'border-amber-600 bg-amber-50 text-amber-700',
    to_replace: 'border-coral-500 bg-coral-50 text-coral-700',
  }[level],
  colorDefault: {
    new: 'border-bone bg-white text-fg hover:border-mint-200 hover:bg-mint-50',
    good: 'border-bone bg-white text-fg hover:border-navy-100 hover:bg-navy-50',
    worn: 'border-bone bg-white text-fg hover:border-amber-100 hover:bg-amber-50',
    to_replace: 'border-bone bg-white text-fg hover:border-coral-100 hover:bg-coral-50',
  }[level],
}))

function selectWear(value: SimulatorWearLevel) {
  emit('update:modelValue', { ...props.modelValue, hullWear: value })
  setTimeout(() => emit('next'), 320)
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <label class="mb-4 block text-base font-semibold text-fg">
        {{ t('simulator.hull_wear_label') }}
      </label>
      <div class="space-y-2">
        <button
          v-for="opt in wearOptions"
          :key="opt.value"
          type="button"
          :class="[
            'w-full rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-150',
            modelValue.hullWear === opt.value ? opt.colorSelected : opt.colorDefault,
          ]"
          @click="selectWear(opt.value)"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="block text-sm font-semibold">{{ t(opt.labelKey) }}</span>
              <span class="mt-0.5 block text-xs opacity-70">{{ t(opt.descKey) }}</span>
            </div>
            <svg
              v-if="modelValue.hullWear === opt.value"
              class="ml-3 h-5 w-5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>

    <button
      type="button"
      class="text-sm text-fg-subtle underline underline-offset-2 transition-colors hover:text-fg"
      @click="emit('back')"
    >
      {{ t('simulator.back') }}
    </button>
  </div>
</template>
