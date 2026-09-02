<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import { ADDON_PRICES, PLAN_LIMITS, PLAN_PRICES } from '../../../../shared/types/plan'

type ProfileKey = 'loueurs' | 'ecoles' | 'marinas' | 'armateurs'

interface ProfileItem {
  label: string
  emoji: string
}

const props = defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  profileLabel: string
  boatsLabel: string
  hourlyLabel: string
  studyNote: string
  savingsLabel: string
  perMonthLabel: string
  timeLabel: string
  maintLabel: string
  fleetideLabel: string
  fleetCostLabel: string
  roiLabel: string
  ctaLabel: string
  profiles: Record<ProfileKey, ProfileItem>
}>()

const { el, isVisible } = useScrollReveal()
const { formatPrice } = useNumberFormat()

// Local state
const boats = ref(12)
const profile = ref<ProfileKey>('loueurs')
const hourlyRate = ref(35)

// Multipliers
const multipliers: Record<ProfileKey, number> = {
  loueurs: 0.35,
  ecoles: 0.25,
  marinas: 0.2,
  armateurs: 0.15,
}

// Computed calculations
const hoursPerWeek = computed(() => {
  const raw = 2 + boats.value * multipliers[profile.value]
  return Math.min(12, Math.round(raw * 10) / 10)
})

const annualLabor = computed(() => {
  return hoursPerWeek.value * 52 * hourlyRate.value
})

const missedMaint = computed(() => {
  const base = profile.value === 'loueurs' ? 180 : profile.value === 'ecoles' ? 120 : 90
  return boats.value * base
})

const optimizations = computed(() => boats.value * 40)

const totalSavings = computed(() => {
  return annualLabor.value + missedMaint.value + optimizations.value
})

/**
 * Coût FleetAi annuel pour la flotte simulée, dérivé du barème réel (#612) :
 * Starter tant que la flotte tient dans son quota, puis le socle Pro, puis Pro
 * complété d'autant d'add-ons `extra_boats` que de bateaux au-delà — plafonné
 * par Entreprise, qui redevient la meilleure affaire à partir d'une vingtaine
 * de bateaux. La section chiffrait auparavant un tarif Pro à 29 €/mois qui
 * n'existe plus, et un seuil de 25 bateaux sans rapport avec `PLAN_LIMITS`.
 */
const fleetCost = computed(() => {
  const fleet = boats.value
  if (fleet <= (PLAN_LIMITS.starter.maxBoats ?? 0)) return 0
  const proMax = PLAN_LIMITS.pro.maxBoats ?? 0
  if (fleet <= proMax) return PLAN_PRICES.pro.annualTotal
  const withExtraBoats =
    PLAN_PRICES.pro.annualTotal + (fleet - proMax) * ADDON_PRICES.extra_boats.annualTotal
  return Math.min(withExtraBoats, PLAN_PRICES.enterprise.annualTotal)
})

const perMonthText = computed(() =>
  props.perMonthLabel.replace('{amount}', formatPrice(Math.round(totalSavings.value / 12)))
)

const roiX = computed(() => {
  return Math.round((totalSavings.value / Math.max(fleetCost.value, 1)) * 10) / 10
})

const profileKeys: ProfileKey[] = ['loueurs', 'ecoles', 'marinas', 'armateurs']
</script>

<template>
  <section :ref="el" class="reveal bg-paper px-6 py-20 lg:px-8" :class="{ visible: isVisible }">
    <div class="mx-auto max-w-7xl">
      <!-- Header -->
      <div class="mb-12 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
          {{ eyebrow }}
        </p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">
          {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
        </h2>
        <p class="mt-2 text-fg-muted">{{ subtitle }}</p>
      </div>

      <!-- Calculator -->
      <div class="grid gap-8 lg:grid-cols-2">
        <!-- Left: Controls -->
        <div class="rounded-2xl bg-cream p-8">
          <!-- Profile selector -->
          <p class="mb-3 text-sm font-medium text-fg">{{ profileLabel }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="key in profileKeys"
              :key="key"
              type="button"
              :class="[
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                profile === key ? 'bg-navy-900 text-white' : 'bg-paper text-fg-muted hover:bg-bone',
              ]"
              @click="profile = key"
            >
              {{ profiles[key].emoji }} {{ profiles[key].label }}
            </button>
          </div>

          <!-- Boats slider -->
          <div class="mt-8">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-fg">{{ boatsLabel }}</label>
              <span class="font-mono text-lg font-bold text-fg">{{ boats }}</span>
            </div>
            <input
              v-model.number="boats"
              type="range"
              min="1"
              max="50"
              class="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-bone accent-navy-900"
            />
          </div>

          <!-- Hourly rate slider -->
          <div class="mt-6">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-fg">{{ hourlyLabel }}</label>
              <span class="font-mono text-lg font-bold text-fg">{{ formatPrice(hourlyRate) }}</span>
            </div>
            <input
              v-model.number="hourlyRate"
              type="range"
              min="20"
              max="80"
              class="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-bone accent-navy-900"
            />
          </div>

          <!-- Study note -->
          <p class="mt-6 text-xs text-fg-subtle italic">{{ studyNote }}</p>
        </div>

        <!-- Right: Results -->
        <div class="rounded-2xl bg-navy-900 p-8 text-white">
          <!-- Total savings -->
          <p class="text-xs font-semibold uppercase tracking-widest text-white/50">
            {{ savingsLabel }}
          </p>
          <p class="mt-2 font-display text-5xl lg:text-6xl xl:text-7xl">
            {{ formatPrice(totalSavings) }}
          </p>
          <p class="mt-1 text-sm text-white/60">{{ perMonthText }}</p>

          <!-- Breakdown -->
          <div class="mt-8 space-y-4 border-t border-white/10 pt-6">
            <div class="flex items-center justify-between">
              <span class="text-sm text-white/70">{{ timeLabel }}</span>
              <span class="font-mono text-sm">{{ formatPrice(annualLabor) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-white/70">{{ maintLabel }}</span>
              <span class="font-mono text-sm">{{ formatPrice(missedMaint) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-white/70">{{ fleetideLabel }}</span>
              <span class="font-mono text-sm">{{ formatPrice(optimizations) }}</span>
            </div>
          </div>

          <!-- Fleet cost vs ROI -->
          <div class="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
            <div>
              <p class="text-xs text-white/50">{{ fleetCostLabel }}</p>
              <p class="font-mono text-lg">{{ formatPrice(fleetCost) }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-white/50">{{ roiLabel }}</p>
              <p class="font-display text-2xl text-coral-400">x{{ roiX }}</p>
            </div>
          </div>

          <!-- CTA -->
          <div class="mt-8">
            <BaseButton href="/signup" class="w-full bg-white! text-navy-900! hover:bg-cream!">
              {{ ctaLabel }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
