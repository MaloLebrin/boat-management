<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import GuideCostTable from '~/components/marketing/guide/GuideCostTable.vue'
import GuideFaqSection from '~/components/marketing/guide/GuideFaqSection.vue'
import JsonLd from '~/components/json_ld'

interface FaqItem {
  q: string
  a: string
}
interface CostRow {
  type: string
  length: string
  budget: string
  note: string
}
interface CostItem {
  title: string
  desc: string
}
interface Stat {
  value: string
  label: string
}

interface GuideData {
  meta: { title: string; description: string }
  guide: {
    hero: {
      eyebrow: string
      title: string
      titleHighlight: string
      subtitle: string
      ctaLabel: string
    }
    stats: Stat[]
    costs: { eyebrow: string; title: string; titleHighlight: string; items: CostItem[] }
    table: {
      eyebrow: string
      title: string
      colType: string
      colLength: string
      colBudget: string
      colNote: string
      rows: CostRow[]
      ctaLabel: string
    }
    cta: { eyebrow: string; title: string; subtitle: string; button: string }
    regulation: { eyebrow: string; title: string; body: string }
    faq: { eyebrow: string; title: string; titleHighlight: string; items: FaqItem[] }
    finalCta: {
      title: string
      titleHighlight: string
      subtitle: string
      primaryCta: string
      secondaryCta: string
    }
  }
}

type SharedProps = { locale?: 'en' | 'fr' }

const props = defineProps<GuideData>()
const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

const simulatorUrl = computed(() =>
  locale.value === 'fr' ? '/fr/simulateur-cout-entretien' : '/en/maintenance-cost-simulator'
)

const faqSchema = computed(() =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': props.guide.faq.items.map((item) => ({
      '@type': 'Question',
      'name': item.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': item.a },
    })),
  })
)
</script>

<template>
  <Head :title="meta.title">
    <meta name="description" :content="meta.description" />
    <meta property="og:title" :content="meta.title" />
    <meta property="og:description" :content="meta.description" />
    <link rel="canonical" :href="`/${locale}/cout-entretien-bateau`" />
    <link rel="alternate" hreflang="fr" href="/fr/cout-entretien-bateau" />
    <link rel="alternate" hreflang="en" href="/en/boat-maintenance-cost" />
    <JsonLd :schema="faqSchema" />
  </Head>

  <!-- Hero -->
  <section class="bg-cream px-6 py-16 lg:px-8 lg:py-24">
    <div class="mx-auto max-w-3xl text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ guide.hero.eyebrow }}
      </p>
      <h1 class="mt-4 font-display text-4xl leading-tight tracking-tight text-fg lg:text-5xl">
        {{ guide.hero.title }}
        <em class="text-coral-500 not-italic">{{ guide.hero.titleHighlight }}</em>
      </h1>
      <p class="mt-4 text-lg text-fg-muted">{{ guide.hero.subtitle }}</p>
      <Link
        :href="simulatorUrl"
        class="mt-8 inline-block rounded-xl bg-coral-500 px-8 py-3 text-sm font-semibold text-white hover:bg-coral-600"
        >{{ guide.hero.ctaLabel }}</Link
      >
    </div>
  </section>

  <!-- Stats -->
  <section class="bg-bone px-6 py-8 lg:px-8">
    <div class="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
      <div v-for="(stat, i) in guide.stats" :key="i" class="text-center">
        <p class="font-display text-3xl font-bold text-coral-500">{{ stat.value }}</p>
        <p class="mt-1 text-sm text-fg-muted">{{ stat.label }}</p>
      </div>
    </div>
  </section>

  <!-- Cost categories -->
  <section class="bg-paper px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-4xl">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ guide.costs.eyebrow }}
      </p>
      <h2 class="mt-2 font-display text-2xl text-fg lg:text-3xl">
        {{ guide.costs.title }}
        <em class="text-coral-500 not-italic">{{ guide.costs.titleHighlight }}</em>
      </h2>
      <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="(item, i) in guide.costs.items"
          :key="i"
          class="rounded-xl border border-bone bg-cream p-5"
        >
          <p class="font-semibold text-fg">{{ item.title }}</p>
          <p class="mt-2 text-sm text-fg-muted">{{ item.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Cost table -->
  <GuideCostTable
    :eyebrow="guide.table.eyebrow"
    :title="guide.table.title"
    :col-type="guide.table.colType"
    :col-length="guide.table.colLength"
    :col-budget="guide.table.colBudget"
    :col-note="guide.table.colNote"
    :rows="guide.table.rows"
    :simulator-url="simulatorUrl"
    :cta-label="guide.table.ctaLabel"
  />

  <!-- CTA banner -->
  <section class="bg-coral-50 px-6 py-12 lg:px-8">
    <div class="mx-auto max-w-2xl text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-coral-600">
        {{ guide.cta.eyebrow }}
      </p>
      <h2 class="mt-2 font-display text-2xl text-fg lg:text-3xl">{{ guide.cta.title }}</h2>
      <p class="mt-3 text-sm text-fg-muted">{{ guide.cta.subtitle }}</p>
      <Link
        :href="simulatorUrl"
        class="mt-6 inline-block rounded-xl bg-coral-500 px-8 py-3 text-sm font-semibold text-white hover:bg-coral-600"
        >{{ guide.cta.button }}</Link
      >
    </div>
  </section>

  <!-- Regulation -->
  <section class="bg-cream px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-3xl">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ guide.regulation.eyebrow }}
      </p>
      <h2 class="mt-2 font-display text-2xl text-fg lg:text-3xl">{{ guide.regulation.title }}</h2>
      <p class="mt-4 text-sm leading-relaxed text-fg-muted">{{ guide.regulation.body }}</p>
    </div>
  </section>

  <!-- FAQ -->
  <GuideFaqSection
    :eyebrow="guide.faq.eyebrow"
    :title="guide.faq.title"
    :title-highlight="guide.faq.titleHighlight"
    :items="guide.faq.items"
  />

  <!-- Final CTA -->
  <section class="bg-navy-900 px-6 py-16 lg:px-8 lg:py-24">
    <div class="mx-auto max-w-2xl text-center">
      <h2 class="font-display text-3xl text-white lg:text-4xl">
        {{ guide.finalCta.title }}
        <em class="text-coral-400 not-italic">{{ guide.finalCta.titleHighlight }}</em>
      </h2>
      <p class="mt-4 text-navy-200">{{ guide.finalCta.subtitle }}</p>
      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/signup"
          class="rounded-xl bg-coral-500 px-8 py-3 text-sm font-semibold text-white hover:bg-coral-600"
        >
          {{ guide.finalCta.primaryCta }}
        </Link>
        <Link
          :href="simulatorUrl"
          class="rounded-xl bg-navy-700 px-8 py-3 text-sm font-semibold text-navy-100 hover:bg-navy-600"
        >
          {{ guide.finalCta.secondaryCta }}
        </Link>
      </div>
    </div>
  </section>
</template>
