<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import type { SimulatorBoatInput, SimulatorBoatType } from '../../../../shared/types/simulator'

interface Props {
  modelValue: Partial<SimulatorBoatInput>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: Partial<SimulatorBoatInput>]
  'next': []
}>()

const { t } = useT()

const currentYear = new Date().getFullYear()

interface BoatTypeOption {
  value: SimulatorBoatType
  labelKey: string
  icon: string
  selected: string
  unselected: string
}

const boatTypeOptions: BoatTypeOption[] = [
  {
    value: 'motorboat',
    labelKey: 'simulator.boat_type_motorboat',
    icon: '🚤',
    selected: 'border-navy-500 bg-navy-50 text-navy-700',
    unselected: 'border-bone bg-white text-fg hover:border-navy-200 hover:bg-navy-50',
  },
  {
    value: 'sailboat',
    labelKey: 'simulator.boat_type_sailboat',
    icon: '⛵',
    selected: 'border-coral-500 bg-coral-50 text-coral-700',
    unselected: 'border-bone bg-white text-fg hover:border-coral-200 hover:bg-coral-50',
  },
  {
    value: 'catamaran',
    labelKey: 'simulator.boat_type_catamaran',
    icon: '⛴️',
    selected: 'border-mint-600 bg-mint-50 text-mint-700',
    unselected: 'border-bone bg-white text-fg hover:border-mint-300 hover:bg-mint-50',
  },
  {
    value: 'rib',
    labelKey: 'simulator.boat_type_rib',
    icon: '🛥️',
    selected: 'border-amber-600 bg-amber-50 text-amber-700',
    unselected: 'border-bone bg-white text-fg hover:border-amber-200 hover:bg-amber-50',
  },
]

const navCategories = ['A', 'B', 'C', 'D'] as const

function update<K extends keyof SimulatorBoatInput>(key: K, value: SimulatorBoatInput[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function navCategoryDesc(cat: string): string {
  const full = t(`simulator.nav_category_${cat.toLowerCase()}`)
  const sep = full.indexOf(' - ')
  return sep >= 0 ? full.slice(sep + 3) : full
}

const showEngineCheckbox = computed(
  () => props.modelValue.boatType === 'sailboat' || props.modelValue.boatType === 'catamaran'
)

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
  <div class="space-y-7">
    <!-- Boat type -->
    <div>
      <label class="mb-3 block text-sm font-semibold text-fg">
        {{ t('simulator.boat_type_label') }}
      </label>
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button
          v-for="opt in boatTypeOptions"
          :key="opt.value"
          type="button"
          :class="[
            'flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-xs font-semibold transition-all duration-150',
            modelValue.boatType === opt.value ? opt.selected : opt.unselected,
          ]"
          @click="update('boatType', opt.value)"
        >
          <span class="text-2xl leading-none">{{ opt.icon }}</span>
          <span class="text-center leading-tight">{{ t(opt.labelKey) }}</span>
        </button>
      </div>
    </div>

    <!-- Length + Year side by side -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="lengthM" class="mb-2 block text-sm font-semibold text-fg">
          {{ t('simulator.length_label') }}
        </label>
        <input
          id="lengthM"
          type="number"
          min="2"
          max="30"
          step="0.1"
          :value="modelValue.lengthM"
          class="w-full rounded-lg border border-sand bg-white px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15"
          @input="update('lengthM', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div>
        <label for="yearBuilt" class="mb-2 block text-sm font-semibold text-fg">
          {{ t('simulator.year_built_label') }}
        </label>
        <input
          id="yearBuilt"
          type="number"
          :min="1950"
          :max="currentYear"
          :value="modelValue.yearBuilt"
          class="w-full rounded-lg border border-sand bg-white px-4 py-3 text-fg placeholder:text-fg-subtle focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/15"
          @input="update('yearBuilt', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <!-- Navigation category -->
    <div>
      <label class="mb-3 block text-sm font-semibold text-fg">
        {{ t('simulator.nav_category_label') }}
      </label>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="cat in navCategories"
          :key="cat"
          type="button"
          :class="[
            'rounded-xl border-2 p-3 text-left transition-all duration-150',
            modelValue.navigationCategory === cat
              ? 'border-navy-500 bg-navy-50'
              : 'border-bone bg-white hover:border-navy-200 hover:bg-navy-50',
          ]"
          @click="update('navigationCategory', cat)"
        >
          <span
            :class="[
              'block font-display text-xl font-bold',
              modelValue.navigationCategory === cat ? 'text-navy-700' : 'text-fg',
            ]"
            >{{ cat }}</span
          >
          <span class="mt-0.5 block text-xs leading-tight text-fg-muted">
            {{ navCategoryDesc(cat) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Engine checkbox (sailboat/catamaran only) -->
    <div
      v-if="showEngineCheckbox"
      class="flex items-center gap-3 rounded-xl border border-bone bg-white p-3"
    >
      <input
        id="hasDedicatedEngine"
        type="checkbox"
        :checked="modelValue.hasDedicatedEngine ?? true"
        class="size-4 rounded border-sand text-navy-700 focus:ring-navy-500"
        @change="update('hasDedicatedEngine', ($event.target as HTMLInputElement).checked)"
      />
      <label for="hasDedicatedEngine" class="text-sm text-fg">
        {{ t('simulator.has_engine_label') }}
      </label>
    </div>

    <!-- Next button -->
    <button
      type="button"
      :disabled="!canProceed"
      class="w-full rounded-xl bg-coral-500 px-6 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-coral-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
      @click="emit('next')"
    >
      {{ t('simulator.next') }} →
    </button>
  </div>
</template>
