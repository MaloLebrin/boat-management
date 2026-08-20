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
 * CGU / Terms of service (#455) — la case « J'accepte les CGU » du signup
 * pointait sur `href="#"` faute de page.
 */
interface TermsData {
  meta: { title: string; description: string }
  terms: LegalDocument
}

type SharedProps = { locale?: 'en' | 'fr' }

const props = defineProps<TermsData>()
const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

const canonicalHref = computed(() => marketingPath('terms', locale.value))
const termsEn = marketingPath('terms', 'en')
const termsFr = marketingPath('terms', 'fr')
</script>

<template>
  <Head :title="props.meta.title">
    <meta name="description" :content="props.meta.description" />
    <meta property="og:title" :content="props.meta.title" />
    <meta property="og:description" :content="props.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" :href="termsEn" />
    <link rel="alternate" hreflang="fr" :href="termsFr" />
  </Head>

  <LegalDocumentSections :document="props.terms" />
</template>
