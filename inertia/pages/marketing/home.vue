<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import JsonLd from '~/components/json_ld'
import HomeHeroSection from '~/components/marketing/home/HomeHeroSection.vue'
import HomeProblemSection from '~/components/marketing/home/HomeProblemSection.vue'
import HomePillarsSection from '~/components/marketing/home/HomePillarsSection.vue'
import HomeModularOfferSection from '~/components/marketing/home/HomeModularOfferSection.vue'
import HomeFeatureSection from '~/components/marketing/home/HomeFeatureSection.vue'
import HomeCaseStudySection from '~/components/marketing/home/HomeCaseStudySection.vue'
import HomeHowItWorksSection from '~/components/marketing/home/HomeHowItWorksSection.vue'
import HomePersonasSection from '~/components/marketing/home/HomePersonasSection.vue'
import HomeStatsBandSection from '~/components/marketing/home/HomeStatsBandSection.vue'
import HomeComparisonSection from '~/components/marketing/home/HomeComparisonSection.vue'
import HomeTestimonialsSection from '~/components/marketing/home/HomeTestimonialsSection.vue'
import HomeSecuritySection from '~/components/marketing/home/HomeSecuritySection.vue'
import HomeFaqSection from '~/components/marketing/home/HomeFaqSection.vue'
import HomeDemoSection from '~/components/marketing/home/HomeDemoSection.vue'
import HomeFinalCtaSection from '~/components/marketing/home/HomeFinalCtaSection.vue'

type Persona = 'loueurs' | 'ecoles' | 'marinas' | 'armateurs'

interface HeroContent {
  title: string
  titleHighlight: string
  subtitle: string
}

interface ProblemItem {
  number: string
  label: string
  title: string
  stat: string
  statSub: string
  body: string
}

interface PillarItem {
  number: string
  title: string
  description: string
  isAi?: boolean
}

interface OfferModule {
  icon: string
  name: string
  desc: string
  price: number
}

interface ModularOffer {
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  baseName: string
  baseDesc: string
  basePrice: number
  pricePer: string
  modulesLabel: string
  note: string
  ctaLabel: string
  ctaHref: string
  modules: OfferModule[]
}

interface FeatureData {
  eyebrow: string
  title: string
  titleHighlight: string
  body: string
  bullets: string[]
}

interface PersonaItem {
  key: Persona
  icon: string
  tabLabel: string
  title: string
  subtitle: string
  bullets: string[]
  quote: { text: string; author: string; role: string }
  stat: { value: string; label: string }
}

interface ComparisonRow {
  feature: string
  excel: string
  paper: string
  fleetai: string
}

interface TestimonialItem {
  quote: string
  author: string
  role: string
  featured?: boolean
}

interface SecurityItem {
  icon: string
  title: string
  description: string
}

interface FaqItem {
  q: string
  a: string
}

interface CaseStudyData {
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

interface HowItWorksData {
  title: string
  subtitle: string
  items: Array<{ step: string; title: string; description: string; detail: string }>
  timeline: { title: string; items: Array<{ day: string; label: string }> }
}

interface PageProps {
  t: {
    brand: { name: string; tagline: string }
    meta: { title: string; description: string }
    home: {
      hero: {
        cta: { primary: string; secondary: string }
        caption: string
        content: Record<Persona, HeroContent>
      }
      socialProof: { eyebrow: string; logos: string[] }
      problem: { title: string; titleHighlight: string; items: ProblemItem[] }
      pillars: { title: string; titleHighlight: string; items: PillarItem[] }
      modularOffer: ModularOffer
      features: FeatureData[]
      caseStudy: CaseStudyData
      howItWorks: HowItWorksData
      preview: { title: string; subtitle: string }
      personas: { title: string; subtitle: string; ctaLabel: string; items: PersonaItem[] }
      statsBand: Array<{ value: string; label: string }>
      comparison: {
        title: string
        subtitle: string
        cols: { feature: string; excel: string; paper: string; fleetai: string }
        rows: ComparisonRow[]
      }
      testimonials: { title: string; items: TestimonialItem[] }
      security: { title: string; subtitle: string; items: SecurityItem[] }
      faq: {
        title: string
        subtitle: string
        cta: { label: string; href: string }
        items: FaqItem[]
      }
      demo: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        items: string[]
        ctaLabel: string
        ctaHref: string
        secondaryLabel: string
        noCommitment: string
        tryDemoLabel: string
        tryDemoSubtitle: string
        demoLoginPath: string
      }
      finalCta: {
        title: string
        titleHighlight: string
        subtitle: string
        primaryCta: string
        secondaryCta: string
      }
    }
  }
}

type SharedProps = { locale?: 'en' | 'fr' }
const page = usePage<SharedProps>()

const props = defineProps<PageProps>()
const locale = computed<'en' | 'fr'>(() => (page.props.locale ?? 'en') as 'en' | 'fr')
const t = props.t

const activePersona = ref<Persona>('loueurs')

function handlePersonaChange(persona: Persona) {
  activePersona.value = persona
}

const hreflangEn = '/en'
const hreflangFr = '/fr'

