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
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import { computed } from 'vue'

type PageProps = {
  t: {
    brand: { name: string; tagline: string }
    nav: { pricing: string; login: string; signup: string }
    meta: { title: string; description: string }

    home: {
      hero: { eyebrow: string; title: string; subtitle: string }
      cta: { primary: string; secondary: string }

      socialProof: { title: string; logos: string[] }
      stats: { title: string; items: Array<{ label: string; value: string; hint: string }> }

      problem: { title: string; items: Array<{ title: string; description: string }> }

      features: { title: string; subtitle: string; items: Array<{ title: string; description: string }> }
      useCases: { title: string; items: Array<{ title: string; description: string }> }

      preview: { title: string; subtitle: string }
      security: { title: string; items: Array<{ title: string; description: string }> }
      faq: { title: string; items: Array<{ q: string; a: string }> }

      finalCta: { title: string; subtitle: string; primary: string; secondary: string }
    }
  }
}

type SharedProps = { locale?: 'en' | 'fr' }
const page = usePage<SharedProps>()

const props = defineProps<PageProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')
const t = props.t

const hreflangEn = '/en'
const hreflangFr = '/fr'
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
    <link rel="canonical" :href="`/${locale}`" />
    <link rel="alternate" hreflang="en" :href="hreflangEn" />
    <link rel="alternate" hreflang="fr" :href="hreflangFr" />
  </Head>

    <section class="relative overflow-hidden rounded-2xl bg-abyss-950 px-8 py-16 lg:px-16 lg:py-20">
      <!-- Subtle gradient blob in the background -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="absolute -top-24 right-0 h-96 w-96 rounded-full bg-lagoon-500/10 blur-3xl" />
        <div class="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-coral-400/10 blur-2xl" />
      </div>

      <div class="relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <div class="max-w-xl space-y-6">
          <span class="inline-flex items-center gap-2 rounded-full bg-lagoon-500/15 px-3 py-1 text-sm font-semibold text-lagoon-400">
            &#10022; {{ t.home.hero.eyebrow }}
          </span>
          <h1 class="font-display text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
            {{ t.home.hero.title }}
          </h1>
          <p class="text-pretty text-lg text-abyss-200">{{ t.home.hero.subtitle }}</p>
          <div class="flex flex-wrap items-center gap-3">
            <a href="/signup">
              <BaseButton size="lg" class="bg-lagoon-500 hover:bg-lagoon-600 text-white shadow-lg">{{ t.home.cta.primary }}</BaseButton>
            </a>
            <Link :href="`/${locale}/tarifs`">
              <BaseButton size="lg" variant="ghost" class="border border-abyss-600 text-abyss-200 hover:bg-abyss-800 hover:text-white">{{ t.home.cta.secondary }}</BaseButton>
            </Link>
          </div>
        </div>

        <!-- App preview mockup -->
        <div class="space-y-3">
          <div class="rounded-xl border border-abyss-700 bg-abyss-900 p-4">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-semibold text-white">{{ t.home.socialProof.title }}</p>
              <span class="inline-flex items-center rounded-full bg-mint-600/20 px-2 py-0.5 text-xs font-medium text-mint-400">Live</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="logo in t.home.socialProof.logos"
                :key="logo"
                class="flex h-10 items-center justify-center rounded-lg border border-abyss-700 bg-abyss-800 text-xs font-semibold text-abyss-300"
              >
                {{ logo }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div v-for="s in t.home.stats.items" :key="s.label" class="rounded-xl border border-abyss-700 bg-abyss-900 p-3 text-center">
              <p class="font-display text-xl font-bold text-white">{{ s.value }}</p>
              <p class="mt-0.5 text-xs text-abyss-400">{{ s.label }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-14 grid gap-6 lg:grid-cols-2">
      <BaseCard padded>
        <template #header>
          <p class="font-display text-sm font-semibold text-fg">{{ t.home.problem.title }}</p>
        </template>
        <div class="grid gap-3">
          <div
            v-for="it in t.home.problem.items"
            :key="it.title"
            class="rounded-(--radius-control) border border-border border-l-4 border-l-coral-400/60 bg-surface-muted px-4 py-3"
          >
            <p class="text-sm font-semibold text-fg">{{ it.title }}</p>
            <p class="mt-1 text-sm text-fg-muted">{{ it.description }}</p>
          </div>
        </div>
      </BaseCard>

      <BaseCard id="features" padded>
        <template #header>
          <div class="space-y-2">
            <p class="font-display text-sm font-semibold text-fg">{{ t.home.features.title }}</p>
            <p class="text-sm text-fg-muted">{{ t.home.features.subtitle }}</p>
          </div>
        </template>
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="f in t.home.features.items"
            :key="f.title"
            class="rounded-(--radius-control) border border-border border-l-2 border-l-lagoon-500/40 bg-surface-elevated px-4 py-4 shadow-(--shadow-xs)"
          >
            <p class="text-sm font-semibold text-fg">{{ f.title }}</p>
            <p class="mt-1 text-sm text-fg-muted">{{ f.description }}</p>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="mt-14">
      <BaseCard padded>
        <template #header>
          <p class="font-display text-sm font-semibold text-fg">{{ t.home.useCases.title }}</p>
        </template>
        <div class="grid gap-4 md:grid-cols-3">
          <div
            v-for="uc in t.home.useCases.items"
            :key="uc.title"
            class="rounded-(--radius-control) border border-border bg-surface-muted px-5 py-5"
          >
            <p class="text-sm font-semibold text-fg">{{ uc.title }}</p>
            <p class="mt-1 text-sm text-fg-muted">{{ uc.description }}</p>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="mt-14 grid gap-6 lg:grid-cols-2 lg:items-center">
      <div class="space-y-3">
        <BaseHeading level="2">{{ t.home.preview.title }}</BaseHeading>
        <p class="text-pretty text-lg text-fg-muted">{{ t.home.preview.subtitle }}</p>
      </div>

      <div class="rounded-xl border border-abyss-700 bg-abyss-900 p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-white">{{ t.brand.name }}</p>
          <BaseBadge variant="success">{{ locale === 'fr' ? 'Aperçu' : 'Preview' }}</BaseBadge>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-(--radius-control) border border-abyss-700 bg-abyss-800 px-4 py-4">
            <p class="text-xs font-semibold text-abyss-400">{{ locale === 'fr' ? 'Urgent' : 'Urgent' }}</p>
            <p class="mt-1 text-2xl font-semibold text-white">3</p>
            <p class="mt-1 text-xs font-semibold text-abyss-300">
              {{ locale === 'fr' ? 'tâches en retard' : 'overdue tasks' }}
            </p>
          </div>
          <div class="rounded-(--radius-control) border border-abyss-700 bg-abyss-800 px-4 py-4">
            <p class="text-xs font-semibold text-abyss-400">{{ locale === 'fr' ? 'À venir' : 'Due soon' }}</p>
            <p class="mt-1 text-2xl font-semibold text-white">7</p>
            <p class="mt-1 text-xs font-semibold text-abyss-300">
              {{ locale === 'fr' ? 'dans 14 jours' : 'within 14 days' }}
            </p>
          </div>
        </div>

        <div class="mt-3 rounded-(--radius-control) border border-abyss-700 bg-abyss-800 px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-white">{{ locale === 'fr' ? 'Bateau' : 'Boat' }} · Aurore</p>
            <BaseBadge variant="info">{{ locale === 'fr' ? 'Moteur' : 'Engine' }} 1</BaseBadge>
          </div>
          <p class="mt-2 text-sm text-abyss-300">
            {{
              locale === 'fr'
                ? 'Dernière vidange: il y a 3 mois. Prochaine: dans 42h.'
                : 'Last oil change: 3 months ago. Next: in 42h.'
            }}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-14">
      <BaseCard padded>
        <template #header>
          <p class="font-display text-sm font-semibold text-fg">{{ t.home.security.title }}</p>
        </template>
        <div class="grid gap-4 md:grid-cols-2">
          <div
            v-for="s in t.home.security.items"
            :key="s.title"
            class="rounded-(--radius-control) border border-border bg-surface-muted px-5 py-5"
          >
            <p class="text-sm font-semibold text-fg">{{ s.title }}</p>
            <p class="mt-1 text-sm text-fg-muted">{{ s.description }}</p>
          </div>
        </div>
      </BaseCard>
    </section>

    <section class="mt-14">
      <BaseCard padded>
        <template #header>
          <p class="font-display text-sm font-semibold text-fg">{{ t.home.faq.title }}</p>
        </template>
        <div class="grid gap-3">
          <div
            v-for="qa in t.home.faq.items"
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
            <h2 class="font-display text-2xl font-bold text-white">{{ t.home.finalCta.title }}</h2>
            <p class="text-pretty text-lg text-abyss-200">{{ t.home.finalCta.subtitle }}</p>
          </div>
          <div class="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <a href="/signup">
              <BaseButton size="lg">{{ t.home.finalCta.primary }}</BaseButton>
            </a>
            <Link :href="`/${locale}/tarifs`">
              <BaseButton size="lg" variant="secondary">{{ t.home.finalCta.secondary }}</BaseButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
</template>

