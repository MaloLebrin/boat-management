<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import HomeBrowserFrame from './HomeBrowserFrame.vue'
import HomeMockDashboard from './HomeMockDashboard.vue'

type Persona = 'loueurs' | 'ecoles' | 'marinas'

interface HeroContent {
  title: string
  titleHighlight: string
  subtitle: string
}

const props = defineProps<{
  activePersona: Persona
  heroContent: Record<Persona, HeroContent>
  cta: { primary: string; secondary: string }
  caption: string
  socialProof: { eyebrow: string; logos: string[] }
  locale: 'en' | 'fr'
}>()

const currentHero = computed(() => props.heroContent[props.activePersona])
const duplicatedLogos = computed(() => [...props.socialProof.logos, ...props.socialProof.logos])
</script>

<template>
  <!-- Hero section -->
  <section class="bg-cream px-6 pb-16 pt-12 lg:px-8 lg:pb-24 lg:pt-16">
    <div class="mx-auto max-w-5xl">
      <!-- Copy: centré -->
      <div
        class="mx-auto mb-12 max-w-2xl space-y-6 text-center"
        style="animation: fadeUp 700ms var(--ease-premium) both"
      >
        <h1
          class="font-display text-5xl leading-tight tracking-tight text-fg lg:text-6xl xl:text-7xl"
        >
          {{ currentHero.title }}
          <em class="text-coral-500">{{ currentHero.titleHighlight }}</em>
        </h1>
        <p
          class="text-pretty text-lg text-fg-muted"
          style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 100ms"
        >
          {{ currentHero.subtitle }}
        </p>
        <div
          class="flex flex-wrap items-center justify-center gap-3 pt-2"
          style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 200ms"
        >
          <a href="/signup">
            <BaseButton size="lg" class="shadow-lg">
              {{ cta.primary }}
            </BaseButton>
          </a>
          <a href="#demo">
            <BaseButton size="lg" variant="secondary">
              {{ cta.secondary }}
            </BaseButton>
          </a>
        </div>
        <p
          class="text-sm text-fg-subtle"
          style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 300ms"
        >
          {{ caption }}
        </p>
      </div>

      <!-- Browser mock: en dessous, pleine largeur du conteneur -->
      <div style="animation: fadeUp 700ms var(--ease-premium) both; animation-delay: 300ms">
        <HomeBrowserFrame>
          <HomeMockDashboard :persona="activePersona" />
        </HomeBrowserFrame>
      </div>
    </div>
  </section>

  <!-- Logos band -->
  <section class="border-y border-bone bg-white py-8">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <p class="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-fg-subtle">
        {{ socialProof.eyebrow }}
      </p>
      <div class="marquee-wrapper">
        <div class="marquee-track gap-6">
          <span
            v-for="(logo, idx) in duplicatedLogos"
            :key="`${logo}-${idx}`"
            class="whitespace-nowrap font-display text-lg text-fg-muted"
          >
            {{ logo }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
