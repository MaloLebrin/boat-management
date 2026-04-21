<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
    layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'

type PageProps = {
  locale: 'en' | 'fr'
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

const props = defineProps<PageProps>()
const locale = props.locale
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

    <section class="grid gap-10 lg:grid-cols-2 lg:items-center">
      <div class="max-w-xl space-y-6">
        <BaseBadge variant="info">{{ t.home.hero.eyebrow }}</BaseBadge>
        <BaseHeading level="display">{{ t.home.hero.title }}</BaseHeading>
        <p class="text-pretty text-lg text-fg-muted">{{ t.home.hero.subtitle }}</p>
        <div class="flex flex-wrap items-center gap-3">
          <a href="/signup">
            <BaseButton size="lg">{{ t.home.cta.primary }}</BaseButton>
          </a>
          <Link :href="`/${locale}/tarifs`">
            <BaseButton size="lg" variant="secondary">{{ t.home.cta.secondary }}</BaseButton>
          </Link>
        </div>
      </div>

      <div class="grid gap-4">
        <BaseCard padded>
          <template #header>
            <p class="font-display text-sm font-semibold text-fg">{{ t.home.socialProof.title }}</p>
          </template>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div
              v-for="logo in t.home.socialProof.logos"
              :key="logo"
              class="flex h-11 items-center justify-center rounded-(--radius-control) border border-border bg-surface-muted text-xs font-semibold text-fg-subtle shadow-(--shadow-xs)"
            >
              {{ logo }}
            </div>
          </div>
        </BaseCard>

        <BaseCard padded>
          <template #header>
            <p class="font-display text-sm font-semibold text-fg">{{ t.home.stats.title }}</p>
          </template>
          <div class="grid gap-3 sm:grid-cols-3">
            <BaseStatCard
              v-for="s in t.home.stats.items"
              :key="s.label"
              :label="s.label"
              :value="s.value"
              :hint="s.hint"
            />
          </div>
        </BaseCard>
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
            class="rounded-(--radius-control) border border-border bg-surface-muted px-4 py-3"
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
            class="rounded-(--radius-control) border border-border bg-surface-elevated px-4 py-4 shadow-(--shadow-xs)"
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

      <BaseCard padded>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-fg">{{ t.brand.name }}</p>
            <BaseBadge variant="success">{{ locale === 'fr' ? 'Aperçu' : 'Preview' }}</BaseBadge>
          </div>
        </template>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-(--radius-control) border border-border bg-surface-muted px-4 py-4">
            <p class="text-xs font-semibold text-fg-subtle">{{ locale === 'fr' ? 'Urgent' : 'Urgent' }}</p>
            <p class="mt-1 text-2xl font-semibold text-fg">3</p>
            <p class="mt-1 text-xs font-semibold text-fg-muted">
              {{ locale === 'fr' ? 'tâches en retard' : 'overdue tasks' }}
            </p>
          </div>
          <div class="rounded-(--radius-control) border border-border bg-surface-muted px-4 py-4">
            <p class="text-xs font-semibold text-fg-subtle">{{ locale === 'fr' ? 'À venir' : 'Due soon' }}</p>
            <p class="mt-1 text-2xl font-semibold text-fg">7</p>
            <p class="mt-1 text-xs font-semibold text-fg-muted">
              {{ locale === 'fr' ? 'dans 14 jours' : 'within 14 days' }}
            </p>
          </div>
        </div>

        <div class="mt-3 rounded-(--radius-control) border border-border bg-surface-elevated px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-fg">{{ locale === 'fr' ? 'Bateau' : 'Boat' }} · Aurore</p>
            <BaseBadge variant="info">{{ locale === 'fr' ? 'Moteur' : 'Engine' }} 1</BaseBadge>
          </div>
          <p class="mt-2 text-sm text-fg-muted">
            {{
              locale === 'fr'
                ? 'Dernière vidange: il y a 3 mois. Prochaine: dans 42h.'
                : 'Last oil change: 3 months ago. Next: in 42h.'
            }}
          </p>
        </div>
      </BaseCard>
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
      <BaseCard padded>
        <div class="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div class="space-y-2">
            <BaseHeading level="2">{{ t.home.finalCta.title }}</BaseHeading>
            <p class="text-pretty text-lg text-fg-muted">{{ t.home.finalCta.subtitle }}</p>
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
      </BaseCard>
    </section>
</template>

