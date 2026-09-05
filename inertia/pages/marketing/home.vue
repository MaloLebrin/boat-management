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
import HomeFeatureSection from '~/components/marketing/home/HomeFeatureSection.vue'
import HomeDiagnosisSection from '~/components/marketing/home/HomeDiagnosisSection.vue'
import HomeHowItWorksSection from '~/components/marketing/home/HomeHowItWorksSection.vue'
import HomeTestimonialsSection from '~/components/marketing/home/HomeTestimonialsSection.vue'
import HomeFaqSection from '~/components/marketing/home/HomeFaqSection.vue'
import HomeFinalCtaSection from '~/components/marketing/home/HomeFinalCtaSection.vue'
// --- Sections retirées de l'affichage (refonte marketing 2026-09, home resserrée
// --- à 10 sections orientées conversion). Composants conservés volontairement —
// --- voir le commentaire en tête de chacun. Réactivation : décommenter l'import
// --- et le bloc <template> correspondant, leurs props sont toujours servies par
// --- buildHomePageData (app/controllers/marketing_controller.ts).
// import HomePillarsSection from '~/components/marketing/home/HomePillarsSection.vue'
// import HomeModularOfferSection from '~/components/marketing/home/HomeModularOfferSection.vue'
// import HomeCaseStudySection from '~/components/marketing/home/HomeCaseStudySection.vue'
// import HomePersonasSection from '~/components/marketing/home/HomePersonasSection.vue'
// import HomeStatsBandSection from '~/components/marketing/home/HomeStatsBandSection.vue'
// import HomeComparisonSection from '~/components/marketing/home/HomeComparisonSection.vue'
// import HomeSecuritySection from '~/components/marketing/home/HomeSecuritySection.vue'
// import HomeDemoSection from '~/components/marketing/home/HomeDemoSection.vue'
import { useT } from '~/composables/use_t'
import { marketingPath } from '#shared/helpers/locale_path'

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
      diagnosis: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        items: string[]
        ctaLabel: string
        ctaHref: string
        note: string
        disclaimer: string
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
const { t: appT } = useT()

const activePersona = ref<Persona>('loueurs')

// Le commutateur de persona (HomePersonasSection, retirée de l'affichage avec la
// refonte 2026-09) pilotait le hero via @persona-change : le hero reste sur le
// persona par défaut. Réactivation : décommenter la section et ce handler.
// function handlePersonaChange(persona: Persona) {
//   activePersona.value = persona
// }

// CTA d'approfondissement des 3 blocs features vers leurs pages dédiées
// (maillage interne, refonte 2026-09). Libellé hors de buildHomePageData pour
// laisser le builder et PageProps inchangés (sections conservées réactivables).
const featureCtas = computed(() =>
  (['maintenance', 'fleet', 'aiAssistant'] as const).map((pageKey) => ({
    label: appT('public.actions.learnMore'),
    href: marketingPath(pageKey, locale.value),
  }))
)

// « Essayer la démo » : le CTA secondaire du hero et du CTA final lance la
// session de démo autonome (POST /demo) — on ne « réserve » pas de démo, on
// l'essaie soi-même ou on passe par le formulaire de contact.

