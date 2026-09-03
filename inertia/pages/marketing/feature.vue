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
import FeatureHeroSection from '~/components/marketing/features/FeatureHeroSection.vue'
import FeatureStepsSection from '~/components/marketing/features/FeatureStepsSection.vue'
import FeatureProofSection from '~/components/marketing/features/FeatureProofSection.vue'
import FeatureCrossLinksSection from '~/components/marketing/features/FeatureCrossLinksSection.vue'
import FeatureFinalCtaSection from '~/components/marketing/features/FeatureFinalCtaSection.vue'
import HomeFeatureSection from '~/components/marketing/home/HomeFeatureSection.vue'
import GuideFaqSection from '~/components/marketing/guide/GuideFaqSection.vue'
import { marketingPath } from '#shared/helpers/locale_path'
import type { FeaturePageProps } from '#shared/types/marketing'

type SharedProps = { locale?: 'en' | 'fr' }

const props = defineProps<FeaturePageProps>()
const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

const t = props.t
const isAi = props.featureKey === 'aiAssistant'

const canonicalHref = computed(() => marketingPath(props.featureKey, locale.value))
const hreflangEn = marketingPath(props.featureKey, 'en')
const hreflangFr = marketingPath(props.featureKey, 'fr')

const faqSchema = computed(() =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': t.faq.items.map((item) => ({
      '@type': 'Question',
      'name': item.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': item.a },
    })),
  })
)
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" :content="t.meta.title" />
    <meta name="twitter:description" :content="t.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" :href="hreflangEn" />
    <link rel="alternate" hreflang="fr" :href="hreflangFr" />
    <link rel="alternate" hreflang="x-default" :href="hreflangEn" />
    <JsonLd :schema="faqSchema" />
  </Head>

  <!-- Hero : promesse + mock produit -->
  <FeatureHeroSection
    :eyebrow="t.hero.eyebrow"
    :title="t.hero.title"
    :title-highlight="t.hero.titleHighlight"
    :subtitle="t.hero.subtitle"
    :primary-cta="t.hero.primaryCta"
    :secondary-cta="t.hero.secondaryCta"
    :reassurance="t.hero.reassurance"
    :mock-type="t.hero.mockType"
    :is-ai="isAi"
  />

  <!-- Blocs bénéfices : réutilisation directe des sections features de la home -->
  <HomeFeatureSection
    v-for="(block, index) in t.blocks"
    :key="index"
    :eyebrow="block.eyebrow"
    :title="block.title"
    :title-highlight="block.titleHighlight"
    :body="block.body"
    :bullets="block.bullets"
    :mock-type="block.mockType"
    :bg-class="index % 2 === 0 ? 'bg-paper' : 'bg-cream'"
    :reversed="index % 2 === 1"
    :is-ai="isAi"
  />

  <!-- Comment ça marche -->
  <FeatureStepsSection
    :eyebrow="t.steps.eyebrow"
    :title="t.steps.title"
    :subtitle="t.steps.subtitle"
    :items="t.steps.items"
  />

  <!-- Preuve : stats + témoignage -->
  <FeatureProofSection :stats="t.proof.stats" :quote="t.proof.quote" />

  <!-- Maillage interne vers les autres pages fonctionnalité / outils -->
  <FeatureCrossLinksSection
    :eyebrow="t.crossLinks.eyebrow"
    :title="t.crossLinks.title"
    :link-label="t.crossLinks.linkLabel"
    :items="t.crossLinks.items"
  />

  <!-- FAQ (accordéon du guide réutilisé) + JSON-LD FAQPage dans <Head> -->
  <GuideFaqSection
    :eyebrow="t.faq.eyebrow"
    :title="t.faq.title"
    :title-highlight="t.faq.titleHighlight"
    :items="t.faq.items"
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
