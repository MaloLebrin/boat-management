<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircleIcon, CheckIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'

type PlanQuote = { text: string; author: string }
type Plan = {
  name: string
  price: string
  priceAnnual?: string
  badge: string
  features: string[]
  idealFor: string[]
  quote: PlanQuote
}

interface Props {
  plans: { starter: Plan; pro: Plan; enterprise: Plan }
  billing: 'monthly' | 'annual'
  trust: { noCard: string; cancel: string; euData: string; trial?: string; joinedBy?: string }
  signupLabel: string
  locale: 'en' | 'fr'
}

const props = defineProps<Props>()

const proPrice = computed(() => {
  if (props.billing === 'annual' && props.plans.pro.priceAnnual) {
    return props.plans.pro.priceAnnual
  }
  return props.plans.pro.price
})
</script>

<template>
  <div>
    <!-- Plans grid -->
    <section class="grid gap-6 lg:grid-cols-3">
      <!-- Starter -->
      <BaseCard padded class="hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <p class="font-display text-sm font-semibold text-fg">{{ plans.starter.name }}</p>
            <BaseBadge>{{ plans.starter.badge }}</BaseBadge>
          </div>
          <p class="mt-2 text-2xl font-semibold text-fg">{{ plans.starter.price }}</p>
        </template>
        <ul v-if="plans.starter.idealFor?.length" class="mb-4 space-y-1 border-b border-bone pb-4">
          <li v-for="line in plans.starter.idealFor" :key="line" class="flex items-center gap-2 text-xs text-fg-muted">
            <CheckCircleIcon class="h-4 w-4 shrink-0 text-coral-500" />
            <span>{{ line }}</span>
          </li>
        </ul>
        <ul class="space-y-2">
          <li v-for="f in plans.starter.features" :key="f" class="flex items-center gap-2 text-sm text-fg-muted">
            <CheckIcon class="h-4 w-4 shrink-0 text-mint-700" />
            <span>{{ f }}</span>
          </li>
        </ul>
        <blockquote v-if="plans.starter.quote?.text" class="mt-4 border-t border-bone pt-4 text-xs italic text-fg-subtle">
          "{{ plans.starter.quote.text }}"
          <footer class="mt-1 not-italic font-medium">— {{ plans.starter.quote.author }}</footer>
        </blockquote>
        <template #footer>
          <a href="/signup">
            <BaseButton variant="secondary">{{ signupLabel }}</BaseButton>
          </a>
        </template>
      </BaseCard>

      <!-- Pro -->
      <div class="relative overflow-hidden rounded-xl bg-navy-800 p-6 ring-2 ring-navy-600 shadow-xl shadow-navy-900/20 -translate-y-2 hover:-translate-y-4 transition-all duration-300">
        <div class="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div class="relative">
          <div class="mb-4 flex items-center justify-between gap-3">
            <p class="font-display text-sm italic text-white">{{ plans.pro.name }}</p>
            <span class="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/80">
              {{ plans.pro.badge }}
            </span>
          </div>
          <p class="mb-4 font-display text-3xl italic text-white">{{ proPrice }}</p>
          <ul v-if="plans.pro.idealFor?.length" class="mb-4 space-y-1 border-b border-white/10 pb-4">
            <li v-for="line in plans.pro.idealFor" :key="line" class="flex items-center gap-2 text-xs text-white/60">
              <CheckCircleIcon class="h-4 w-4 shrink-0 text-coral-400" />
              <span>{{ line }}</span>
            </li>
          </ul>
          <ul class="mb-6 space-y-2">
            <li v-for="f in plans.pro.features" :key="f" class="flex items-center gap-2 text-sm text-white/70">
              <CheckIcon class="h-4 w-4 shrink-0 text-mint-400" />
              <span>{{ f }}</span>
            </li>
          </ul>
          <blockquote v-if="plans.pro.quote?.text" class="mb-4 text-xs italic text-white/50 border-t border-white/10 pt-4">
            "{{ plans.pro.quote.text }}"
            <footer class="mt-1 not-italic font-medium text-white/40">— {{ plans.pro.quote.author }}</footer>
          </blockquote>
          <BaseButton href="/signup" variant="secondary">
            {{ signupLabel }}
          </BaseButton>
        </div>
      </div>

      <!-- Enterprise -->
      <BaseCard padded class="hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <p class="font-display text-sm font-semibold text-fg">{{ plans.enterprise.name }}</p>
            <BaseBadge variant="warning">{{ plans.enterprise.badge }}</BaseBadge>
          </div>
          <p class="mt-2 text-2xl font-semibold text-fg">{{ plans.enterprise.price }}</p>
        </template>
        <ul v-if="plans.enterprise.idealFor?.length" class="mb-4 space-y-1 border-b border-bone pb-4">
          <li v-for="line in plans.enterprise.idealFor" :key="line" class="flex items-center gap-2 text-xs text-fg-muted">
            <CheckCircleIcon class="h-4 w-4 shrink-0 text-coral-500" />
            <span>{{ line }}</span>
          </li>
        </ul>
        <ul class="space-y-2">
          <li v-for="f in plans.enterprise.features" :key="f" class="flex items-center gap-2 text-sm text-fg-muted">
            <CheckIcon class="h-4 w-4 shrink-0 text-mint-700" />
            <span>{{ f }}</span>
          </li>
        </ul>
        <blockquote v-if="plans.enterprise.quote?.text" class="mt-4 border-t border-bone pt-4 text-xs italic text-fg-subtle">
          "{{ plans.enterprise.quote.text }}"
          <footer class="mt-1 not-italic font-medium">— {{ plans.enterprise.quote.author }}</footer>
        </blockquote>
        <template #footer>
          <a href="/signup">
            <BaseButton variant="secondary">{{ signupLabel }}</BaseButton>
          </a>
        </template>
      </BaseCard>
    </section>

    <!-- Trust signals -->
    <div class="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-fg-muted">
      <span v-if="trust?.trial" class="flex items-center gap-1.5 font-semibold text-navy-700">
        <span class="h-1.5 w-1.5 rounded-full bg-navy-700" />
        {{ trust.trial }}
      </span>
      <span v-if="trust?.noCard" class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-mint-700" />
        {{ trust.noCard }}
      </span>
      <span v-if="trust?.cancel" class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-mint-700" />
        {{ trust.cancel }}
      </span>
      <span v-if="trust?.euData" class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-mint-700" />
        {{ trust.euData }}
      </span>
    </div>
  </div>
</template>
