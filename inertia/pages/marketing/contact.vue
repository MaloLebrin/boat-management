<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>
<script setup lang="ts">
import { computed } from 'vue'
import { Head, usePage } from '@inertiajs/vue3'
import ContactHeroSection from '~/components/marketing/contact/ContactHeroSection.vue'
import ContactChannelsSection from '~/components/marketing/contact/ContactChannelsSection.vue'
import ContactFormSection from '~/components/marketing/contact/ContactFormSection.vue'
import ContactOfficesSection from '~/components/marketing/contact/ContactOfficesSection.vue'
import ContactFaqSection from '~/components/marketing/contact/ContactFaqSection.vue'

interface Channel {
  icon: string
  title: string
  desc: string
  cta: string
  tone?: string
}
interface SidebarContact {
  icon: string
  label: string
  sub: string
}
interface OfficeItem {
  city: string
  role: string
  addr: string
  hours: string
  team: string
  hint: string
  gradient: string
}
interface FaqItem {
  q: string
  a: string
}

interface PageProps {
  t: {
    meta: { title: string; description: string }
    contact: {
      hero: { eyebrow: string; title: string; titleHighlight: string; subtitle: string }
      channels: Channel[]
      form: {
        eyebrow: string
        title: string
        subjectLabel: string
        subjects: string[]
        firstNameLabel: string
        lastNameLabel: string
        emailLabel: string
        orgLabel: string
        fleetSizeLabel: string
        messageLabel: string
        messagePlaceholder: string
        privacyText: string
        privacyLinkLabel: string
        submitLabel: string
        responseTime: string
        otherMeansTitle: string
        sidebarContacts: SidebarContact[]
        ctaTitle: string
        ctaSubtitle: string
        ctaButton: string
      }
      offices: {
        eyebrow: string
        title: string
        titleHighlight: string
        subtitle: string
        addrLabel: string
        hoursLabel: string
        teamLabel: string
        items: OfficeItem[]
      }
      faq: { eyebrow: string; title: string; titleHighlight: string; items: FaqItem[] }
    }
  }
}

const props = defineProps<PageProps>()
const t = props.t

const page = usePage<{ locale?: 'en' | 'fr' }>()
const locale = computed<'en' | 'fr'>(() => (page.props.locale ?? 'en') as 'en' | 'fr')
const contactEn = '/en/contact'
const contactFr = '/fr/contact'
const canonicalHref = computed(() => (locale.value === 'fr' ? contactFr : contactEn))
</script>

<template>
  <Head :title="t.meta.title">
    <meta name="description" :content="t.meta.description" />
    <meta property="og:title" :content="t.meta.title" />
    <meta property="og:description" :content="t.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" :href="contactEn" />
    <link rel="alternate" hreflang="fr" :href="contactFr" />
    <link rel="alternate" hreflang="x-default" :href="contactEn" />
  </Head>

  <ContactHeroSection v-bind="t.contact.hero" />
  <ContactChannelsSection :items="t.contact.channels" />
  <ContactFormSection v-bind="t.contact.form" />
  <ContactOfficesSection v-bind="t.contact.offices" />
  <ContactFaqSection v-bind="t.contact.faq" />
</template>
