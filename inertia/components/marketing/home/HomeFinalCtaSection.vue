<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import ParticleNetworkCanvas from '~/components/marketing/canvas/ParticleNetworkCanvas.vue'
import { useMagnetic } from '~/composables/use_magnetic'
import { fadeUp, scaleIn } from '~/composables/use_motion_presets'

defineProps<{
  title: string
  titleHighlight: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
}>()

const titleMotion = scaleIn(0)
const subtitleMotion = fadeUp(120)
const ctaMotion = fadeUp(220)
const { el: magneticEl, transform: magneticTransform } = useMagnetic()
</script>

<template>
  <section
    class="relative overflow-hidden bg-gradient-to-b from-navy-900 to-navy-800 px-6 py-20 lg:px-8 lg:py-24"
  >
    <!-- Réseau de particules (évoque une flotte connectée) -->
    <ParticleNetworkCanvas color="#b7c3d2" :density="1.3" />

    <!-- Decorative compass needle SVG -->
    <svg
      class="pointer-events-none absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 translate-x-1/4 opacity-10"
      viewBox="0 0 200 200"
      fill="none"
    >
      <circle cx="100" cy="100" r="90" stroke="#faf6ee" stroke-width="2" />
      <path d="M100 20 L108 100 L100 108 L92 100 Z" fill="#faf6ee" />
      <path d="M100 180 L108 100 L100 92 L92 100 Z" fill="#e2674f" />
      <circle cx="100" cy="100" r="6" fill="#faf6ee" />
    </svg>

    <div class="relative mx-auto max-w-3xl text-center">
      <h2
        v-motion="titleMotion"
        class="font-display text-3xl leading-tight text-white lg:text-4xl xl:text-5xl"
      >
        {{ title }} <em class="text-coral-400">{{ titleHighlight }}</em>
      </h2>
      <p v-motion="subtitleMotion" class="mt-4 text-lg text-white/60">{{ subtitle }}</p>
      <div v-motion="ctaMotion" class="mt-8 flex flex-wrap items-center justify-center gap-4">
        <a :ref="magneticEl" href="/signup" :style="{ transform: magneticTransform }">
          <BaseButton size="lg" class="bg-cream! text-navy-900! hover:bg-cream/90!">
            {{ primaryCta }}
          </BaseButton>
        </a>
        <a href="#demo">
          <BaseButton
            size="lg"
            variant="ghost"
            class="border! border-white/20! text-white/70! hover:bg-white/10! hover:text-white!"
          >
            {{ secondaryCta }}
          </BaseButton>
        </a>
      </div>
    </div>
  </section>
</template>
