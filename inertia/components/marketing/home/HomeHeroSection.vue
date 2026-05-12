<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import { useT } from '~/composables/useT'

const props = defineProps<{
  brand: { name: string }
  hero: { eyebrow: string; title: string; subtitle: string }
  cta: { primary: string; secondary: string }
  stats: { items: Array<{ label: string; value: string; hint: string }> }
  socialProof: { title: string; logos: string[] }
  locale: 'en' | 'fr'
}>()

const { t: tApp } = useT()
const duplicatedLogos = computed(() => [...props.socialProof.logos, ...props.socialProof.logos])
</script>

<template>
  <!-- Section 1: Hero -->
  <section class="relative overflow-hidden rounded-2xl bg-navy-900 px-8 py-16 lg:px-16 lg:py-20">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-24 right-0 h-96 w-96 rounded-full bg-navy-500/10 blur-3xl" />
      <div class="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-coral-500/8 blur-2xl" />
    </div>

    <div class="relative grid gap-12 lg:grid-cols-2 lg:items-center">
      <div class="max-w-xl space-y-6">
        <span
          class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/70"
          style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 0ms"
        >
          <svg width="16" height="16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="32" cy="32" r="28" stroke="#faf6ee" stroke-width="3.5" />
            <path d="M32 9 L37.5 32 L32 36.5 L26.5 32 Z" fill="#faf6ee" />
            <path d="M32 55 L37.5 32 L32 27.5 L26.5 32 Z" fill="#e2674f" />
          </svg>
          {{ hero.eyebrow }}
        </span>
        <h1
          class="font-display text-4xl italic leading-tight tracking-tight text-white lg:text-5xl"
          style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 100ms"
        >
          {{ hero.title }}
        </h1>
        <p
          class="text-pretty text-lg text-white/65"
          style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 200ms"
        >
          {{ hero.subtitle }}
        </p>
        <div
          class="flex flex-wrap items-center gap-3"
          style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 320ms"
        >
          <a href="/signup">
            <BaseButton size="lg" class="bg-white! text-navy-900! shadow-lg hover:bg-white/90!">
              {{ cta.primary }}
            </BaseButton>
          </a>
          <Link :href="`/${locale}/tarifs`">
            <BaseButton size="lg" variant="ghost" class="border! border-white/25! text-white/80! hover:bg-white/10! hover:text-white!">
              {{ cta.secondary }}
            </BaseButton>
          </Link>
          <a href="#demo">
            <BaseButton variant="ghost" size="sm" class="text-white/80 hover:text-white border-white/20">
              {{ tApp('homePreview.demoButton') }}
            </BaseButton>
          </a>
        </div>
        <div class="mt-3 text-sm text-white/40">{{ tApp('homePreview.socialProof') }}</div>
        <div class="mt-10 aspect-video w-full rounded-xl border border-white/10 bg-navy-800/60 flex items-center justify-center text-sm text-white/30">
          {{ tApp('homePreview.dashboardAlt') }}
        </div>
      </div>

      <!-- Stats grid in hero -->
      <div class="grid grid-cols-3 gap-3">
        <div
          v-for="s in stats.items"
          :key="s.label"
          class="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
        >
          <p class="font-display text-2xl italic text-white">{{ s.value }}</p>
          <p class="mt-1 text-xs text-white/50">{{ s.label }}</p>
          <p class="mt-0.5 text-xs text-white/30">{{ s.hint }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Section 2: Logos marquee -->
  <section class="mt-14 bg-cream rounded-xl py-10 px-6">
    <p class="text-center text-sm font-medium text-fg-muted mb-6">{{ socialProof.title }}</p>
    <div class="marquee-wrapper">
      <div class="marquee-track gap-4">
        <span
          v-for="(logo, idx) in duplicatedLogos"
          :key="`${logo}-${idx}`"
          class="bg-paper border border-bone px-5 py-2.5 text-sm font-medium text-fg-muted rounded-full whitespace-nowrap"
        >
          {{ logo }}
        </span>
      </div>
    </div>
  </section>
</template>
