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
 * Mentions légales (#466) — le footer n'exposait plus aucun lien légal, alors
 * que la LCEN impose ces informations à un SaaS payant opéré en France.
 */
interface LegalNoticeData {
  meta: { title: string; description: string }
  legalNotice: LegalDocument
}

type SharedProps = { locale?: 'en' | 'fr' }

const props = defineProps<LegalNoticeData>()
const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

const canonicalHref = computed(() => marketingPath('legalNotice', locale.value))
const legalNoticeEn = marketingPath('legalNotice', 'en')
const legalNoticeFr = marketingPath('legalNotice', 'fr')
</script>

<template>
  <Head :title="props.meta.title">
    <meta name="description" :content="props.meta.description" />
    <meta property="og:title" :content="props.meta.title" />
    <meta property="og:description" :content="props.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" :href="legalNoticeEn" />
    <link rel="alternate" hreflang="fr" :href="legalNoticeFr" />
  </Head>

  <LegalDocumentSections :document="props.legalNotice" />
</template>
