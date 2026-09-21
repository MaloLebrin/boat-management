<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { jsonLd } from '~/utils/json_ld'
import BaseButton from '~/components/base/BaseButton.vue'
import DiagnosisChatPanel from '~/components/marketing/diagnosis/DiagnosisChatPanel.vue'
import DiagnosisSymptomsSection from '~/components/marketing/diagnosis/DiagnosisSymptomsSection.vue'
import FeatureStepsSection from '~/components/marketing/features/FeatureStepsSection.vue'
import FeatureCrossLinksSection from '~/components/marketing/features/FeatureCrossLinksSection.vue'
import FeatureFinalCtaSection from '~/components/marketing/features/FeatureFinalCtaSection.vue'
import GuideFaqSection from '~/components/marketing/guide/GuideFaqSection.vue'
import { marketingUrl, SITE_URL, type AppLocale } from '#shared/helpers/locale_path'
import type {
  PublicDiagnosisContentProps,
  PublicDiagnosisConversationProps,
  PublicDiagnosisQuotaProps,
} from '#shared/types/public_diagnosis'

const props = defineProps<{
  isAuthenticated: boolean
  locale: AppLocale
  quota: PublicDiagnosisQuotaProps
  conversation: PublicDiagnosisConversationProps | null
  content: PublicDiagnosisContentProps
}>()

const { t } = useT()

/**
 * Ancre du chat, cible du CTA hero et des cartes de `DiagnosisSymptomsSection`
 * (qui l'écrit en dur : une ancre statique, hors règle `<Link>`).
 */
const CHAT_ANCHOR = 'diagnosis-chat'

// URLs absolues (reco #7 de l'audit SEO) : Google veut des canonical/hreflang
// pleinement qualifiés ; `x-default` pointe sur l'anglais comme le sitemap.
const canonicalHref = computed(() => marketingUrl('diagnosisAi', props.locale))
const diagnosisEn = marketingUrl('diagnosisAi', 'en')
const diagnosisFr = marketingUrl('diagnosisAi', 'fr')
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
        'name': t('public.nav.diagnosisAi'),
        'item': canonicalHref.value,
      },
    ],
  })
)

// Outil gratuit : `WebApplication` + offre à 0 € (pas de `HowTo`, rich result
// retiré par Google en 2023).
const webAppSchema = computed(() =>
  jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': props.content.meta.title,
    'description': props.content.meta.description,
    'url': canonicalHref.value,
    'applicationCategory': 'UtilitiesApplication',
    'operatingSystem': 'Web',
    'inLanguage': inLanguage.value,
    'isAccessibleForFree': true,
    'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR' },
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
    <link head-key="alternate-en" rel="alternate" hreflang="en" :href="diagnosisEn" />
    <link head-key="alternate-fr" rel="alternate" hreflang="fr" :href="diagnosisFr" />
    <link head-key="alternate-x-default" rel="alternate" hreflang="x-default" :href="diagnosisEn" />
    <component :is="'script'" type="application/ld+json">{{ faqSchema }}</component>
    <component :is="'script'" type="application/ld+json">{{ breadcrumbSchema }}</component>
    <component :is="'script'" type="application/ld+json">{{ webAppSchema }}</component>
  </Head>

  <!-- Hero dark — même registre que le simulateur -->
  <section class="bg-navy-900 px-6 py-12 lg:py-20">
    <div class="mx-auto max-w-3xl text-center">
      <span
        class="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/50"
      >
        {{ t('publicDiagnosis.hero_eyebrow') }}
      </span>
      <h1
        class="mt-5 font-display text-4xl leading-tight tracking-tight text-white lg:text-5xl xl:text-6xl"
      >
        {{ t('publicDiagnosis.hero_title') }}
        <em class="text-coral-400">{{ t('publicDiagnosis.hero_title_highlight') }}</em>
      </h1>
      <p class="mt-4 text-base text-white/60 lg:text-lg">
        {{ t('publicDiagnosis.hero_subtitle') }}
      </p>
      <div class="mt-8 flex justify-center">
        <BaseButton :href="`#${CHAT_ANCHOR}`" size="lg" class="shadow-lg">
          {{ t('publicDiagnosis.cta_scroll') }}
        </BaseButton>
      </div>
    </div>
  </section>

  <!-- Chat -->
  <section class="bg-cream px-6 py-12 lg:py-16">
    <div class="mx-auto max-w-2xl">
      <div
        :id="CHAT_ANCHOR"
        class="scroll-mt-24 overflow-hidden rounded-2xl border border-bone bg-surface-elevated shadow-lg"
      >
        <div class="h-1.5 bg-gradient-to-r from-coral-500 to-coral-400" />
        <div class="p-6 lg:p-8">
          <DiagnosisChatPanel
            :conversation="conversation"
            :quota="quota"
            :is-authenticated="isAuthenticated"
          />
        </div>
      </div>
    </div>
  </section>

  <!-- Sections indexables : le chat seul n'offre rien aux moteurs de recherche -->
  <FeatureStepsSection
    :eyebrow="content.steps.eyebrow"
    :title="content.steps.title"
    :subtitle="content.steps.subtitle"
    :items="content.steps.items"
  />

  <DiagnosisSymptomsSection
    :eyebrow="content.symptoms.eyebrow"
    :title="content.symptoms.title"
    :title-highlight="content.symptoms.titleHighlight"
    :subtitle="content.symptoms.subtitle"
    :items="content.symptoms.items"
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
