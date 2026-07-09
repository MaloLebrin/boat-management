<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/solid'
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

interface OfferModule {
  icon: string
  name: string
  desc: string
  price: number
}

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  baseName: string
  baseDesc: string
  basePrice: number
  pricePer: string
  modulesLabel: string
  note: string
  ctaLabel: string
  ctaHref: string
  modules: OfferModule[]
}>()

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section :ref="el" class="reveal bg-cream px-6 py-20 lg:px-8" :class="{ visible: isVisible }">
    <div class="mx-auto max-w-5xl">
      <!-- Header -->
      <div class="mb-12 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-fg-subtle">{{ eyebrow }}</p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">
          {{ title }} <em class="text-gradient-animated not-italic">{{ titleHighlight }}</em>
        </h2>
        <p class="mx-auto mt-3 max-w-2xl text-pretty text-fg-muted">{{ subtitle }}</p>
      </div>

      <!-- Socle + modules -->
      <div class="flex flex-col items-stretch gap-6 lg:flex-row lg:items-center">
        <!-- Socle — bordure lumineuse rotative -->
        <div class="glow-border flex-1 rounded-2xl bg-navy-900 p-6 text-white shadow-xl">
          <p class="text-xs font-semibold uppercase tracking-widest text-white/50">
            {{ modulesLabel }}
          </p>
          <h3 class="mt-2 font-display text-2xl">{{ baseName }}</h3>
          <p class="mt-1 text-sm text-white/60">{{ baseDesc }}</p>
          <div class="mt-4 flex items-baseline gap-1">
            <span class="font-display text-4xl">{{ basePrice }} €</span>
            <span class="text-sm text-white/60">{{ pricePer }}</span>
          </div>
        </div>

        <!-- Séparateur + (pulse) -->
        <div class="flex items-center justify-center">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-full bg-coral-100 animate-pulse"
          >
            <PlusIcon class="h-5 w-5 text-coral-600" />
          </span>
        </div>

        <!-- Modules (entrée staggerée) -->
        <div class="flex-1 space-y-4 stagger" :class="{ visible: isVisible }">
          <div
            v-for="m in modules"
            :key="m.name"
            class="rounded-2xl border border-bone bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ m.icon }}</span>
                <div>
                  <h4 class="font-semibold text-fg">{{ m.name }}</h4>
                  <p class="mt-0.5 text-sm text-fg-muted">{{ m.desc }}</p>
                </div>
              </div>
              <div class="flex shrink-0 items-baseline gap-1">
                <span class="font-display text-lg text-fg">+{{ m.price }} €</span>
                <span class="text-xs text-fg-subtle">{{ pricePer }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Note + CTA -->
      <div class="mt-10 text-center">
        <p class="text-sm text-fg-muted">{{ note }}</p>
        <BaseButton :href="ctaHref" variant="outline" size="lg" class="mt-4">
          {{ ctaLabel }}
        </BaseButton>
      </div>
    </div>
  </section>
</template>
