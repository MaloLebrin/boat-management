<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>
<script setup lang="ts">
import { computed } from 'vue'
import { Head, usePage } from '@inertiajs/vue3'
import AboutHeroSection from '~/components/marketing/about/AboutHeroSection.vue'
import AboutOriginSection from '~/components/marketing/about/AboutOriginSection.vue'
import AboutValuesSection from '~/components/marketing/about/AboutValuesSection.vue'
import AboutTeamSection from '~/components/marketing/about/AboutTeamSection.vue'
import AboutNumbersSection from '~/components/marketing/about/AboutNumbersSection.vue'
import AboutTimelineSection from '~/components/marketing/about/AboutTimelineSection.vue'
import AboutOfficeSection from '~/components/marketing/about/AboutOfficeSection.vue'
import HomeFinalCtaSection from '~/components/marketing/home/HomeFinalCtaSection.vue'
import type { AboutPageProps } from '../../../shared/types/marketing'

const props = defineProps<AboutPageProps>()
const t = props.t

const page = usePage<{ locale?: 'en' | 'fr' }>()
const locale = computed<'en' | 'fr'>(() => (page.props.locale ?? 'en') as 'en' | 'fr')
const aboutEn = '/en/about'
const aboutFr = '/fr/a-propos'
const canonicalHref = computed(() => (locale.value === 'fr' ? aboutFr : aboutEn))
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" :href="aboutEn" />
    <link rel="alternate" hreflang="fr" :href="aboutFr" />
    <link rel="alternate" hreflang="x-default" :href="aboutEn" />
  </Head>

  <AboutHeroSection v-bind="t.about.hero" />
  <AboutOriginSection v-bind="t.about.origin" />
  <AboutValuesSection v-bind="t.about.values" />
  <AboutTeamSection v-bind="t.about.team" />
  <AboutNumbersSection v-bind="t.about.numbers" />
  <AboutTimelineSection v-bind="t.about.timeline" />
  <AboutOfficeSection v-bind="t.about.office" />
  <HomeFinalCtaSection v-bind="t.about.finalCta" />
</template>
