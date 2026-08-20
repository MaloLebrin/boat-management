<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import type { LegalDocument } from '#shared/types/marketing'
import LegalDocumentSections from '~/components/marketing/legal/LegalDocumentSections.vue'
import { marketingPath } from '#shared/helpers/locale_path'

/**
 * CGV (#466) — les CGU encadrent l'usage du service, pas sa vente : un
 * abonnement payant a besoin de ses propres conditions (prix, paiement,
 * reconduction, rétractation, médiation).
 */
interface SalesTermsData {
  meta: { title: string; description: string }
  salesTerms: LegalDocument
}

type SharedProps = { locale?: 'en' | 'fr' }

const props = defineProps<SalesTermsData>()
const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

const canonicalHref = computed(() => marketingPath('salesTerms', locale.value))
const salesTermsEn = marketingPath('salesTerms', 'en')
const salesTermsFr = marketingPath('salesTerms', 'fr')
</script>

<template>
  <Head :title="props.meta.title">
    <meta name="description" :content="props.meta.description" />
    <meta property="og:title" :content="props.meta.title" />
    <meta property="og:description" :content="props.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" :href="salesTermsEn" />
    <link rel="alternate" hreflang="fr" :href="salesTermsFr" />
  </Head>

  <LegalDocumentSections :document="props.salesTerms" />
</template>
