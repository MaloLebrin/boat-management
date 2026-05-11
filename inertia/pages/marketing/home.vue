<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3'
import { computed, onMounted, onUnmounted } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseStatCard from '~/components/base/BaseStatCard.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import { useScrollReveal } from '~/composables/useScrollReveal'

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
      howItWorks: { title: string; subtitle: string; items: Array<{ step: string; title: string; description: string }> }
      testimonials: { title: string; items: Array<{ quote: string; author: string; role: string }> }
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

// Scroll reveal instances
const { el: problemEl, isVisible: problemVisible } = useScrollReveal()
const { el: featuresEl, isVisible: featuresVisible } = useScrollReveal()
const { el: howItWorksEl, isVisible: howItWorksVisible } = useScrollReveal()
const { el: previewEl, isVisible: previewVisible } = useScrollReveal()
const { el: statsEl, isVisible: statsVisible } = useScrollReveal()
const { el: useCasesEl, isVisible: useCasesVisible } = useScrollReveal()
const { el: testimonialsEl, isVisible: testimonialsVisible } = useScrollReveal()
const { el: securityEl, isVisible: securityVisible } = useScrollReveal()
const { el: faqEl, isVisible: faqVisible } = useScrollReveal()

// Duplicated logos for marquee effect
const duplicatedLogos = computed(() => [...t.home.socialProof.logos, ...t.home.socialProof.logos])

