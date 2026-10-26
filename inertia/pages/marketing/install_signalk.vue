<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { jsonLd } from '~/utils/json_ld'
import FeatureHeroSection from '~/components/marketing/features/FeatureHeroSection.vue'
import InstrumentsHeroBackdrop from '~/components/marketing/instruments/InstrumentsHeroBackdrop.vue'
import InstrumentsCardsSection from '~/components/marketing/instruments/InstrumentsCardsSection.vue'
import FeatureCrossLinksSection from '~/components/marketing/features/FeatureCrossLinksSection.vue'
import FeatureFinalCtaSection from '~/components/marketing/features/FeatureFinalCtaSection.vue'
import GuideFaqSection from '~/components/marketing/guide/GuideFaqSection.vue'
import InstallDurationsStrip from '~/components/marketing/install_signalk/InstallDurationsStrip.vue'
import InstallKitsSection from '~/components/marketing/install_signalk/InstallKitsSection.vue'
import InstallPathsSection from '~/components/marketing/install_signalk/InstallPathsSection.vue'
import InstallHowToSection from '~/components/marketing/install_signalk/InstallHowToSection.vue'
import InstallHttpsSection from '~/components/marketing/install_signalk/InstallHttpsSection.vue'
import InstallTroubleshootingSection from '~/components/marketing/install_signalk/InstallTroubleshootingSection.vue'
import { installSignalKHowToSchema } from '~/utils/install_signalk_schema'
import { marketingUrl, type AppLocale } from '#shared/helpers/locale_path'
import type { InstallSignalKMarketingContentProps } from '#shared/types/marketing_install_signalk'

const props = defineProps<{
  locale: AppLocale
  content: InstallSignalKMarketingContentProps
}>()

const { t } = useT()

// URLs absolues (reco #7 de l'audit SEO) : canonical/hreflang pleinement
// qualifiés ; `x-default` pointe sur l'anglais comme le sitemap.
const canonicalHref = computed(() => marketingUrl('installSignalK', props.locale))
const pageEn = marketingUrl('installSignalK', 'en')
const pageFr = marketingUrl('installSignalK', 'fr')
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
        'item': marketingUrl('instruments', props.locale),
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': t('public.nav.installSignalK'),
        'item': canonicalHref.value,
      },
    ],
  })
)

// Guide pas à pas : un `HowTo` à deux `HowToSection` (plugin, appli), chaque
// étape ancrée sur son chemin — le balisage que Google documente pour les tutoriels.
const howToSchema = computed(() =>
  jsonLd(installSignalKHowToSchema(props.content, canonicalHref.value, inLanguage.value))
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
    <link head-key="alternate-en" rel="alternate" hreflang="en" :href="pageEn" />
    <link head-key="alternate-fr" rel="alternate" hreflang="fr" :href="pageFr" />
    <link head-key="alternate-x-default" rel="alternate" hreflang="x-default" :href="pageEn" />
    <component :is="'script'" type="application/ld+json">{{ howToSchema }}</component>
    <component :is="'script'" type="application/ld+json">{{ faqSchema }}</component>
    <component :is="'script'" type="application/ld+json">{{ breadcrumbSchema }}</component>
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
  >
    <template #backdrop>
      <InstrumentsHeroBackdrop />
    </template>
  </FeatureHeroSection>

  <InstallDurationsStrip :items="content.hero.durations" />

  <InstallKitsSection :content="content.kits" />

  <InstallPathsSection :content="content.paths" />

  <InstallHowToSection
    id="plugin"
    :content="content.pluginHowTo"
    bg-class="bg-paper"
    test-id="install-plugin"
  />

  <InstallHowToSection
    id="app"
    :content="content.appHowTo"
    bg-class="bg-cream"
    test-id="install-app"
  />

  <InstallHttpsSection :content="content.https" />

  <InstrumentsCardsSection v-bind="content.engines" bg-class="bg-paper" test-id="install-engines" />

  <InstallTroubleshootingSection :content="content.troubleshooting" />

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
