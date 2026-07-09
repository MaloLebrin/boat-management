<script setup lang="ts">
import GradientMeshCanvas from '../canvas/GradientMeshCanvas.vue'

defineProps<{
  line1: string
  line1Highlight: string
  line2: string
  line2Highlight: string
  subtitle: string
}>()
</script>

<template>
  <section class="relative overflow-hidden bg-cream px-6 pb-16 pt-20 lg:px-8 lg:pb-20 lg:pt-28">
    <GradientMeshCanvas variant="dawn" :intensity="0.5" />
    <div class="relative mx-auto max-w-4xl text-center">
      <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-500">
        À PROPOS · NOTRE MISSION
      </p>
      <h1
        class="mt-6 font-display text-5xl leading-none tracking-tight text-fg lg:text-6xl xl:text-7xl"
        style="animation: fadeUp 700ms var(--ease-premium) both"
      >
        {{ line1 }} <em class="text-coral-500">{{ line1Highlight }}</em
        ><br />
        {{ line2 }} <em class="text-coral-500">{{ line2Highlight }}</em>
      </h1>
      <p
        class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted"
        style="animation: fadeUp 700ms var(--ease-premium) 100ms both"
      >
        {{ subtitle }}
      </p>
    </div>
  </section>
</template>
