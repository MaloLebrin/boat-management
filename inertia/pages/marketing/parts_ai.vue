<script lang="ts">
import PublicLayout from '~/layouts/public.vue'
export default { layout: PublicLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import PartsAiChatPanel from '~/components/marketing/parts_ai/PartsAiChatPanel.vue'
import { marketingPath, type AppLocale } from '#shared/helpers/locale_path'
import type {
  PublicPartSearchConversationProps,
  PublicPartSearchQuotaProps,
} from '#shared/types/spare_part_chat'

const props = defineProps<{
  isAuthenticated: boolean
  locale: AppLocale
  quota: PublicPartSearchQuotaProps
  conversation: PublicPartSearchConversationProps | null
}>()

const { t } = useT()

const canonicalHref = computed(() => marketingPath('partsAi', props.locale))
const partsAiEn = marketingPath('partsAi', 'en')
const partsAiFr = marketingPath('partsAi', 'fr')
</script>

<template>
  <Head :title="t('publicPartSearch.meta_title')">
    <meta
      head-key="description"
      name="description"
      :content="t('publicPartSearch.meta_description')"
    />
    <meta head-key="og:title" property="og:title" :content="t('publicPartSearch.meta_title')" />
    <meta
      head-key="og:description"
      property="og:description"
      :content="t('publicPartSearch.meta_description')"
    />
    <link head-key="canonical" rel="canonical" :href="canonicalHref" />
    <link head-key="alternate-en" rel="alternate" hreflang="en" :href="partsAiEn" />
    <link head-key="alternate-fr" rel="alternate" hreflang="fr" :href="partsAiFr" />
  </Head>

  <!-- Hero dark — même registre que le diagnostic public -->
  <section class="bg-navy-900 px-6 py-12 lg:py-20">
    <div class="mx-auto max-w-3xl text-center">
      <span
        class="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/50"
      >
        {{ t('publicPartSearch.hero_eyebrow') }}
      </span>
      <h1
        class="mt-5 font-display text-4xl leading-tight tracking-tight text-white lg:text-5xl xl:text-6xl"
      >
        {{ t('publicPartSearch.hero_title') }}
        <em class="text-coral-400">{{ t('publicPartSearch.hero_title_highlight') }}</em>
      </h1>
      <p class="mt-4 text-base text-white/60 lg:text-lg">
        {{ t('publicPartSearch.hero_subtitle') }}
      </p>
    </div>
  </section>

  <!-- Chat -->
  <section class="bg-cream px-6 py-12 lg:py-16">
    <div class="mx-auto max-w-2xl">
      <div class="overflow-hidden rounded-2xl border border-bone bg-surface-elevated shadow-lg">
        <div class="h-1.5 bg-gradient-to-r from-coral-500 to-coral-400" />
        <div class="p-6 lg:p-8">
          <PartsAiChatPanel
            :conversation="conversation"
            :quota="quota"
            :is-authenticated="isAuthenticated"
          />
        </div>
      </div>
    </div>
  </section>
</template>
