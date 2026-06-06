<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import { computeSimulatorCosts } from '~/composables/use_simulator_costs'
import SimulatorStepHull from '~/components/marketing/simulator/SimulatorStepHull.vue'
import SimulatorStepEngine from '~/components/marketing/simulator/SimulatorStepEngine.vue'
import SimulatorStepSafety from '~/components/marketing/simulator/SimulatorStepSafety.vue'
import SimulatorStepRigging from '~/components/marketing/simulator/SimulatorStepRigging.vue'
import SimulatorResultCard from '~/components/marketing/simulator/SimulatorResultCard.vue'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '../../../shared/types/simulator'

const props = defineProps<{
  boat: { id: number; name: string }
  partial: Partial<SimulatorBoatInput>
}>()

const { t } = useT()

const currentStep = ref(0)
const formData = ref<Partial<SimulatorBoatInput>>({ ...props.partial })
const showResult = ref(false)
const costBreakdown = ref<SimulatorCostBreakdown | null>(null)

const needsEngineStep = computed(() => {
  const bt = formData.value.boatType
  if (bt === 'motorboat' || bt === 'rib') return true
  if ((bt === 'sailboat' || bt === 'catamaran') && formData.value.hasDedicatedEngine) return true
  return false
})

const needsRiggingStep = computed(() => {
  const bt = formData.value.boatType
  return bt === 'sailboat' || bt === 'catamaran'
})

const steps = computed(() => {
  const list: { key: string; labelKey: string }[] = [
    { key: 'hull', labelKey: 'simulator.step_hull' },
  ]
  if (needsEngineStep.value) {
    list.push({ key: 'engine', labelKey: 'simulator.step_engine' })
  }
  list.push({ key: 'safety', labelKey: 'simulator.step_safety' })
  if (needsRiggingStep.value) {
    list.push({ key: 'rigging', labelKey: 'simulator.step_rigging' })
  }
  return list
})

const currentStepKey = computed(() => steps.value[currentStep.value]?.key ?? 'hull')

const progressPercent = computed(() => {
  if (showResult.value) return 100
  return Math.round(((currentStep.value + 1) / steps.value.length) * 100)
})

function goNext() {
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
  } else {
    const input = formData.value as SimulatorBoatInput
    if (!needsEngineStep.value) input.engineWear = null
    if (!needsRiggingStep.value) input.riggingWear = null
    costBreakdown.value = computeSimulatorCosts(input)
    showResult.value = true
  }
}

function goBack() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function restart() {
  currentStep.value = 0
  formData.value = { ...props.partial }
  showResult.value = false
  costBreakdown.value = null
}

function goToBoat() {
  router.visit(`/boats/${props.boat.id}`)
}
</script>

<template>
  <div class="bg-paper px-6 py-12 lg:px-8 lg:py-16 min-h-screen">
    <div class="mx-auto max-w-xl">
      <!-- Header -->
      <div class="mb-8">
        <button
          type="button"
          class="mb-4 flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
          @click="goToBoat"
        >
          <span>←</span>
          <span>{{ t('boats.simulator.backButton') }}</span>
        </button>
        <h1 class="font-display text-2xl text-fg lg:text-3xl">
          {{ t('boats.simulator.pageTitle', { name: boat.name }) }}
        </h1>
        <p class="mt-1 text-sm text-fg-muted">{{ t('boats.simulator.subtitle') }}</p>
      </div>

      <!-- Progress bar -->
      <div v-if="!showResult" class="mb-8">
        <div class="mb-2 flex items-center justify-between text-sm text-fg-muted">
          <span>{{ t(steps[currentStep]?.labelKey || 'simulator.step_hull') }}</span>
          <span>{{ currentStep + 1 }}/{{ steps.length }}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-bone">
          <div
            class="h-full bg-coral-500 transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <!-- Steps -->
      <template v-if="!showResult">
        <SimulatorStepHull
          v-if="currentStepKey === 'hull'"
          v-model="formData"
          @next="goNext"
          @back="goBack"
        />
        <SimulatorStepEngine
          v-else-if="currentStepKey === 'engine'"
          v-model="formData"
          @next="goNext"
          @back="goBack"
        />
        <SimulatorStepSafety
          v-else-if="currentStepKey === 'safety'"
          v-model="formData"
          @next="goNext"
          @back="goBack"
        />
        <SimulatorStepRigging
          v-else-if="currentStepKey === 'rigging'"
          v-model="formData"
          @next="goNext"
          @back="goBack"
        />
      </template>

      <!-- Result -->
      <template v-else-if="costBreakdown">
        <SimulatorResultCard
          :breakdown="costBreakdown"
          :input="formData as SimulatorBoatInput"
          @restart="restart"
        />
        <div class="mt-6 text-center">
          <button
            type="button"
            class="rounded-xl bg-coral-500 px-6 py-3 text-sm font-semibold text-white hover:bg-coral-600"
            @click="goToBoat"
          >
            {{ t('boats.simulator.backButton') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
