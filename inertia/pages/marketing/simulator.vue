<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import { useT } from '~/composables/use_t'
import { useExitIntent } from '~/composables/use_exit_intent'
import { computeSimulatorCosts } from '~/composables/use_simulator_costs'
import SimulatorStepBoat from '~/components/marketing/simulator/SimulatorStepBoat.vue'
import SimulatorStepWear from '~/components/marketing/simulator/SimulatorStepWear.vue'
import SimulatorResultCard from '~/components/marketing/simulator/SimulatorResultCard.vue'
import SimulatorCtaCard from '~/components/marketing/simulator/SimulatorCtaCard.vue'
import SimulatorExitIntentModal from '~/components/marketing/simulator/SimulatorExitIntentModal.vue'
import type {
  SimulatorBoatInput,
  SimulatorCostBreakdown,
  SimulatorBenchmarkEntry,
  SimulatorBenchmarkMap,
} from '../../../shared/types/simulator'

type SharedProps = {
  locale?: 'en' | 'fr'
  isAuthenticated?: boolean
  canAddBoat?: boolean
  benchmarks?: SimulatorBenchmarkMap
}
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
const emailSubmitted = ref(false)

const { triggered: exitIntentOpen } = useExitIntent(() => showResult.value && !emailSubmitted.value)

function getLengthBracket(lengthM: number): string {
  if (lengthM < 6) return '<6'
  if (lengthM < 9) return '6-9'
  if (lengthM < 12) return '9-12'
  if (lengthM < 15) return '12-15'
  return '15+'
}

const activeBenchmark = computed<SimulatorBenchmarkEntry | null>(() => {
  if (!formData.value.boatType || !formData.value.lengthM) return null
  const key = `${formData.value.boatType}:${getLengthBracket(formData.value.lengthM)}`
  return page.props.benchmarks?.[key] ?? null
})

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

const wearStepConfig: Record<
  string,
  {
    wearField: 'hullWear' | 'engineWear' | 'safetyWear' | 'riggingWear'
    labelKey: string
    mention?: string
  }
> = {
  hull: { wearField: 'hullWear', labelKey: 'simulator.hull_wear_label' },
  engine: { wearField: 'engineWear', labelKey: 'simulator.engine_wear_label' },
  safety: {
    wearField: 'safetyWear',
    labelKey: 'simulator.safety_wear_label',
    mention: 'simulator.safety_mention',
  },
  rigging: { wearField: 'riggingWear', labelKey: 'simulator.rigging_wear_label' },
}

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
  if (currentStep.value > 0) currentStep.value--
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

  <!-- Hero dark -->
  <section class="bg-navy-900 px-6 py-12 lg:py-20">
    <div class="mx-auto max-w-3xl text-center">
      <span
        class="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/50"
      >
        {{ t('simulator.hero_eyebrow') }}
      </span>
      <h1
        class="mt-5 font-display text-4xl leading-tight tracking-tight text-white lg:text-5xl xl:text-6xl"
      >
        {{ t('simulator.hero_title') }}
        <em class="text-coral-400">{{ t('simulator.hero_title_highlight') }}</em>
      </h1>
      <p class="mt-4 text-base text-white/60 lg:text-lg">{{ t('simulator.hero_subtitle') }}</p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <span
          v-for="n in [1, 2, 3]"
          :key="n"
          class="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/60"
        >
          <span
            class="flex h-4 w-4 items-center justify-center rounded-full bg-coral-500/30 text-[9px] font-bold text-coral-300"
            >{{ n }}</span
          >
          {{ t(`simulator.how_step_${n}_title`) }}
        </span>
      </div>
    </div>
  </section>

  <!-- Simulator -->
  <section class="bg-cream px-6 py-12 lg:py-16">
    <div class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-2xl border border-bone bg-white shadow-lg">
        <!-- Top accent bar -->
        <div class="h-1.5 bg-gradient-to-r from-coral-500 to-coral-400" />

        <div class="p-6 lg:p-8">
          <!-- Named stepper -->
          <div
            v-if="!showResult"
            class="-mx-6 -mt-6 mb-8 flex items-start rounded-t-xl bg-navy-50/60 px-6 py-5 lg:-mx-8 lg:-mt-8 lg:px-8"
          >
            <template v-for="(step, idx) in steps" :key="step.key">
              <div class="flex flex-col items-center">
                <div
                  :class="[
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-200',
                    idx < currentStep
                      ? 'bg-mint-600 text-white'
                      : idx === currentStep
                        ? 'bg-coral-500 text-white shadow-md ring-4 ring-coral-100'
                        : 'bg-navy-50 text-navy-400 ring-1 ring-bone',
                  ]"
                >
                  <svg
                    v-if="idx < currentStep"
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <template v-else>{{ idx + 1 }}</template>
                </div>
                <span
                  :class="[
                    'mt-1.5 hidden max-w-[80px] text-center text-xs font-semibold leading-tight sm:block',
                    idx === currentStep
                      ? 'text-navy-800'
                      : idx < currentStep
                        ? 'text-mint-600'
                        : 'text-navy-400',
                  ]"
                  >{{ t(step.labelKey) }}</span
                >
              </div>
              <div
                v-if="idx < steps.length - 1"
                class="mx-2 mt-4 h-px flex-1 transition-colors duration-300"
                :class="idx < currentStep ? 'bg-mint-300' : 'bg-bone'"
              />
            </template>
          </div>

          <!-- Step transitions -->
          <Transition name="step" mode="out-in">
            <div :key="showResult ? 'result' : currentStepKey">
              <template v-if="!showResult">
                <SimulatorStepBoat
                  v-if="currentStepKey === 'boat'"
                  v-model="formData"
                  @next="goNext"
                />
                <SimulatorStepWear
                  v-else-if="currentStepKey in wearStepConfig"
                  v-model="formData"
                  v-bind="wearStepConfig[currentStepKey]"
                  @next="goNext"
                  @back="goBack"
                />
              </template>
              <SimulatorResultCard
                v-else-if="costBreakdown"
                :breakdown="costBreakdown"
                :input="formData as SimulatorBoatInput"
                :benchmark="activeBenchmark"
                @restart="restart"
              />
            </div>
          </Transition>
        </div>
      </div>

      <SimulatorCtaCard
        v-if="showResult && costBreakdown"
        :input="formData as SimulatorBoatInput"
        :is-authenticated="isAuthenticated"
        :can-add-boat="canAddBoat"
        :breakdown="costBreakdown"
        @email-submitted="emailSubmitted = true"
      />
    </div>
  </section>

  <SimulatorExitIntentModal
    v-if="costBreakdown && !isAuthenticated"
    v-model:open="exitIntentOpen"
    :input="formData as SimulatorBoatInput"
    :breakdown="costBreakdown"
  />
</template>