// JSON-LD injection (Vue template compiler rejects <script> tags inside <Head>)
let jsonLdEl: HTMLScriptElement | null = null
onMounted(() => {
  jsonLdEl = document.createElement('script')
  jsonLdEl.type = 'application/ld+json'
  jsonLdEl.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FleetAi',
    url: 'https://fleetai.app',
    description: t.meta.description,
  })
  document.head.appendChild(jsonLdEl)
})
onUnmounted(() => {
  jsonLdEl?.remove()
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
    <link rel="canonical" :href="`/${locale}`" />
    <link rel="alternate" hreflang="en" :href="hreflangEn" />
    <link rel="alternate" hreflang="fr" :href="hreflangFr" />
  </Head>

  <div class="max-w-7xl mx-auto">
    <!-- Section 1: Hero -->
    <section class="relative overflow-hidden rounded-2xl bg-navy-900 px-8 py-16 lg:px-16 lg:py-20">
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="absolute -top-24 right-0 h-96 w-96 rounded-full bg-navy-500/10 blur-3xl" />
        <div class="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-coral-500/8 blur-2xl" />
      </div>

      <div class="relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <div class="max-w-xl space-y-6">
          <span
            class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/70"
            style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 0ms"
          >
            <svg width="16" height="16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="32" cy="32" r="28" stroke="#faf6ee" stroke-width="3.5" />
              <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#faf6ee" />
              <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
            </svg>
            {{ t.home.hero.eyebrow }}
          </span>
          <h1
            class="font-display text-4xl italic leading-tight tracking-tight text-white lg:text-5xl"
            style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 100ms"
          >
            {{ t.home.hero.title }}
          </h1>
          <p
            class="text-pretty text-lg text-white/65"
            style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 200ms"
          >
            {{ t.home.hero.subtitle }}
          </p>
          <div
            class="flex flex-wrap items-center gap-3"
            style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 320ms"
          >
            <a href="/signup">
              <BaseButton size="lg" class="bg-white! text-navy-900! shadow-lg hover:bg-white/90!">
                {{ t.home.cta.primary }}
              </BaseButton>
            </a>
            <Link :href="`/${locale}/tarifs`">
              <BaseButton size="lg" variant="ghost" class="border! border-white/25! text-white/80! hover:bg-white/10! hover:text-white!">
                {{ t.home.cta.secondary }}
              </BaseButton>
            </Link>
          </div>
        </div>

        <!-- Stats grid in hero -->
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="s in t.home.stats.items"
            :key="s.label"
            class="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
          >
            <p class="font-display text-2xl italic text-white">{{ s.value }}</p>
            <p class="mt-1 text-xs text-white/50">{{ s.label }}</p>
            <p class="mt-0.5 text-xs text-white/30">{{ s.hint }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Logos marquee -->
    <section class="mt-14 bg-cream rounded-xl py-10 px-6">
      <p class="text-center text-sm font-medium text-fg-muted mb-6">{{ t.home.socialProof.title }}</p>
      <div class="marquee-wrapper">
        <div class="marquee-track gap-4">
          <span
            v-for="(logo, idx) in duplicatedLogos"
            :key="`${logo}-${idx}`"
            class="bg-paper border border-bone px-5 py-2.5 text-sm font-medium text-fg-muted rounded-full whitespace-nowrap"
          >
            {{ logo }}
          </span>
        </div>
      </div>
    </section>

    <!-- Section 3: Problem -->
    <section
      :ref="(el) => problemEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: problemVisible }"
    >
      <BaseCard padded>
        <template #header>
          <p class="font-display text-sm font-semibold text-fg">{{ t.home.problem.title }}</p>
        </template>
        <div class="grid gap-4 lg:grid-cols-2">
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
    </section>

    <!-- Section 4: Features -->
    <section
      id="features"
      :ref="(el) => featuresEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: featuresVisible }"
    >
      <BaseCard padded>
        <template #header>
          <div class="space-y-2">
            <p class="font-display text-sm font-semibold text-fg">{{ t.home.features.title }}</p>
            <p class="text-sm text-fg-muted">{{ t.home.features.subtitle }}</p>
          </div>
        </template>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(f, idx) in t.home.features.items"
            :key="f.title"
            class="reveal rounded-(--radius-control) border border-border border-l-2 border-l-lagoon-500/40 bg-surface-elevated px-4 py-4 shadow-(--shadow-xs)"
            :class="[`reveal-delay-${idx % 4}`, { visible: featuresVisible }]"
          >
            <p class="text-sm font-semibold text-fg">{{ f.title }}</p>
            <p class="mt-1 text-sm text-fg-muted">{{ f.description }}</p>
          </div>
        </div>
      </BaseCard>
    </section>

    <!-- Section 5: How it works -->
    <section
      :ref="(el) => howItWorksEl = el as HTMLElement"
      class="mt-14 reveal bg-cream rounded-xl py-12 px-8"
      :class="{ visible: howItWorksVisible }"
    >
      <div class="text-center mb-10">
        <BaseHeading level="2">{{ t.home.howItWorks?.title }}</BaseHeading>
        <p class="mt-2 text-fg-muted">{{ t.home.howItWorks?.subtitle }}</p>
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        <div
          v-for="(step, idx) in t.home.howItWorks?.items"
          :key="step.step"
          class="reveal bg-paper border border-bone rounded-xl px-6 py-8"
          :class="[`reveal-delay-${idx + 1}`, { visible: howItWorksVisible }]"
        >
          <p class="font-display text-5xl italic text-coral-500/20">{{ step.step }}</p>
          <p class="mt-4 text-sm font-semibold text-fg">{{ step.title }}</p>
          <p class="mt-2 text-sm text-fg-muted">{{ step.description }}</p>
        </div>
      </div>
    </section>

    <!-- Section 6: Preview dashboard mockup -->
    <section
      :ref="(el) => previewEl = el as HTMLElement"
      class="mt-14 reveal grid gap-6 lg:grid-cols-2 lg:items-center"
      :class="{ visible: previewVisible }"
    >
      <div class="space-y-3">
        <BaseHeading level="2">{{ t.home.preview.title }}</BaseHeading>
        <p class="text-pretty text-lg text-fg-muted">{{ t.home.preview.subtitle }}</p>
      </div>

      <div class="rounded-xl border border-navy-800 bg-navy-900 p-5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-white">{{ t.brand.name }}</p>
          <BaseBadge variant="success">{{ locale === 'fr' ? 'Aperçu' : 'Preview' }}</BaseBadge>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-(--radius-control) border border-white/10 bg-white/5 px-4 py-4">
            <p class="text-xs font-semibold text-coral-400">{{ locale === 'fr' ? 'Urgent' : 'Urgent' }}</p>
            <p class="mt-1 text-2xl font-semibold text-white">3</p>
            <p class="mt-1 text-xs text-white/50">{{ locale === 'fr' ? 'tâches en retard' : 'overdue tasks' }}</p>
          </div>
          <div class="rounded-(--radius-control) border border-white/10 bg-white/5 px-4 py-4">
            <p class="text-xs font-semibold text-amber-600">{{ locale === 'fr' ? 'À venir' : 'Due soon' }}</p>
            <p class="mt-1 text-2xl font-semibold text-white">7</p>
            <p class="mt-1 text-xs text-white/50">{{ locale === 'fr' ? 'dans 14 jours' : 'within 14 days' }}</p>
          </div>
        </div>

        <div class="mt-3 rounded-(--radius-control) border border-white/10 bg-white/5 px-4 py-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-white">{{ locale === 'fr' ? 'Bateau' : 'Boat' }} · Aurore</p>
            <BaseBadge variant="info">{{ locale === 'fr' ? 'Moteur' : 'Engine' }} 1</BaseBadge>
          </div>
          <p class="mt-2 text-sm text-white/55">
            {{ locale === 'fr' ? 'Dernière vidange : il y a 3 mois. Prochaine : dans 42h.' : 'Last oil change: 3 months ago. Next: in 42h.' }}
          </p>
        </div>
      </div>
    </section>

    <!-- Section 7: Stats KPIs -->
    <section
      :ref="(el) => statsEl = el as HTMLElement"
      class="mt-14 reveal rounded-2xl bg-navy-900 px-8 py-12"
      :class="{ visible: statsVisible }"
    >
      <div class="grid gap-6 md:grid-cols-3">
        <BaseStatCard
          v-for="s in t.home.stats.items"
          :key="s.label"
          :label="s.label"
          :value="s.value"
          :delta="s.hint"
          tone="neutral"
        />
      </div>
    </section>

    <!-- Section 8: Use cases -->
    <section
      :ref="(el) => useCasesEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: useCasesVisible }"
    >
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

    <!-- Section 9: Testimonials -->
    <section
      :ref="(el) => testimonialsEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: testimonialsVisible }"
    >
      <div class="text-center mb-8">
        <BaseHeading level="2">{{ t.home.testimonials?.title }}</BaseHeading>
      </div>
      <div class="grid gap-6 lg:grid-cols-3">
        <div
          v-for="(item, idx) in t.home.testimonials?.items"
          :key="item.author"
          class="reveal bg-white border border-bone rounded-xl px-6 py-6 shadow-(--shadow-sm)"
          :class="[`reveal-delay-${idx + 1}`, { visible: testimonialsVisible }]"
        >
          <p class="text-sm italic text-fg-muted">
            <span class="text-lg text-coral-500/40">"</span>
            {{ item.quote }}
            <span class="text-lg text-coral-500/40">"</span>
          </p>
          <div class="mt-4">
            <p class="font-semibold text-fg">{{ item.author }}</p>
            <p class="text-xs text-fg-subtle">{{ item.role }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 10: Security -->
    <section
      :ref="(el) => securityEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: securityVisible }"
    >
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

    <!-- Section 11: FAQ accordion -->
    <section
      :ref="(el) => faqEl = el as HTMLElement"
      class="mt-14 reveal"
      :class="{ visible: faqVisible }"
    >
      <div class="mb-6">
        <BaseHeading level="2">{{ t.home.faq.title }}</BaseHeading>
      </div>
      <div class="bg-white border border-bone rounded-xl overflow-hidden divide-y divide-bone">
        <details
          v-for="(qa, idx) in t.home.faq.items"
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

    <!-- Section 12: Final CTA -->
    <section class="mt-14">
      <div class="rounded-2xl bg-navy-900 px-8 py-10 ring-1 ring-white/10">
        <div class="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div class="space-y-2">
            <h2 class="font-display text-2xl italic text-white">{{ t.home.finalCta.title }}</h2>
            <p class="text-pretty text-base text-white/65">{{ t.home.finalCta.subtitle }}</p>
          </div>
          <div class="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <a href="/signup">
              <BaseButton size="lg" class="bg-white! text-navy-900! hover:bg-white/90!">
                {{ t.home.finalCta.primary }}
              </BaseButton>
            </a>
            <Link :href="`/${locale}/tarifs`">
              <BaseButton size="lg" variant="ghost" class="border! border-white/25! text-white/70! hover:bg-white/10! hover:text-white!">
                {{ t.home.finalCta.secondary }}
              </BaseButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
