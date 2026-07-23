<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import BaseOptionCard from '~/components/base/BaseOptionCard.vue'
import type { SimulatorBoatInput, SimulatorWinteringZone } from '../../../../shared/types/simulator'
import { SIMULATOR_WINTERING_ZONES } from '../../../../shared/types/simulator'

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

interface WinteringOption {
  value: SimulatorWinteringZone
  labelKey: string
  descKey: string
  icon: string
  selectedClass: string
  unselectedClass: string
}

const winteringOptions: WinteringOption[] = [
  {
    value: 'covered',
    labelKey: 'simulator.wintering_zone_covered',
    descKey: 'simulator.wintering_zone_covered_desc',
    icon: '🏠',
    selectedClass: 'border-navy-500 bg-navy-50 text-navy-700',
    unselectedClass: 'border-bone bg-white text-fg hover:border-navy-200 hover:bg-navy-50',
  },
  {
    value: 'outdoor',
    labelKey: 'simulator.wintering_zone_outdoor',
    descKey: 'simulator.wintering_zone_outdoor_desc',
    icon: '⛅',
    selectedClass: 'border-amber-600 bg-amber-50 text-amber-700',
    unselectedClass: 'border-bone bg-white text-fg hover:border-amber-200 hover:bg-amber-50',
  },
  {
    value: 'sea',
    labelKey: 'simulator.wintering_zone_sea',
    descKey: 'simulator.wintering_zone_sea_desc',
    icon: '⚓',
    selectedClass: 'border-coral-500 bg-coral-50 text-coral-700',
    unselectedClass: 'border-bone bg-white text-fg hover:border-coral-200 hover:bg-coral-50',
  },
]

const canProceed = computed(() => !!props.modelValue.winteringZone)

function selectWintering(value: SimulatorWinteringZone) {
  emit('update:modelValue', { ...props.modelValue, winteringZone: value })
}
</script>

<template>
  <div class="space-y-7">
    <div>
      <label class="mb-4 block text-base font-semibold text-fg">
        {{ t('simulator.wintering_zone_label') }}
      </label>
      <div class="grid grid-cols-3 gap-2.5">
        <BaseOptionCard
          v-for="opt in winteringOptions"
          :key="opt.value"
          :selected="modelValue.winteringZone === opt.value"
          :selected-class="opt.selectedClass"
          :unselected-class="opt.unselectedClass"
          :aria-label="t(opt.labelKey)"
          class="flex flex-col items-center gap-2 px-3 py-4"
          @click="selectWintering(opt.value)"
        >
          <span class="text-2xl leading-none" aria-hidden="true">{{ opt.icon }}</span>
          <span class="text-center text-xs font-semibold leading-tight">{{ t(opt.labelKey) }}</span>
          <span class="text-center text-[10px] leading-tight text-fg-muted">{{
            t(opt.descKey)
          }}</span>
        </BaseOptionCard>
      </div>
    </div>

    <div class="flex items-center justify-between gap-4">
      <button
        type="button"
        class="text-sm text-fg-subtle underline underline-offset-2 transition-colors hover:text-fg"
        @click="emit('back')"
      >
        {{ t('simulator.back') }}
      </button>
      <button
        type="button"
        :disabled="!canProceed"
        class="rounded-xl bg-coral-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-coral-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
        @click="emit('next')"
      >
        {{ t('simulator.next') }} →
      </button>
    </div>
  </div>
</template>
