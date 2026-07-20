<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>
<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import PricingHeroSection from '~/components/marketing/pricing/PricingHeroSection.vue'
import PricingTiersSection from '~/components/marketing/pricing/PricingTiersSection.vue'
import PricingROISection from '~/components/marketing/pricing/PricingROISection.vue'
import PricingTestimonialsSection from '~/components/marketing/pricing/PricingTestimonialsSection.vue'
import PricingDetailedTableSection from '~/components/marketing/pricing/PricingDetailedTableSection.vue'
import PricingConfigurator from '~/components/marketing/pricing/PricingConfigurator.vue'
import PricingExtrasSection from '~/components/marketing/pricing/PricingExtrasSection.vue'
import PricingFaqSection from '~/components/marketing/pricing/PricingFaqSection.vue'
import HomeFinalCtaSection from '~/components/marketing/home/HomeFinalCtaSection.vue'

type SharedProps = { locale?: 'en' | 'fr' }
const page = usePage<SharedProps>()

interface ReassuranceItem {
  icon: string
  label: string
}
interface Tier {
  name: string
  tag: string
  price: string | number
  pricePer?: string
  priceAnnual?: string | number
  priceAnnualPer?: string
  sub: string
  featured?: boolean
  feats: Array<[string, string?]>
  cta: string
  ctaVariant: string
}
interface GroupRow {
  0: string
  1: boolean | string
  2: boolean | string
  3: boolean | string
}
interface Group {
  title: string
  rows: GroupRow[]
}
interface ConfiguratorModule {
  key: string
  icon: string
  name: string
  desc: string
  priceMonthly: number
  priceAnnual: number
  features: string[]
}
interface Configurator {
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  baseName: string
  baseDesc: string
  basePriceMonthly: number
  basePriceAnnual: number
  modulesLabel: string
  perMonth: string
  perYear: string
  totalLabel: string
  annualSaveLabel: string
  billedAnnuallyNote: string
  ctaLabel: string
  ctaHref: string
  modules: ConfiguratorModule[]
  enterprise: {
    name: string
    priceMonthly: number
    priceAnnual: number
    note: string
    ctaLabel: string
  }
  extraBoats: {
    name: string
    desc: string
    priceMonthly: number
    priceAnnual: number
    perBoatLabel: string
  }
}
interface PlanHeader {
  name: string
  price: string
  cta: string
}
interface TestimonialItem {
  stat: string
  statLabel: string
  quote: string
  name: string
  org: string
  role: string
  plan: string
}
interface ExtraItem {
  icon: string
  title: string
  sub: string
  price: string
  priceSub: string
  tone: string
}
interface FaqItem {
  q: string
  a: string
}
type ProfileKey = 'loueurs' | 'ecoles' | 'marinas' | 'armateurs'

interface PageProps {
  t: {
    meta: { title: string; description: string }
    pricing: {
      hero: {
        eyebrowLabel: string
        title: string
        titleHighlight: string
        subtitle: string
        monthlyLabel: string
        annualLabel: string
        annualBadge: string
      }
      tierFeaturedBadge: string
      tiers: Tier[]
      reassurance: ReassuranceItem[]
      roi: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        profileLabel: string
        boatsLabel: string
        hourlyLabel: string
        studyNote: string
        savingsLabel: string
        perMonthLabel: string
        timeLabel: string
        maintLabel: string
        fleetideLabel: string
        fleetCostLabel: string
        roiLabel: string
        ctaLabel: string
        profiles: Record<ProfileKey, { label: string; emoji: string }>
      }
      testimonials: {
        eyebrow: string
        title: string
        titleHighlight: string
        items: TestimonialItem[]
      }
      configurator: Configurator
      detailedTable: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        expandAll: string
        collapseAll: string
        addonLabel: string
        groups: Group[]
        planHeaders: PlanHeader[]
      }
      extras: { eyebrow: string; title: string; subtitle: string; items: ExtraItem[] }
      modules: {
        eyebrow: string
        title: string
        subtitle: string
        note: string
        pricePer: string
        includedLabel: string
        items: Array<{ icon: string; name: string; desc: string; price: number }>
      }
      faq: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        ctaLabel: string
        items: FaqItem[]
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

const props = defineProps<PageProps>()
const t = props.t
const locale = computed<'en' | 'fr'>(() => (page.props.locale ?? 'fr') as 'en' | 'fr')
const billing = ref<'monthly' | 'annual'>('annual')
const hreflangEn = '/en/tarifs'
const hreflangFr = '/fr/tarifs'
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
    <link rel="canonical" :href="`/${locale}/tarifs`" />
    <link rel="alternate" hreflang="en" :href="hreflangEn" />
    <link rel="alternate" hreflang="fr" :href="hreflangFr" />
  </Head>

  <PricingHeroSection
    v-bind="t.pricing.hero"
    :billing="billing"
    @update:billing="billing = $event"
  />
  <PricingTiersSection
    :tiers="t.pricing.tiers"
    :billing="billing"
    :reassurance="t.pricing.reassurance"
    :featured-badge-label="t.pricing.tierFeaturedBadge"
  />
  <PricingConfigurator v-bind="t.pricing.configurator" :billing="billing" />
  <PricingROISection v-bind="t.pricing.roi" />
  <PricingTestimonialsSection v-bind="t.pricing.testimonials" />
  <PricingDetailedTableSection v-bind="t.pricing.detailedTable" />
  <PricingExtrasSection v-bind="t.pricing.extras" />
  <PricingFaqSection v-bind="t.pricing.faq" />
  <HomeFinalCtaSection v-bind="t.pricing.finalCta" />
</template>
