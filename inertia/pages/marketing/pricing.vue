<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import PricingPlansGrid from '~/components/marketing/pricing/PricingPlansGrid.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

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
      trust: { noCard: string; cancel: string; euData: string; trial: string; joinedBy: string }
      plans: {
        starter: Plan
        pro: Plan
        enterprise: Plan
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

const billing = ref<'monthly' | 'annual'>('monthly')

const { el: plansEl, isVisible: plansVisible } = useScrollReveal()
const { el: compareEl, isVisible: compareVisible } = useScrollReveal()
const { el: faqEl, isVisible: faqVisible } = useScrollReveal()
const { el: ctaEl, isVisible: ctaVisible } = useScrollReveal()
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
    <!-- Header -->
    <section class="max-w-3xl space-y-4">
      <BaseBadge variant="info">{{ t.brand.name }}</BaseBadge>
      <BaseHeading level="display">{{ t.pricing.title }}</BaseHeading>
      <p class="text-pretty text-lg text-fg-muted">{{ t.pricing.subtitle }}</p>
      <p v-if="t.pricing.trust?.joinedBy" class="text-sm font-semibold text-mint-700">
        {{ t.pricing.trust.joinedBy }}
      </p>
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
      class="mt-8 reveal"
      :class="{ visible: plansVisible }"
    >
      <PricingPlansGrid
        :plans="t.pricing.plans"
        :billing="billing"
        :trust="t.pricing.trust"
        :signup-label="t.nav.signup"
        :locale="locale"
      />
    </section>

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

    <!-- FAQ -->
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
          <summary class="flex items-center justify-between gap-4 px-5 py-4 font-semibold text-fg cursor-pointer">
            {{ qa.q }}
            <ChevronDownIcon class="h-5 w-5 shrink-0 text-fg-muted transition-transform duration-300 group-open:rotate-180" />
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
              <BaseButton size="lg" class="relative overflow-hidden bg-white! text-navy-900! hover:bg-white/90! before:absolute before:inset-0 before:bg-linear-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700">
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
