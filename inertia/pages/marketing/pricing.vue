<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
    layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { computed } from 'vue'

type PageProps = {
  t: {
    brand: { name: string }
    nav: { login: string; signup: string }
    meta: { title: string; description: string }

    pricing: {
      title: string
      subtitle: string
      note: string
      plans: {
        starter: { name: string; price: string; badge: string; features: string[] }
        pro: { name: string; price: string; badge: string; features: string[] }
        enterprise: { name: string; price: string; badge: string; features: string[] }
      }
      compare: { title: string; items: string[] }
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
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
    <link rel="canonical" :href="`/${locale}/tarifs`" />
    <link rel="alternate" hreflang="en" href="/en/tarifs" />
    <link rel="alternate" hreflang="fr" href="/fr/tarifs" />
  </Head>

    <section class="max-w-3xl space-y-4">
      <BaseBadge variant="info">{{ t.brand.name }}</BaseBadge>
      <BaseHeading level="display">{{ t.pricing.title }}</BaseHeading>
      <p class="text-pretty text-lg text-fg-muted">{{ t.pricing.subtitle }}</p>
    </section>

    <section class="mt-10 grid gap-6 lg:grid-cols-3">
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

      <div class="relative overflow-hidden rounded-xl bg-abyss-900 p-6 ring-2 ring-lagoon-500 shadow-xl shadow-lagoon-500/10">
        <div class="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-lagoon-500/10 blur-2xl" />
        <div class="relative">
          <!-- header -->
          <div class="mb-4 flex items-center justify-between gap-3">
            <p class="font-display text-sm font-semibold text-white">{{ t.pricing.plans.pro.name }}</p>
            <span class="inline-flex items-center rounded-full bg-lagoon-500 px-3 py-1 text-xs font-semibold text-white">{{ t.pricing.plans.pro.badge }}</span>
          </div>
          <p class="mb-4 text-3xl font-bold text-white">{{ t.pricing.plans.pro.price }}</p>
          <!-- features -->
          <ul class="mb-6 space-y-2 text-sm text-abyss-200">
            <li v-for="f in t.pricing.plans.pro.features" :key="f" class="flex items-start gap-2">
              <span class="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-lagoon-500" aria-hidden="true" />
              <span>{{ f }}</span>
            </li>
          </ul>
          <!-- footer -->
          <a href="/signup">
            <button class="w-full rounded-lg bg-lagoon-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lagoon-600 transition-colors">{{ t.nav.signup }}</button>
          </a>
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

    <section class="mt-10">
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

    <section class="mt-14">
      <BaseCard padded>
        <template #header>
          <p class="font-display text-sm font-semibold text-fg">{{ t.pricing.faq.title }}</p>
        </template>
        <div class="grid gap-3">
          <div
            v-for="qa in t.pricing.faq.items"
            :key="qa.q"
            class="rounded-(--radius-control) border border-border bg-surface-elevated px-5 py-4 shadow-(--shadow-xs)"
          >
            <p class="text-sm font-semibold text-fg">{{ qa.q }}</p>
            <p class="mt-1 text-sm text-fg-muted">{{ qa.a }}</p>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="mt-14">
      <div class="rounded-2xl bg-abyss-950 px-8 py-10 ring-1 ring-abyss-700">
        <div class="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div class="space-y-2">
            <h2 class="font-display text-2xl font-bold text-white">{{ t.pricing.cta.title }}</h2>
            <p class="text-pretty text-lg text-abyss-200">{{ t.pricing.cta.subtitle }}</p>
          </div>
          <div class="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <a href="/signup">
              <BaseButton size="lg">{{ t.pricing.cta.primary }}</BaseButton>
            </a>
            <Link :href="`/${locale}`">
              <BaseButton size="lg" variant="secondary">{{ t.pricing.cta.secondary }}</BaseButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
</template>

