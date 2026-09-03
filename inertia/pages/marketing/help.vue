<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import JsonLd from '~/components/json_ld'
import HelpChannelsSection from '~/components/marketing/help/HelpChannelsSection.vue'
import HelpFaqGroupsSection from '~/components/marketing/help/HelpFaqGroupsSection.vue'
import HelpResourcesSection from '~/components/marketing/help/HelpResourcesSection.vue'
import FeatureFinalCtaSection from '~/components/marketing/features/FeatureFinalCtaSection.vue'
import { marketingPath } from '#shared/helpers/locale_path'
import type { HelpPageProps } from '#shared/types/marketing'

type SharedProps = { locale?: 'en' | 'fr' }

const props = defineProps<HelpPageProps>()
const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

const t = props.t

const canonicalHref = computed(() => marketingPath('help', locale.value))
const hreflangEn = marketingPath('help', 'en')
const hreflangFr = marketingPath('help', 'fr')

const faqSchema = computed(() =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': t.faq.groups.flatMap((group) =>
      group.items.map((item) => ({
        '@type': 'Question',
        'name': item.q,
        'acceptedAnswer': { '@type': 'Answer', 'text': item.a },
      }))
    ),
  })
)
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" :href="hreflangEn" />
    <link rel="alternate" hreflang="fr" :href="hreflangFr" />
    <link rel="alternate" hreflang="x-default" :href="hreflangEn" />
    <JsonLd :schema="faqSchema" />
  </Head>

  <!-- Hero -->
  <section class="bg-cream px-6 pb-10 pt-16 lg:px-8 lg:pt-24">
    <div class="mx-auto max-w-3xl text-center">
      <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-600">
        {{ t.hero.eyebrow }}
      </p>
      <h1 class="mt-4 font-display text-4xl leading-tight tracking-tight text-fg lg:text-5xl">
        {{ t.hero.title }}
        <em class="text-coral-500">{{ t.hero.titleHighlight }}</em>
      </h1>
      <p class="mt-4 text-lg text-fg-muted">{{ t.hero.subtitle }}</p>
    </div>
  </section>

  <!-- Canaux de contact -->
  <HelpChannelsSection :items="t.channels" />

  <!-- FAQ agrégée par thèmes -->
  <HelpFaqGroupsSection
    :eyebrow="t.faq.eyebrow"
    :title="t.faq.title"
    :title-highlight="t.faq.titleHighlight"
    :groups="t.faq.groups"
  />

  <!-- Ressources self-service -->
  <HelpResourcesSection
    :eyebrow="t.resources.eyebrow"
    :title="t.resources.title"
    :subtitle="t.resources.subtitle"
    :link-label="t.resources.linkLabel"
    :items="t.resources.items"
  />

  <!-- CTA final -->
  <FeatureFinalCtaSection
    :title="t.finalCta.title"
    :title-highlight="t.finalCta.titleHighlight"
    :subtitle="t.finalCta.subtitle"
    :primary-cta="t.finalCta.primaryCta"
    :secondary-cta="t.finalCta.secondaryCta"
  />
</template>
