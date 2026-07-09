<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import { useTweenNumber } from '~/composables/use_tween_number'
import PricingConfiguratorModuleCard from './PricingConfiguratorModuleCard.vue'

interface ConfiguratorModule {
  key: string
  icon: string
  name: string
  desc: string
  priceMonthly: number
  priceAnnual: number
  features: string[]
}

interface EnterpriseInfo {
  name: string
  priceMonthly: number
  priceAnnual: number
  note: string
  ctaLabel: string
}

const props = defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  baseName: string
  baseDesc: string
  basePriceMonthly: number
  basePriceAnnual: number
  modulesLabel: string
  perMonth: string
  perYear: string
  totalLabel: string
  annualSaveLabel: string
  billedAnnuallyNote: string
  ctaLabel: string
  ctaHref: string
  modules: ConfiguratorModule[]
  enterprise: EnterpriseInfo
  billing: 'monthly' | 'annual'
}>()

const selected = ref<Set<string>>(new Set())

function toggle(key: string) {
  const next = new Set(selected.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selected.value = next
}

const isAnnual = computed(() => props.billing === 'annual')
const basePrice = computed(() => (isAnnual.value ? props.basePriceAnnual : props.basePriceMonthly))

function unitPrice(m: ConfiguratorModule) {
  return isAnnual.value ? m.priceAnnual : m.priceMonthly
}

const total = computed(() => {
  let sum = basePrice.value
  for (const m of props.modules) {
    if (selected.value.has(m.key)) sum += unitPrice(m)
  }
  return sum
})

// Économie annuelle : (total aux prix mensuels − total aux prix annuels) × 12.
const annualSaving = computed(() => {
  const monthly =
    props.basePriceMonthly +
    props.modules.reduce((s, m) => (selected.value.has(m.key) ? s + m.priceMonthly : s), 0)
  const annual =
    props.basePriceAnnual +
    props.modules.reduce((s, m) => (selected.value.has(m.key) ? s + m.priceAnnual : s), 0)
  return (monthly - annual) * 12
})

const enterprisePrice = computed(() =>
  isAnnual.value ? props.enterprise.priceAnnual : props.enterprise.priceMonthly
)

defineExpose({ total, annualSaving, selected })

// Total et économie qui « roulent » à chaque changement de sélection/intervalle.
const totalDisplay = useTweenNumber(total)
const savingDisplay = useTweenNumber(annualSaving)

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section :ref="el" class="reveal bg-cream px-6 py-20 lg:px-8" :class="{ visible: isVisible }">
    <div class="mx-auto max-w-5xl">
      <!-- Header -->
      <div class="mb-10 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{{ eyebrow }}</p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">
          {{ title }} <em class="text-gradient-animated not-italic">{{ titleHighlight }}</em>
        </h2>
        <p class="mt-2 text-fg-muted">{{ subtitle }}</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <!-- Colonne configuration (entrée staggerée) -->
        <div class="space-y-5 stagger" :class="{ visible: isVisible }">
          <!-- Socle Pro (toujours inclus) -->
          <div class="rounded-2xl border border-navy-900 bg-navy-900 p-5 text-white">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="font-display text-xl">{{ baseName }}</h3>
                <p class="mt-0.5 text-sm text-white/60">{{ baseDesc }}</p>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="font-display text-2xl">{{ basePrice }} €</span>
                <span class="text-sm text-white/60">{{ perMonth }}</span>
              </div>
            </div>
          </div>

          <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
            {{ modulesLabel }}
          </p>

          <PricingConfiguratorModuleCard
            v-for="m in modules"
            :key="m.key"
            :icon="m.icon"
            :name="m.name"
            :desc="m.desc"
            :price="unitPrice(m)"
            :price-per="perMonth"
            :features="m.features"
            :selected="selected.has(m.key)"
            @toggle="toggle(m.key)"
          />
        </div>

        <!-- Colonne récap (sticky) — liseré lumineux animé -->
        <aside class="lg:sticky lg:top-24 lg:self-start">
          <div class="glow-border rounded-2xl border border-bone bg-white p-6 shadow-sm">
            <p class="text-sm text-fg-muted">{{ totalLabel }}</p>
            <div class="mt-1 flex items-baseline gap-1">
              <span class="font-display text-5xl text-fg tabular-nums">
                {{ Math.round(totalDisplay) }} €
              </span>
              <span class="text-sm text-fg-muted">{{ perMonth }}</span>
            </div>
            <p v-if="isAnnual && annualSaving > 0" class="mt-2 text-sm font-medium text-mint-700">
              {{ annualSaveLabel }} {{ Math.round(savingDisplay) }} €
            </p>
            <p v-if="isAnnual" class="mt-1 text-xs text-fg-subtle">{{ billedAnnuallyNote }}</p>

            <BaseButton :href="ctaHref" size="lg" class="mt-5 w-full">{{ ctaLabel }}</BaseButton>

            <!-- Comparaison Enterprise -->
            <div class="mt-6 border-t border-bone pt-5">
              <div class="flex items-baseline justify-between gap-2">
                <span class="font-semibold text-fg">{{ enterprise.name }}</span>
                <span class="font-display text-lg text-fg">{{ enterprisePrice }} €</span>
              </div>
              <p class="mt-1 text-xs text-fg-muted">{{ enterprise.note }}</p>
              <BaseButton :href="ctaHref" variant="outline" size="sm" class="mt-3 w-full">
                {{ enterprise.ctaLabel }}
              </BaseButton>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>
