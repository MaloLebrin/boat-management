<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import { useT } from '~/composables/use_t'
import { computeSimulatorCosts } from '~/composables/use_simulator_costs'
import SimulatorStepBoat from '~/components/marketing/simulator/SimulatorStepBoat.vue'
import SimulatorStepHull from '~/components/marketing/simulator/SimulatorStepHull.vue'
import SimulatorStepEngine from '~/components/marketing/simulator/SimulatorStepEngine.vue'
import SimulatorStepSafety from '~/components/marketing/simulator/SimulatorStepSafety.vue'
import SimulatorStepRigging from '~/components/marketing/simulator/SimulatorStepRigging.vue'
import SimulatorResultCard from '~/components/marketing/simulator/SimulatorResultCard.vue'
import SimulatorCtaCard from '~/components/marketing/simulator/SimulatorCtaCard.vue'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '../../../shared/types/simulator'

type SharedProps = { locale?: 'en' | 'fr'; isAuthenticated?: boolean; canAddBoat?: boolean }
const page = usePage<SharedProps>()

const isAuthenticated = computed(() => page.props.isAuthenticated ?? false)
const canAddBoat = computed(() => page.props.canAddBoat ?? true)

const { t } = useT()

const locale = computed<'en' | 'fr'>(() => (page.props.locale ?? 'fr') as 'en' | 'fr')

const currentStep = ref(0)
const formData = ref<Partial<SimulatorBoatInput>>({
  hasDedicatedEngine: true,
})

const showResult = ref(false)
const costBreakdown = ref<SimulatorCostBreakdown | null>(null)

// Determine which steps are needed based on boat type and engine
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

// Build dynamic steps list
const steps = computed(() => {
  const list: { key: string; labelKey: string }[] = [
    { key: 'boat', labelKey: 'simulator.step_boat' },
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

const currentStepKey = computed(() => steps.value[currentStep.value]?.key ?? 'boat')

const progressPercent = computed(() => {
  if (showResult.value) return 100
  return Math.round(((currentStep.value + 1) / steps.value.length) * 100)
})

function goNext() {
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
  } else {
    // Compute result
    const input = formData.value as SimulatorBoatInput
    if (!needsEngineStep.value) {
      input.engineWear = null
    }
    if (!needsRiggingStep.value) {
      input.riggingWear = null
    }
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
  formData.value = { hasDedicatedEngine: true }
  showResult.value = false
  costBreakdown.value = null
}
</script>

<template>
  <Head :title="t('simulator.meta_title')">
    <meta name="description" :content="t('simulator.meta_description')" />
    <meta property="og:title" :content="t('simulator.meta_title')" />
    <meta property="og:description" :content="t('simulator.meta_description')" />
    <link rel="canonical" :href="`/${locale}/simulateur`" />
    <link rel="alternate" hreflang="en" href="/en/simulator" />
    <link rel="alternate" hreflang="fr" href="/fr/simulateur" />
  </Head>

  <!-- Hero Section -->
  <section class="bg-cream px-6 py-16 lg:px-8 lg:py-24">
    <div class="mx-auto max-w-3xl text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ t('simulator.hero_eyebrow') }}
      </p>
      <h1
        class="mt-4 font-display text-4xl leading-tight tracking-tight text-fg lg:text-5xl xl:text-6xl"
      >
        {{ t('simulator.hero_title') }}
        <em class="text-coral-500">{{ t('simulator.hero_title_highlight') }}</em>
      </h1>
      <p class="mt-4 text-lg text-fg-muted">
        {{ t('simulator.hero_subtitle') }}
      </p>
    </div>
  </section>

  <!-- How it works -->
  <section class="bg-paper px-6 py-10 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <p class="text-center text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ t('simulator.how_eyebrow') }}
      </p>
      <h2 class="mt-2 text-center font-display text-xl text-fg lg:text-2xl">
        {{ t('simulator.how_title') }}
      </h2>
      <div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div v-for="n in [1, 2, 3]" :key="n" class="flex items-start gap-4">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral-100 text-sm font-bold text-coral-600">{{ n }}</span>
          <div>
            <p class="font-semibold text-fg text-sm">{{ t(`simulator.how_step_${n}_title`) }}</p>
            <p class="mt-1 text-xs text-fg-muted">{{ t(`simulator.how_step_${n}_desc`) }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Simulator Section -->
  <section class="bg-paper px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-xl">
      <!-- Progress bar -->
      <div v-if="!showResult" class="mb-8">
        <div class="mb-2 flex items-center justify-between text-sm text-fg-muted">
          <span>
            {{ t(steps[currentStep]?.labelKey || 'simulator.step_boat') }}
          </span>
          <span>{{ currentStep + 1 }}/{{ steps.length }}</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-bone">
          <div
            class="h-full bg-coral-500 transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <!-- Step components -->
      <template v-if="!showResult">
        <SimulatorStepBoat
          v-if="currentStepKey === 'boat'"
          v-model="formData"
          @next="goNext"
        />
        <SimulatorStepHull
          v-else-if="currentStepKey === 'hull'"
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
        <SimulatorCtaCard :input="formData as SimulatorBoatInput" :is-authenticated="isAuthenticated" :can-add-boat="canAddBoat" />
      </template>
    </div>
  </section>
</template>
