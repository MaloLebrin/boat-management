<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed, onMounted, onUnmounted } from 'vue'
import HomeFaqCtaSection from '~/components/marketing/home/HomeFaqCtaSection.vue'
import HomeContentSections from '~/components/marketing/home/HomeContentSections.vue'
import HomeHeroSection from '~/components/marketing/home/HomeHeroSection.vue'
import HomeHowItWorksSection from '~/components/marketing/home/HomeHowItWorksSection.vue'
import HomeProofSections from '~/components/marketing/home/HomeProofSections.vue'
import HomeScreenshotsSection from '~/components/marketing/home/HomeScreenshotsSection.vue'
import HomeIndustriesSection from '~/components/marketing/home/HomeIndustriesSection.vue'
import HomeCaseStudySection from '~/components/marketing/home/HomeCaseStudySection.vue'

type ScreenshotsItem = { label: string; description: string; hint: string }
type IndustryItem = {
  icon: string
  title: string
  subtitle: string
  pains: string[]
  benefits: string[]
  quote: { text: string; author: string; role: string }
}
type TestimonialItem = { quote: string; author: string; role: string; fleet: string; since: string }
type HowItWorksItem = { step: string; title: string; description: string; detail: string }

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
      security: { title: string; items: Array<{ icon: string; title: string; description: string }> }
      faq: { title: string; items: Array<{ q: string; a: string }> }
      finalCta: { title: string; subtitle: string; primary: string; secondary: string }
      howItWorks: {
        title: string
        subtitle: string
        items: HowItWorksItem[]
        timeline: { title: string; items: Array<{ day: string; label: string }> }
      }
      testimonials: { title: string; items: TestimonialItem[] }
      threeThings: { title: string; items: Array<{ icon: string; title: string; description: string }> }
      bentoGrid: { title: string; items: Array<{ title: string; description: string }> }
      pullQuote: { quote: string; author: string; role: string }
      personas: { title: string; cta: string; items: Array<{ icon: string; title: string; description: string; example: string }> }
      comparisonTable: {
        title: string; subtitle: string
        cols: { feature: string; excel: string; paper: string; fleetai: string }
        rows: string[]
        vals: { no: string; partial: string; yes: string; manual: string; auto: string; eu: string }
      }
      blog: { title: string; subtitle: string; cta: string; articles: Array<{ cat: string; title: string; meta: string }> }
      screenshots: { title: string; subtitle: string; items: ScreenshotsItem[] }
      industries: {
        title: string
        subtitle: string
        painsLabel: string
        benefitsLabel: string
        items: IndustryItem[]
      }
      caseStudy: {
        title: string
        subtitle: string
        company: string
        challengeLabel: string
        challenge: string
        solutionLabel: string
        solution: string
        resultsLabel: string
        results: string[]
        metrics: Array<{ value: string; label: string }>
        cta: { text: string; href: string }
      }
    }
  }
}

type SharedProps = { locale?: 'en' | 'fr' }
const page = usePage<SharedProps>()

const props = defineProps<PageProps>()
const locale = computed<'en' | 'fr'>(() => (page.props.locale ?? 'en') as 'en' | 'fr')
const t = props.t

const hreflangEn = '/en'
const hreflangFr = '/fr'

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
    <HomeHeroSection
      :brand="t.brand"
      :hero="t.home.hero"
      :cta="t.home.cta"
      :stats="t.home.stats"
      :social-proof="t.home.socialProof"
      :locale="locale"
    />
    <HomeScreenshotsSection :screenshots="t.home.screenshots" />
    <HomeContentSections
      :three-things="t.home.threeThings"
      :problem="t.home.problem"
      :features="t.home.features"
      :bento-grid="t.home.bentoGrid"
      :pull-quote="t.home.pullQuote"
      :personas="t.home.personas"
    />
    <HomeHowItWorksSection
      :how-it-works="t.home.howItWorks"
      :preview="t.home.preview"
      :brand="t.brand"
      :locale="locale"
    />
    <HomeIndustriesSection :industries="t.home.industries" />
    <HomeProofSections
      :stats="t.home.stats"
      :use-cases="t.home.useCases"
      :testimonials="t.home.testimonials"
      :comparison-table="t.home.comparisonTable"
      :security="t.home.security"
      :blog="t.home.blog"
    />
    <HomeCaseStudySection :case-study="t.home.caseStudy" />
    <HomeFaqCtaSection
      :faq="t.home.faq"
      :final-cta="t.home.finalCta"
      :locale="locale"
    />
  </div>
</template>
