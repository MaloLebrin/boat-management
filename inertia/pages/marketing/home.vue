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
      howItWorks: { title: string; subtitle: string; items: Array<{ step: string; title: string; description: string }> }
      testimonials: { title: string; items: Array<{ quote: string; author: string; role: string }> }
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
    <HomeHeroSection
      :brand="t.brand"
      :hero="t.home.hero"
      :cta="t.home.cta"
      :stats="t.home.stats"
      :social-proof="t.home.socialProof"
      :locale="locale"
    />
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
    <HomeProofSections
      :stats="t.home.stats"
      :use-cases="t.home.useCases"
      :testimonials="t.home.testimonials"
      :comparison-table="t.home.comparisonTable"
      :security="t.home.security"
      :blog="t.home.blog"
    />
    <HomeFaqCtaSection
      :faq="t.home.faq"
      :final-cta="t.home.finalCta"
      :locale="locale"
    />
  </div>
</template>
