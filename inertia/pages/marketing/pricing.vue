<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

type PageProps = {
  t: {
    brand: { name: string }
    nav: { login: string; signup: string }
    meta: { title: string; description: string }

    pricing: {
      title: string
      subtitle: string
      note: string
      billing: { monthly: string; annual: string; hint: string }
      trust: { noCard: string; cancel: string; euData: string }
      plans: {
        starter: { name: string; price: string; badge: string; features: string[] }
        pro: { name: string; price: string; priceAnnual?: string; badge: string; features: string[] }
        enterprise: { name: string; price: string; badge: string; features: string[] }
      }
      compare: { title: string; items: string[] }
      compareTable: {
        headers: { feature: string; starter: string; pro: string; enterprise: string }
        rows: Array<{ feature: string; starter: string; pro: string; enterprise: string }>
      }
      faq: { title: string; items: Array<{ q: string; a: string }> }
      cta: { title: string; subtitle: string; primary: string; secondary: string }
    }
  }
}

type SharedProps = { locale?: 'en' | 'fr' }
const page = usePage<SharedProps>()

const props = defineProps<PageProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')
const t = props.t

// Billing toggle
const billing = ref<'monthly' | 'annual'>('monthly')

// Scroll reveal instances
const { el: plansEl, isVisible: plansVisible } = useScrollReveal()
const { el: compareEl, isVisible: compareVisible } = useScrollReveal()
const { el: faqEl, isVisible: faqVisible } = useScrollReveal()
const { el: ctaEl, isVisible: ctaVisible } = useScrollReveal()

