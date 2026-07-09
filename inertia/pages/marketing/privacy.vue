<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>
<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

interface PrivacySection {
  title: string
  body: string
  bullets?: string[]
}

interface PrivacyData {
  meta: { title: string; description: string }
  privacy: {
    hero: {
      eyebrow: string
      title: string
      titleHighlight: string
      subtitle: string
      updatedLabel: string
      updatedDate: string
    }
    sections: PrivacySection[]
    contact: { title: string; body: string; email: string }
  }
}

type SharedProps = { locale?: 'en' | 'fr' }

const props = defineProps<PrivacyData>()
const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

const canonicalHref = computed(() =>
  locale.value === 'fr' ? '/fr/confidentialite' : '/en/privacy'
)
</script>

<template>
  <Head :title="props.meta.title">
    <meta name="description" :content="props.meta.description" />
    <meta property="og:title" :content="props.meta.title" />
    <meta property="og:description" :content="props.meta.description" />
    <link rel="canonical" :href="canonicalHref" />
    <link rel="alternate" hreflang="en" href="/en/privacy" />
    <link rel="alternate" hreflang="fr" href="/fr/confidentialite" />
  </Head>

  <!-- Hero -->
  <section class="bg-cream px-6 py-16 lg:px-8 lg:py-24">
    <div class="mx-auto max-w-3xl text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ props.privacy.hero.eyebrow }}
      </p>
      <h1 class="mt-4 font-display text-4xl leading-tight tracking-tight text-fg lg:text-5xl">
        {{ props.privacy.hero.title }}
        <em class="text-coral-500 not-italic">{{ props.privacy.hero.titleHighlight }}</em>
      </h1>
      <p class="mt-4 text-lg text-fg-muted">{{ props.privacy.hero.subtitle }}</p>
      <p class="mt-6 text-sm text-fg-subtle">
        {{ props.privacy.hero.updatedLabel }} {{ props.privacy.hero.updatedDate }}
      </p>
    </div>
  </section>

  <!-- Sections -->
  <section class="bg-paper px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-3xl space-y-10">
      <article v-for="(section, i) in props.privacy.sections" :key="i" class="space-y-3">
        <h2 class="font-display text-2xl text-fg lg:text-3xl">
          <span class="text-coral-500">{{ String(i + 1).padStart(2, '0') }}.</span>
          {{ section.title }}
        </h2>
        <p class="whitespace-pre-line text-fg-muted">{{ section.body }}</p>
        <ul v-if="section.bullets" class="mt-2 space-y-2">
          <li
            v-for="(bullet, b) in section.bullets"
            :key="b"
            class="flex items-start gap-2 text-fg-muted"
          >
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
            <span>{{ bullet }}</span>
          </li>
        </ul>
      </article>
    </div>
  </section>

  <!-- Contact -->
  <section class="bg-bone px-6 py-12 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-3xl rounded-2xl border border-bone bg-cream p-8 text-center">
      <h2 class="font-display text-2xl text-fg">{{ props.privacy.contact.title }}</h2>
      <p class="mt-3 text-fg-muted">{{ props.privacy.contact.body }}</p>
      <a
        :href="`mailto:${props.privacy.contact.email}`"
        class="mt-4 inline-block font-semibold text-navy-900 underline"
        >{{ props.privacy.contact.email }}</a
      >
    </div>
  </section>
</template>
