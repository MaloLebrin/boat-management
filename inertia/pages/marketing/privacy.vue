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

interface PrivacyData {
  meta: { title: string; description: string }
  privacy: LegalDocument
}

type SharedProps = { locale?: 'en' | 'fr' }

const props = defineProps<PrivacyData>()
const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

const canonicalHref = computed(() => marketingPath('privacy', locale.value))
const privacyEn = marketingPath('privacy', 'en')
const privacyFr = marketingPath('privacy', 'fr')
</script>

<template>
  <Head :title="props.meta.title">
    <meta name="description" :content="props.meta.description" />
    <meta property="og:title" :content="props.meta.title" />
    <meta property="og:description" :content="props.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" :href="privacyEn" />
    <link rel="alternate" hreflang="fr" :href="privacyFr" />
  </Head>

  <LegalDocumentSections :document="props.privacy" />
</template>
