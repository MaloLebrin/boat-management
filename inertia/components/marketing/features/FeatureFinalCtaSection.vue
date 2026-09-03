<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import type { FeatureCta } from '#shared/types/marketing'

defineProps<{
  title: string
  titleHighlight: string
  subtitle: string
  primaryCta: FeatureCta
  secondaryCta: FeatureCta
}>()
</script>

<template>
  <!-- Aplat navy permanent (comme le CTA final du guide) : couleurs navy assumées. -->
  <section class="bg-navy-900 px-6 py-16 lg:px-8 lg:py-24">
    <div class="mx-auto max-w-2xl text-center">
      <h2 class="font-display text-3xl text-white lg:text-4xl">
        {{ title }}
        <em class="text-coral-400 not-italic">{{ titleHighlight }}</em>
      </h2>
      <p class="mt-4 text-navy-200">{{ subtitle }}</p>
      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          :href="primaryCta.href"
          class="rounded-xl bg-coral-500 px-8 py-3 text-sm font-semibold text-white hover:bg-coral-600"
        >
          {{ primaryCta.label }}
        </Link>
        <Link
          :href="secondaryCta.href"
          class="rounded-xl bg-navy-700 px-8 py-3 text-sm font-semibold text-navy-100 hover:bg-navy-600"
        >
          {{ secondaryCta.label }}
        </Link>
      </div>
    </div>
  </section>
</template>