const hreflangEn = marketingPath('home', 'en')
const hreflangFr = marketingPath('home', 'fr')
const canonicalHref = computed(() => marketingPath('home', locale.value))

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
    <link rel="canonical" :href="canonicalHref" />
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
    :demo-login-path="t.home.demo.demoLoginPath"
  />

  <!-- 2. Problem -->
  <HomeProblemSection
    :title="t.home.problem.title"
    :title-highlight="t.home.problem.titleHighlight"
    :items="t.home.problem.items"
  />

  <!-- Section retirée (refonte 2026-09) : 3. Pillars — paraphrase abstraite des
       3 features, redondante avec les deep-dives ci-dessous.
  <HomePillarsSection
    :title="t.home.pillars.title"
    :title-highlight="t.home.pillars.titleHighlight"
    :items="t.home.pillars.items"
  />
  -->

  <!-- Section retirée (refonte 2026-09) : 3bis. Offre modulaire — détail
       tarifaire prématuré à ce stade du parcours, la page /tarifs est au header.
  <HomeModularOfferSection v-bind="t.home.modularOffer" />
  -->

  <!-- 3-5. Feature deep-dives, chacun relié à sa page dédiée -->
  <HomeFeatureSection
    anchor-id="features"
    :eyebrow="t.home.features[0].eyebrow"
    :title="t.home.features[0].title"
    :title-highlight="t.home.features[0].titleHighlight"
    :body="t.home.features[0].body"
    :bullets="t.home.features[0].bullets"
    :cta="featureCtas[0]"
    mock-type="boatDetail"
    bg-class="bg-cream"
  />
  <HomeFeatureSection
    :eyebrow="t.home.features[1].eyebrow"
    :title="t.home.features[1].title"
    :title-highlight="t.home.features[1].titleHighlight"
    :body="t.home.features[1].body"
    :bullets="t.home.features[1].bullets"
    :cta="featureCtas[1]"
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
    :cta="featureCtas[2]"
    mock-type="fleetide"
    bg-class="bg-cream"
    is-ai
  />

  <!-- 6. Diagnostic de panne IA — essai gratuit sans compte (#609), lead magnet -->
  <HomeDiagnosisSection v-bind="t.home.diagnosis" />

  <!-- 7. How it works — lève l'objection migration / temps de mise en route -->
  <HomeHowItWorksSection
    :how-it-works="t.home.howItWorks"
    :preview="t.home.preview"
    :brand="t.brand"
    :locale="locale"
  />

  <!-- Section retirée (refonte 2026-09) : Case study — étude de cas fictive,
       preuve plus faible que les témoignages conservés ; son CTA simulateur vit
       désormais au header (menu Produit) et au footer.
  <HomeCaseStudySection :case-study="t.home.caseStudy" />
  -->

  <!-- Section retirée (refonte 2026-09) : Personas — long ; pilotait le hero via
       @persona-change (réactiver aussi handlePersonaChange dans le script).
  <HomePersonasSection
    :title="t.home.personas.title"
    :subtitle="t.home.personas.subtitle"
    :cta-label="t.home.personas.ctaLabel"
    :items="t.home.personas.items"
    @persona-change="handlePersonaChange"
  />
  -->

  <!-- Section retirée (refonte 2026-09) : Stats band — chiffres redondants avec
       le social proof du hero et les stats des pages fonctionnalité.
  <HomeStatsBandSection :stats="t.home.statsBand" />
  -->

  <!-- 8. Testimonials — preuve sociale -->
  <HomeTestimonialsSection :title="t.home.testimonials.title" :items="t.home.testimonials.items" />

  <!-- Section retirée (refonte 2026-09) : Comparison — tableau long, l'argument
       Excel/papier est déjà porté par la section Problem.
  <HomeComparisonSection
    :title="t.home.comparison.title"
    :subtitle="t.home.comparison.subtitle"
    :cols="t.home.comparison.cols"
    :rows="t.home.comparison.rows"
  />
  -->

  <!-- Section retirée (refonte 2026-09) : Security — rassurance de second
       niveau, reprise par la FAQ de la page /aide (groupe Données & sécurité).
  <HomeSecuritySection
    :title="t.home.security.title"
    :subtitle="t.home.security.subtitle"
    :items="t.home.security.items"
  />
  -->

  <!-- Section retirée (refonte 2026-09) : Demo — la démo autonome se lance
       depuis les CTA secondaires (hero, CTA final) et les pages /contact et /aide.
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
  -->

  <!-- 9. FAQ — objections restantes (props consommées par pricing_claims.spec.ts) -->
  <HomeFaqSection
    :title="t.home.faq.title"
    :subtitle="t.home.faq.subtitle"
    :cta="t.home.faq.cta"
    :items="t.home.faq.items"
  />

  <!-- 10. Final CTA -->
  <HomeFinalCtaSection
    :title="t.home.finalCta.title"
    :title-highlight="t.home.finalCta.titleHighlight"
    :subtitle="t.home.finalCta.subtitle"
    :primary-cta="t.home.finalCta.primaryCta"
    :secondary-cta="t.home.finalCta.secondaryCta"
    :demo-login-path="t.home.demo.demoLoginPath"
  />
</template>
