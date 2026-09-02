<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/solid'
import BaseButton from '~/components/base/BaseButton.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface Tier {
  name: string
  tag: string
  price: number
  pricePer?: string
  priceAnnual?: number
  priceAnnualPer?: string
  sub: string
  featured?: boolean
  feats: Array<[string, string?]>
  cta: string
  ctaVariant: string
}

interface ReassuranceItem {
  icon: string
  label: string
}

defineProps<{
  tiers: Tier[]
  billing: 'monthly' | 'annual'
  reassurance: ReassuranceItem[]
  featuredBadgeLabel: string
  billedAnnuallyNote: string
  /** Libellé du prix nul, ex. « Gratuit » — un plan à 0 € ne s'écrit pas « 0 € ». */
  freeLabel: string
}>()

const { el, isVisible } = useScrollReveal()
const { formatPrice } = useNumberFormat()

/**
 * Prix affiché sur une carte (#612). Le montant passe par `formatPrice` comme
 * partout ailleurs sur la page — la carte rendait le nombre nu, si bien que
 * « 20 » y côtoyait « 20 € » dans le comparatif deux sections plus bas — et un
 * socle gratuit affiche son libellé plutôt qu'un « 0 » suivi de « / mois ».
 */
function priceOf(tier: Tier, billing: 'monthly' | 'annual'): number {
  return billing === 'annual' && tier.priceAnnual !== undefined ? tier.priceAnnual : tier.price
}

function isFree(tier: Tier, billing: 'monthly' | 'annual'): boolean {
  return priceOf(tier, billing) === 0
}
</script>

<template>
  <section
    :ref="el"
    class="reveal bg-cream px-6 pb-16 pt-20 lg:px-8 lg:pt-28"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <!-- Tiers grid -->
      <div class="grid gap-6 lg:grid-cols-3">
        <div
          v-for="(tier, idx) in tiers"
          :key="tier.name"
          :class="[
            'relative rounded-2xl p-8 transition-all duration-300',
            tier.featured
              ? 'glow-border z-10 -translate-y-3 bg-navy-900 text-white shadow-xl'
              : 'bg-paper text-fg hover:-translate-y-1 hover:shadow-md',
          ]"
          :style="{ transitionDelay: `${idx * 100}ms` }"
        >
          <!-- Featured badge -->
          <span
            v-if="tier.featured"
            class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-coral-500 px-4 py-1 text-xs font-bold text-white"
          >
            ★ {{ featuredBadgeLabel }}
          </span>

          <!-- Tag -->
          <p
            :class="[
              'text-xs font-semibold uppercase tracking-widest',
              tier.featured ? 'text-white/50' : 'text-fg-subtle',
            ]"
          >
            {{ tier.tag }}
          </p>

          <!-- Name -->
          <h3 class="mt-2 font-display text-3xl">{{ tier.name }}</h3>

          <!-- Price -->
          <div class="mt-4 flex items-baseline gap-1">
            <span class="font-display text-5xl lg:text-6xl">
              {{ isFree(tier, billing) ? freeLabel : formatPrice(priceOf(tier, billing)) }}
            </span>
            <span
              v-if="
                !isFree(tier, billing) &&
                ((billing === 'annual' && tier.priceAnnualPer) ||
                  (billing === 'monthly' && tier.pricePer))
              "
              :class="['text-sm', tier.featured ? 'text-white/60' : 'text-fg-muted']"
            >
              {{ billing === 'annual' ? tier.priceAnnualPer : tier.pricePer }}
            </span>
          </div>

          <!-- Annual billing note -->
          <p
            v-if="billing === 'annual' && tier.priceAnnual !== undefined && !isFree(tier, billing)"
            :class="['mt-1 text-xs', tier.featured ? 'text-white/50' : 'text-fg-subtle']"
          >
            {{ billedAnnuallyNote }}
          </p>

          <!-- Sub -->
          <p :class="['mt-2 text-sm', tier.featured ? 'text-white/60' : 'text-fg-muted']">
            {{ tier.sub }}
          </p>

          <!-- CTA -->
          <div class="mt-6">
            <BaseButton
              :class="[
                'w-full',
                tier.featured
                  ? 'bg-white! text-navy-900! hover:bg-cream!'
                  : tier.ctaVariant === 'secondary'
                    ? ''
                    : 'bg-navy-900! text-white! hover:bg-navy-800!',
              ]"
              :variant="tier.ctaVariant === 'secondary' ? 'secondary' : 'primary'"
              href="/signup"
            >
              {{ tier.cta }}
            </BaseButton>
          </div>

          <!-- Features -->
          <ul class="mt-8 space-y-3">
            <li v-for="[feat, sub] in tier.feats" :key="feat" class="flex items-start gap-3">
              <CheckIcon
                :class="[
                  'mt-0.5 h-5 w-5 shrink-0',
                  tier.featured ? 'text-coral-400' : 'text-mint-600',
                ]"
              />
              <span>
                <span :class="['text-sm', tier.featured ? 'text-white' : 'text-fg']">
                  {{ feat }}
                </span>
                <span
                  v-if="sub"
                  :class="['block text-xs', tier.featured ? 'text-white/50' : 'text-fg-subtle']"
                >
                  {{ sub }}
                </span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Reassurance bar -->
      <div class="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-fg-muted">
        <span v-for="item in reassurance" :key="item.label" class="flex items-center gap-2">
          <span>{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </span>
      </div>
    </div>
  </section>
</template>
