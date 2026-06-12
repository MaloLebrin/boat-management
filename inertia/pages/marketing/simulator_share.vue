<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import SimulatorResultCard from '~/components/marketing/simulator/SimulatorResultCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '../../../shared/types/simulator'

interface Props {
  token: string
  input: SimulatorBoatInput
  breakdown: SimulatorCostBreakdown
  locale: 'en' | 'fr'
}

const props = defineProps<Props>()

const { t } = useT()

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(props.locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const boatTypeLabel = computed(() => {
  const typeKey = `simulator.boat_type_${props.input.boatType}`
  return t(typeKey)
})

const ogTitle = computed(() => {
  const min = formatCurrency(props.breakdown.totalMin)
  const max = formatCurrency(props.breakdown.totalMax)
  if (props.locale === 'fr') {
    return `Entretien ${boatTypeLabel.value} ${props.input.lengthM}m - ${min}-${max}/an | FleetAi`
  }
  return `${props.input.lengthM}m ${boatTypeLabel.value} maintenance - ${min}-${max}/year | FleetAi`
})

const ogDescription = computed(() => t('simulator.share_page_subtitle'))

const simulatorHref = computed(() => {
  return props.locale === 'fr' ? '/fr/simulateur' : '/en/simulator'
})
</script>

<template>
  <Head :title="t('simulator.share_page_title')">
    <meta name="description" :content="ogDescription" />
    <meta property="og:title" :content="ogTitle" />
    <meta property="og:description" :content="ogDescription" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" :content="ogTitle" />
    <meta name="twitter:description" :content="ogDescription" />
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
        {{ t('simulator.share_page_title') }}
      </h1>
      <p class="mt-4 text-base text-white/60 lg:text-lg">
        {{ t('simulator.share_page_subtitle') }}
      </p>
    </div>
  </section>

  <!-- Result card -->
  <section class="bg-cream px-6 py-12 lg:py-16">
    <div class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-2xl border border-bone bg-white shadow-lg">
        <div class="h-1.5 bg-gradient-to-r from-coral-500 to-coral-400" />
        <div class="p-6 lg:p-8">
          <SimulatorResultCard :breakdown="breakdown" :input="input" />
        </div>
      </div>

      <!-- CTA Banner -->
      <div class="mt-8 rounded-2xl border border-bone bg-white p-6 text-center shadow-lg lg:p-8">
        <h2 class="font-display text-2xl text-fg">
          {{ t('simulator.share_cta_title') }}
        </h2>
        <div class="mt-4">
          <Link :href="simulatorHref">
            <BaseButton variant="primary" size="lg">
              {{ t('simulator.share_cta_button') }}
            </BaseButton>
          </Link>
        </div>
      </div>
    </div>
  </section>
</template>
