<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import GradientMeshCanvas from '~/components/marketing/canvas/GradientMeshCanvas.vue'
import { useMagnetic } from '~/composables/use_magnetic'
import { fadeUp, scaleIn } from '~/composables/use_motion_presets'
import { useScrollProgress } from '~/composables/use_scroll_progress'
import { useTilt } from '~/composables/use_tilt'
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

const { el: tiltEl, transform: tiltTransform } = useTilt({ max: 6, parallax: 0.6 })

// Entrée staggerée du copy (remplace les `animation: fadeUp` inline).
const titleMotion = fadeUp(0)
const subtitleMotion = fadeUp(100)
const ctaMotion = fadeUp(200)
const captionMotion = fadeUp(300)
const mockMotion = scaleIn(300)

// Profondeur « scroll-linked » : le mock grandit et s'éloigne légèrement au scroll.
const { el: progressEl, progress } = useScrollProgress()
const mockScrollStyle = computed(() => {
  const p = progress.value
  const scale = 1 + p * 0.045
  const ty = (p - 0.5) * -26
  return { transform: `scale(${scale.toFixed(3)}) translateY(${ty.toFixed(1)}px)` }
})

// CTA primaire magnétique.
const { el: magneticEl, transform: magneticTransform } = useMagnetic()
</script>

<template>
  <!-- Hero section — fond sombre navy + gradient mesh animé (façon Stripe) -->
  <section class="relative overflow-hidden bg-navy-900 px-6 pb-16 pt-12 lg:px-8 lg:pb-24 lg:pt-16">
    <GradientMeshCanvas variant="navy" :intensity="0.55" />
    <div class="pointer-events-none absolute inset-0 bg-navy-900/25" aria-hidden="true" />

    <div class="relative mx-auto max-w-5xl">
      <!-- Copy: centré -->
      <div class="mx-auto mb-12 max-w-2xl space-y-6 text-center">
        <h1
          v-motion="titleMotion"
          class="font-display text-5xl leading-tight tracking-tight text-white lg:text-6xl xl:text-7xl"
        >
          {{ currentHero.title }}
          <em class="text-gradient-animated not-italic">{{ currentHero.titleHighlight }}</em>
        </h1>
        <p v-motion="subtitleMotion" class="text-pretty text-lg text-white/70">
          {{ currentHero.subtitle }}
        </p>
        <div v-motion="ctaMotion" class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a :ref="magneticEl" href="/signup" :style="{ transform: magneticTransform }">
            <BaseButton size="lg" class="shadow-lg">
              {{ cta.primary }}
            </BaseButton>
          </a>
          <a href="#demo">
            <BaseButton
              size="lg"
              variant="outline"
              class="border-white/30! text-white! hover:bg-white/10!"
            >
              {{ cta.secondary }}
            </BaseButton>
          </a>
        </div>
        <p v-motion="captionMotion" class="text-sm text-white/50">
          {{ caption }}
        </p>
      </div>

      <!-- Browser mock : scroll-linked (scale) → entrée (scaleIn) → flottement
           (float-slow) → tilt 3D. Divs séparés pour empiler les transforms sans
           qu'une couche n'écrase la suivante. -->
      <div :ref="progressEl" class="will-change-transform" :style="mockScrollStyle">
        <div v-motion="mockMotion">
          <div class="float-slow">
            <div :ref="tiltEl" class="will-change-transform" :style="{ transform: tiltTransform }">
              <HomeBrowserFrame>
                <HomeMockDashboard :persona="activePersona" />
              </HomeBrowserFrame>
            </div>
          </div>
        </div>
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
