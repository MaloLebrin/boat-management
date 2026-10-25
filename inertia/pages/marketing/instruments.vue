<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { jsonLd } from '~/utils/json_ld'
import FeatureHeroSection from '~/components/marketing/features/FeatureHeroSection.vue'
import FeatureStepsSection from '~/components/marketing/features/FeatureStepsSection.vue'
import FeatureCrossLinksSection from '~/components/marketing/features/FeatureCrossLinksSection.vue'
import FeatureFinalCtaSection from '~/components/marketing/features/FeatureFinalCtaSection.vue'
import GuideFaqSection from '~/components/marketing/guide/GuideFaqSection.vue'
import InstrumentsCardsSection from '~/components/marketing/instruments/InstrumentsCardsSection.vue'
import InstrumentsCompatibilitySection from '~/components/marketing/instruments/InstrumentsCompatibilitySection.vue'
import { marketingUrl, SITE_URL, type AppLocale } from '#shared/helpers/locale_path'
import type { InstrumentsMarketingContentProps } from '#shared/types/marketing_instruments'

const props = defineProps<{
  locale: AppLocale
  content: InstrumentsMarketingContentProps
}>()

const { t } = useT()

// URLs absolues (reco #7 de l'audit SEO) : canonical/hreflang pleinement
// qualifiés ; `x-default` pointe sur l'anglais comme le sitemap.
const canonicalHref = computed(() => marketingUrl('instruments', props.locale))
const instrumentsEn = marketingUrl('instruments', 'en')
const instrumentsFr = marketingUrl('instruments', 'fr')
const ogLocale = computed(() => (props.locale === 'fr' ? 'fr_FR' : 'en_US'))
const ogLocaleAlternate = computed(() => (props.locale === 'fr' ? 'en_US' : 'fr_FR'))
const inLanguage = computed(() => (props.locale === 'fr' ? 'fr-FR' : 'en-US'))

const faqSchema = computed(() =>
  jsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': props.content.faq.items.map((item) => ({
      '@type': 'Question',
      'name': item.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': item.a },
    })),
  })
)

const breadcrumbSchema = computed(() =>
  jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'FleetAi',
        'item': marketingUrl('home', props.locale),
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': t('public.nav.instruments'),
        'item': canonicalHref.value,
      },
    ],
  })
)

// Fonctionnalité d'un plan payant : pas d'offre à 0 € ici (contrairement aux
// outils gratuits), le `WebApplication` décrit le produit sans prix.
const webAppSchema = computed(() =>
  jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': props.content.meta.title,
    'description': props.content.meta.description,
    'url': canonicalHref.value,
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Web',
    'inLanguage': inLanguage.value,
    'provider': { '@type': 'Organization', 'name': 'FleetAi', 'url': SITE_URL },
  })
)
</script>

<template>
  <Head :title="content.meta.title">
    <meta head-key="description" name="description" :content="content.meta.description" />
    <meta head-key="og:title" property="og:title" :content="content.meta.title" />
    <meta head-key="og:description" property="og:description" :content="content.meta.description" />
    <meta head-key="og:url" property="og:url" :content="canonicalHref" />
    <meta head-key="og:locale" property="og:locale" :content="ogLocale" />
    <meta
      head-key="og:locale:alternate"
      property="og:locale:alternate"
      :content="ogLocaleAlternate"
    />
    <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
    <meta head-key="twitter:title" name="twitter:title" :content="content.meta.title" />
    <meta
      head-key="twitter:description"
      name="twitter:description"
      :content="content.meta.description"
    />
    <link head-key="canonical" rel="canonical" :href="canonicalHref" />
    <link head-key="alternate-en" rel="alternate" hreflang="en" :href="instrumentsEn" />
    <link head-key="alternate-fr" rel="alternate" hreflang="fr" :href="instrumentsFr" />
    <link
      head-key="alternate-x-default"
      rel="alternate"
      hreflang="x-default"
      :href="instrumentsEn"
    />
    <component :is="'script'" type="application/ld+json">{{ faqSchema }}</component>
    <component :is="'script'" type="application/ld+json">{{ breadcrumbSchema }}</component>
    <component :is="'script'" type="application/ld+json">{{ webAppSchema }}</component>
  </Head>

  <FeatureHeroSection
    :eyebrow="content.hero.eyebrow"
    :title="content.hero.title"
    :title-highlight="content.hero.titleHighlight"
    :subtitle="content.hero.subtitle"
    :primary-cta="content.hero.primaryCta"
    :secondary-cta="content.hero.secondaryCta"
    :reassurance="content.hero.reassurance"
    mock-type="instruments"
  />

  <FeatureStepsSection
    :eyebrow="content.steps.eyebrow"
    :title="content.steps.title"
    :subtitle="content.steps.subtitle"
    :items="content.steps.items"
  />

  <InstrumentsCardsSection v-bind="content.categories" test-id="instruments-categories" />

  <InstrumentsCardsSection
    v-bind="content.benefits"
    bg-class="bg-paper"
    test-id="instruments-benefits"
  />

  <InstrumentsCompatibilitySection :content="content.compatibility" />

  <InstrumentsCardsSection
    :eyebrow="content.install.eyebrow"
    :title="content.install.title"
    :title-highlight="content.install.titleHighlight"
    :subtitle="content.install.subtitle"
    :items="content.install.items"
    test-id="instruments-install"
  >
    <Link
      :href="content.install.helpCta.href"
      class="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-600 hover:text-coral-700"
    >
      {{ content.install.helpCta.label }}
      <span aria-hidden="true">→</span>
    </Link>
  </InstrumentsCardsSection>

  <InstrumentsCardsSection
    v-bind="content.security"
    bg-class="bg-paper"
    :columns="2"
    test-id="instruments-security"
  />

  <FeatureCrossLinksSection
    :eyebrow="content.crossLinks.eyebrow"
    :title="content.crossLinks.title"
    :link-label="content.crossLinks.linkLabel"
    :items="content.crossLinks.items"
  />

  <GuideFaqSection
    :eyebrow="content.faq.eyebrow"
    :title="content.faq.title"
    :title-highlight="content.faq.titleHighlight"
    :items="content.faq.items"
  />

  <FeatureFinalCtaSection
    :title="content.finalCta.title"
    :title-highlight="content.finalCta.titleHighlight"
    :subtitle="content.finalCta.subtitle"
    :primary-cta="content.finalCta.primaryCta"
    :secondary-cta="content.finalCta.secondaryCta"
  />
</template>