// Schéma JSON-LD WebSite rendu dans <Head> (donc présent dans le HTML SSR lu
// par les crawlers), au lieu d'une injection client-side via onMounted.
const websiteSchema = computed(() =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'FleetAi',
    'url': 'https://fleetai.app',
    'description': t.meta.description,
  })
)
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
    <link rel="alternate" hreflang="x-default" :href="hreflangEn" />
    <JsonLd :schema="websiteSchema" />
  </Head>

  <!-- 1. Hero -->
  <HomeHeroSection
    :active-persona="activePersona"
    :hero-content="t.home.hero.content"
    :cta="t.home.hero.cta"
    :caption="t.home.hero.caption"
    :social-proof="t.home.socialProof"
    :locale="locale"
  />

  <!-- 2. Problem -->
  <HomeProblemSection
    :title="t.home.problem.title"
    :title-highlight="t.home.problem.titleHighlight"
    :items="t.home.problem.items"
  />

  <!-- 3. Pillars -->
  <HomePillarsSection
    :title="t.home.pillars.title"
    :title-highlight="t.home.pillars.titleHighlight"
    :items="t.home.pillars.items"
  />

  <!-- 3bis. Offre modulaire (socle + modules add-ons) -->
  <HomeModularOfferSection v-bind="t.home.modularOffer" />

  <!-- 4. Feature deep-dives -->
  <HomeFeatureSection
    :eyebrow="t.home.features[0].eyebrow"
    :title="t.home.features[0].title"
    :title-highlight="t.home.features[0].titleHighlight"
    :body="t.home.features[0].body"
    :bullets="t.home.features[0].bullets"
    mock-type="boatDetail"
    bg-class="bg-cream"
  />
  <HomeFeatureSection
    :eyebrow="t.home.features[1].eyebrow"
    :title="t.home.features[1].title"
    :title-highlight="t.home.features[1].titleHighlight"
    :body="t.home.features[1].body"
    :bullets="t.home.features[1].bullets"
    mock-type="planning"
    bg-class="bg-paper"
    reversed
  />
  <HomeFeatureSection
    :eyebrow="t.home.features[2].eyebrow"
    :title="t.home.features[2].title"
    :title-highlight="t.home.features[2].titleHighlight"
    :body="t.home.features[2].body"
    :bullets="t.home.features[2].bullets"
    mock-type="fleetide"
    bg-class="bg-cream"
    is-ai
  />

  <!-- 5. How it works -->
  <HomeHowItWorksSection
    :how-it-works="t.home.howItWorks"
    :preview="t.home.preview"
    :brand="t.brand"
    :locale="locale"
  />

  <!-- 6. Case study -->
  <HomeCaseStudySection :case-study="t.home.caseStudy" />

  <!-- 7. Personas -->
  <HomePersonasSection
    :title="t.home.personas.title"
    :subtitle="t.home.personas.subtitle"
    :cta-label="t.home.personas.ctaLabel"
    :items="t.home.personas.items"
    @persona-change="handlePersonaChange"
  />

  <!-- 8. Stats band -->
  <HomeStatsBandSection :stats="t.home.statsBand" />

  <!-- 9. Testimonials -->
  <HomeTestimonialsSection :title="t.home.testimonials.title" :items="t.home.testimonials.items" />

  <!-- 10. Comparison table -->
  <HomeComparisonSection
    :title="t.home.comparison.title"
    :subtitle="t.home.comparison.subtitle"
    :cols="t.home.comparison.cols"
    :rows="t.home.comparison.rows"
  />

  <!-- 11. Security -->
  <HomeSecuritySection
    :title="t.home.security.title"
    :subtitle="t.home.security.subtitle"
    :items="t.home.security.items"
  />

  <!-- 12. Demo -->
  <HomeDemoSection
    :eyebrow="t.home.demo.eyebrow"
    :title="t.home.demo.title"
    :title-highlight="t.home.demo.titleHighlight"
    :subtitle="t.home.demo.subtitle"
    :items="t.home.demo.items"
    :cta-label="t.home.demo.ctaLabel"
    :cta-href="t.home.demo.ctaHref"
    :secondary-label="t.home.demo.secondaryLabel"
    :no-commitment="t.home.demo.noCommitment"
    :try-demo-label="t.home.demo.tryDemoLabel"
    :try-demo-subtitle="t.home.demo.tryDemoSubtitle"
    :demo-login-path="t.home.demo.demoLoginPath"
    :locale="locale"
  />

  <!-- 13. FAQ -->
  <HomeFaqSection
    :title="t.home.faq.title"
    :subtitle="t.home.faq.subtitle"
    :cta="t.home.faq.cta"
    :items="t.home.faq.items"
  />

  <!-- 14. Final CTA -->
  <HomeFinalCtaSection
    :title="t.home.finalCta.title"
    :title-highlight="t.home.finalCta.titleHighlight"
    :subtitle="t.home.finalCta.subtitle"
    :primary-cta="t.home.finalCta.primaryCta"
    :secondary-cta="t.home.finalCta.secondaryCta"
  />
</template>