// Pro price based on billing
const proPrice = computed(() => {
  if (billing.value === 'annual' && t.pricing.plans.pro.priceAnnual) {
    return t.pricing.plans.pro.priceAnnual
  }
  return t.pricing.plans.pro.price
})
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
    <meta property="og:image" content="https://fleetai.app/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" :content="t.meta.title" />
    <meta name="twitter:description" :content="t.meta.description" />
    <link rel="canonical" :href="`/${locale}/tarifs`" />
    <link rel="alternate" hreflang="en" href="/en/tarifs" />
    <link rel="alternate" hreflang="fr" href="/fr/tarifs" />
  </Head>

  <div class="max-w-7xl mx-auto">
    <section class="max-w-3xl space-y-4">
      <BaseBadge variant="info">{{ t.brand.name }}</BaseBadge>
      <BaseHeading level="display">{{ t.pricing.title }}</BaseHeading>
      <p class="text-pretty text-lg text-fg-muted">{{ t.pricing.subtitle }}</p>
    </section>

    <!-- Billing toggle -->
    <div class="mt-10 flex items-center justify-center gap-3">
      <button
        @click="billing = 'monthly'"
        :class="billing === 'monthly' ? 'bg-navy-900 text-white' : 'bg-paper text-fg-muted hover:bg-bone'"
        class="rounded-full px-5 py-2 text-sm font-medium transition-colors"
      >
        {{ t.pricing.billing?.monthly }}
      </button>
      <button
        @click="billing = 'annual'"
        :class="billing === 'annual' ? 'bg-navy-900 text-white' : 'bg-paper text-fg-muted hover:bg-bone'"
        class="rounded-full px-5 py-2 text-sm font-medium transition-colors"
      >
        {{ t.pricing.billing?.annual }}
      </button>
    </div>
    <p v-if="billing === 'annual' && t.pricing.billing?.hint" class="text-center text-sm text-mint-700 mt-4 mb-2">
      {{ t.pricing.billing.hint }}
    </p>

    <!-- Plans -->
    <section
      :ref="(el) => plansEl = el as HTMLElement"
      class="mt-8 reveal grid gap-6 lg:grid-cols-3"
      :class="{ visible: plansVisible }"
    >
      <BaseCard padded>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <p class="font-display text-sm font-semibold text-fg">{{ t.pricing.plans.starter.name }}</p>
            <BaseBadge>{{ t.pricing.plans.starter.badge }}</BaseBadge>
          </div>
          <p class="mt-2 text-2xl font-semibold text-fg">{{ t.pricing.plans.starter.price }}</p>
        </template>
        <ul class="space-y-2 text-sm text-fg-muted">
          <li v-for="f in t.pricing.plans.starter.features" :key="f" class="flex items-start gap-2">
            <span class="mt-1 inline-block h-2 w-2 rounded-full bg-lilac-300" aria-hidden="true" />
            <span>{{ f }}</span>
          </li>
        </ul>
        <template #footer>
          <a href="/signup">
            <BaseButton variant="secondary">{{ t.nav.signup }}</BaseButton>
          </a>
        </template>
      </BaseCard>

      <!-- Plan Pro -->
      <div class="relative overflow-hidden rounded-xl bg-navy-800 p-6 ring-2 ring-navy-600 shadow-xl shadow-navy-900/20 -translate-y-2">
        <div class="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div class="relative">
          <div class="mb-4 flex items-center justify-between gap-3">
            <p class="font-display text-sm italic text-white">{{ t.pricing.plans.pro.name }}</p>
            <span class="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/80">
              {{ t.pricing.plans.pro.badge }}
            </span>
          </div>
          <p class="mb-4 font-display text-3xl italic text-white">{{ proPrice }}</p>
          <ul class="mb-6 space-y-2 text-sm text-white/70">
            <li v-for="f in t.pricing.plans.pro.features" :key="f" class="flex items-start gap-2">
              <span class="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" aria-hidden="true" />
              <span>{{ f }}</span>
            </li>
          </ul>
          <BaseButton href="/signup" variant="secondary">
            {{ t.nav.signup }}
          </BaseButton>
        </div>
      </div>

      <BaseCard padded>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <p class="font-display text-sm font-semibold text-fg">{{ t.pricing.plans.enterprise.name }}</p>
            <BaseBadge variant="warning">{{ t.pricing.plans.enterprise.badge }}</BaseBadge>
          </div>
          <p class="mt-2 text-2xl font-semibold text-fg">{{ t.pricing.plans.enterprise.price }}</p>
        </template>
        <ul class="space-y-2 text-sm text-fg-muted">
          <li v-for="f in t.pricing.plans.enterprise.features" :key="f" class="flex items-start gap-2">
            <span class="mt-1 inline-block h-2 w-2 rounded-full bg-peach-300" aria-hidden="true" />
            <span>{{ f }}</span>
          </li>
        </ul>
        <template #footer>
          <a href="/signup">
            <BaseButton variant="secondary">{{ locale === 'fr' ? 'Parlons-en' : 'Talk to us' }}</BaseButton>
          </a>
        </template>
      </BaseCard>
    </section>

    <!-- Trust signals -->
    <div class="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-fg-muted">
      <span v-if="t.pricing.trust?.noCard" class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-mint-700" />
        {{ t.pricing.trust.noCard }}
      </span>
      <span v-if="t.pricing.trust?.cancel" class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-mint-700" />
        {{ t.pricing.trust.cancel }}
      </span>
      <span v-if="t.pricing.trust?.euData" class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-mint-700" />
        {{ t.pricing.trust.euData }}
      </span>
    </div>

    <!-- Comparison table -->
    <section
      v-if="t.pricing.compareTable?.rows"
      :ref="(el) => compareEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: compareVisible }"
    >
      <div class="mb-6">
        <BaseHeading level="2">{{ t.pricing.compare.title }}</BaseHeading>
      </div>
      <div class="overflow-x-auto rounded-xl border border-bone bg-white">
        <table class="w-full text-sm">
          <thead class="bg-paper">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">{{ t.pricing.compareTable.headers.feature }}</th>
              <th class="px-4 py-3 text-center font-semibold text-fg">{{ t.pricing.compareTable.headers.starter }}</th>
              <th class="px-4 py-3 text-center font-semibold text-navy-700 bg-navy-50">{{ t.pricing.compareTable.headers.pro }}</th>
              <th class="px-4 py-3 text-center font-semibold text-fg">{{ t.pricing.compareTable.headers.enterprise }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-bone">
            <tr v-for="row in t.pricing.compareTable.rows" :key="row.feature">
              <td class="px-4 py-3 font-medium text-fg">{{ row.feature }}</td>
              <td class="px-4 py-3 text-center">
                <span v-if="row.starter === 'true'" class="text-mint-700">&#10003;</span>
                <span v-else-if="row.starter === 'false'" class="text-fg-subtle">&mdash;</span>
                <span v-else class="text-fg-muted text-xs">{{ row.starter }}</span>
              </td>
              <td class="px-4 py-3 text-center bg-navy-50/30">
                <span v-if="row.pro === 'true'" class="text-mint-700">&#10003;</span>
                <span v-else-if="row.pro === 'false'" class="text-fg-subtle">&mdash;</span>
                <span v-else class="text-fg-muted text-xs">{{ row.pro }}</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span v-if="row.enterprise === 'true'" class="text-mint-700">&#10003;</span>
                <span v-else-if="row.enterprise === 'false'" class="text-fg-subtle">&mdash;</span>
                <span v-else class="text-fg-muted text-xs">{{ row.enterprise }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-6 text-sm font-semibold text-fg-subtle">{{ t.pricing.note }}</p>
    </section>

    <!-- Fallback to old compare if no compareTable -->
    <section v-else class="mt-10">
      <BaseCard padded>
        <template #header>
          <p class="font-display text-sm font-semibold text-fg">{{ t.pricing.compare.title }}</p>
        </template>
        <ul class="grid gap-2 text-sm text-fg-muted md:grid-cols-2">
          <li v-for="it in t.pricing.compare.items" :key="it" class="flex items-start gap-2">
            <span class="mt-1 inline-block h-2 w-2 rounded-full bg-sky-300" aria-hidden="true" />
            <span>{{ it }}</span>
          </li>
        </ul>
      </BaseCard>
      <p class="mt-6 text-sm font-semibold text-fg-subtle">{{ t.pricing.note }}</p>
    </section>

    <!-- FAQ accordion -->
    <section
      :ref="(el) => faqEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: faqVisible }"
    >
      <div class="mb-6">
        <BaseHeading level="2">{{ t.pricing.faq.title }}</BaseHeading>
      </div>
      <div class="bg-white border border-bone rounded-xl overflow-hidden divide-y divide-bone">
        <details
          v-for="(qa, idx) in t.pricing.faq.items"
          :key="qa.q"
          :open="idx === 0"
          class="group"
        >
          <summary class="flex items-center justify-between gap-4 px-5 py-4 font-semibold text-fg">
            {{ qa.q }}
            <svg
              class="accordion-chevron h-5 w-5 shrink-0 text-fg-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="mt-2 text-sm text-fg-muted pb-4 px-5">{{ qa.a }}</div>
        </details>
      </div>
    </section>

    <!-- Final CTA -->
    <section
      :ref="(el) => ctaEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: ctaVisible }"
    >
      <div class="rounded-2xl bg-navy-900 px-8 py-10 ring-1 ring-white/10">
        <div class="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div class="space-y-2">
            <h2 class="font-display text-2xl italic text-white">{{ t.pricing.cta.title }}</h2>
            <p class="text-pretty text-base text-white/65">{{ t.pricing.cta.subtitle }}</p>
          </div>
          <div class="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <a href="/signup">
              <BaseButton size="lg" class="bg-white! text-navy-900! hover:bg-white/90!">
                {{ t.pricing.cta.primary }}
              </BaseButton>
            </a>
            <Link :href="`/${locale}`">
              <BaseButton size="lg" variant="ghost" class="border! border-white/25! text-white/70! hover:bg-white/10! hover:text-white!">
                {{ t.pricing.cta.secondary }}
              </BaseButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
