<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import type { SimulatorBoatInput, SimulatorBoatType } from '../../../../shared/types/simulator'
import { SIMULATOR_BOAT_TYPES } from '../../../../shared/types/simulator'

interface Props {
  modelValue: Partial<SimulatorBoatInput>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: Partial<SimulatorBoatInput>]
  next: []
}>()

const { t } = useT()

const currentYear = new Date().getFullYear()

const boatTypeOptions: { value: SimulatorBoatType; labelKey: string }[] = [
  { value: 'motorboat', labelKey: 'marketing.simulator.boat_type_motorboat' },
  { value: 'sailboat', labelKey: 'marketing.simulator.boat_type_sailboat' },
  { value: 'catamaran', labelKey: 'marketing.simulator.boat_type_catamaran' },
  { value: 'rib', labelKey: 'marketing.simulator.boat_type_rib' },
]

const navCategories = ['A', 'B', 'C', 'D'] as const

function update<K extends keyof SimulatorBoatInput>(key: K, value: SimulatorBoatInput[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const showEngineCheckbox = computed(() => {
  return props.modelValue.boatType === 'sailboat' || props.modelValue.boatType === 'catamaran'
})

const canProceed = computed(() => {
  const v = props.modelValue
  return (
    v.boatType &&
    v.lengthM &&
    v.lengthM >= 2 &&
    v.lengthM <= 30 &&
    v.yearBuilt &&
    v.yearBuilt >= 1950 &&
    v.yearBuilt <= currentYear &&
    v.navigationCategory
  )
})
</script>

<template>
  <div class="space-y-8">
    <!-- Boat type -->
    <div>
      <label class="mb-3 block text-sm font-medium text-fg">
        {{ t('marketing.simulator.boat_type_label') }}
      </label>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          v-for="opt in boatTypeOptions"
          :key="opt.value"
          type="button"
          :class="[
            'rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
            modelValue.boatType === opt.value
              ? 'border-coral-500 bg-coral-50 text-coral-700'
              : 'border-bone bg-paper text-fg-muted hover:border-fg-subtle',
          ]"
          @click="update('boatType', opt.value)"
        >
          {{ t(opt.labelKey) }}
        </button>
      </div>
    </div>

    <!-- Length -->
    <div>
      <label for="lengthM" class="mb-2 block text-sm font-medium text-fg">
        {{ t('marketing.simulator.length_label') }}
      </label>
      <input
        id="lengthM"
        type="number"
        min="2"
        max="30"
        step="0.1"
        :value="modelValue.lengthM"
        class="w-full rounded-lg border border-bone bg-paper px-4 py-3 text-fg focus:border-coral-500 focus:outline-none focus:ring-2 focus:ring-coral-500/20"
        @input="update('lengthM', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <!-- Year built -->
    <div>
      <label for="yearBuilt" class="mb-2 block text-sm font-medium text-fg">
        {{ t('marketing.simulator.year_built_label') }}
      </label>
      <input
        id="yearBuilt"
        type="number"
        :min="1950"
        :max="currentYear"
        :value="modelValue.yearBuilt"
        class="w-full rounded-lg border border-bone bg-paper px-4 py-3 text-fg focus:border-coral-500 focus:outline-none focus:ring-2 focus:ring-coral-500/20"
        @input="update('yearBuilt', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <!-- Navigation category -->
    <div>
      <label class="mb-3 block text-sm font-medium text-fg">
        {{ t('marketing.simulator.nav_category_label') }}
      </label>
      <div class="space-y-2">
        <button
          v-for="cat in navCategories"
          :key="cat"
          type="button"
          :class="[
            'w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition-all',
            modelValue.navigationCategory === cat
              ? 'border-coral-500 bg-coral-50'
              : 'border-bone bg-paper hover:border-fg-subtle',
          ]"
          @click="update('navigationCategory', cat)"
        >
          <span :class="modelValue.navigationCategory === cat ? 'text-coral-700' : 'text-fg'">
            {{ t(`marketing.simulator.nav_category_${cat.toLowerCase()}`) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Engine checkbox (only for sailboat/catamaran) -->
    <div v-if="showEngineCheckbox" class="flex items-center gap-3">
      <input
        id="hasDedicatedEngine"
        type="checkbox"
        :checked="modelValue.hasDedicatedEngine ?? true"
        class="size-5 rounded border-bone text-coral-500 focus:ring-coral-500"
        @change="update('hasDedicatedEngine', ($event.target as HTMLInputElement).checked)"
      />
      <label for="hasDedicatedEngine" class="text-sm text-fg">
        {{ t('marketing.simulator.has_engine_label') }}
      </label>
    </div>

    <!-- Next button -->
    <button
      type="button"
      :disabled="!canProceed"
      class="w-full rounded-xl bg-coral-500 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
      @click="emit('next')"
    >
      {{ t('marketing.simulator.next') }}
    </button>
  </div>
</template>
