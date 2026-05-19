<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>
<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AboutHeroSection from '~/components/marketing/about/AboutHeroSection.vue'
import AboutOriginSection from '~/components/marketing/about/AboutOriginSection.vue'
import AboutValuesSection from '~/components/marketing/about/AboutValuesSection.vue'
import AboutTeamSection from '~/components/marketing/about/AboutTeamSection.vue'
import AboutNumbersSection from '~/components/marketing/about/AboutNumbersSection.vue'
import AboutTimelineSection from '~/components/marketing/about/AboutTimelineSection.vue'
import AboutOfficeSection from '~/components/marketing/about/AboutOfficeSection.vue'
import HomeFinalCtaSection from '~/components/marketing/home/HomeFinalCtaSection.vue'

interface ValueItem { n: string; title: string; desc: string; extra: string }
interface Member { n: string; r: string; b: string; emoji: string; color: string }
interface StatItem { value: string; label: string }
interface TimelineItem { d: string; t: string; sub: string; tone?: string }
interface Location { city: string; addr: string; role: string }
interface OfficeCard { city: string; role: string; addr: string; hours: string; team: string; hint: string; gradient: string }

interface PageProps {
  t: {
    meta: { title: string; description: string }
    about: {
      hero: { line1: string; line1Highlight: string; line2: string; line2Highlight: string; subtitle: string }
      origin: { eyebrow: string; title: string; paragraphs: string[]; captionDate: string; captionSub: string }
      values: { eyebrow: string; title: string; titleHighlight: string; items: ValueItem[] }
      team: { eyebrow: string; title: string; titleHighlight: string; subtitle: string; members: Member[]; hiringTitle: string; hiringSubtitle: string; hiringCta: string }
      numbers: { eyebrow: string; title: string; titleHighlight: string; stats: StatItem[]; investorsLabel: string; investors: string[] }
      timeline: { eyebrow: string; title: string; titleHighlight: string; subtitle: string; items: TimelineItem[] }
      office: { eyebrow: string; title: string; titleHighlight: string; body: string; locationLabel: string; locations: Location[]; officeCards: OfficeCard[] }
      finalCta: { title: string; titleHighlight: string; subtitle: string; primaryCta: string; secondaryCta: string }
    }
  }
}

const props = defineProps<PageProps>()
const t = props.t
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
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
