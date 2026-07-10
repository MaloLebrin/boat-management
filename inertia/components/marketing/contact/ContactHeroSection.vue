<script setup lang="ts">
import PortsMapCanvas from '../canvas/PortsMapCanvas.vue'

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
}>()
</script>

<template>
  <section class="relative overflow-hidden bg-cream px-6 pb-12 pt-20 lg:px-8 lg:pt-28">
    <PortsMapCanvas variant="light" :intensity="0.5" />
    <div class="relative mx-auto max-w-3xl text-center">
      <p
        class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-500"
        style="animation: fadeUp 700ms var(--ease-premium) both"
      >
        {{ eyebrow }}
      </p>
      <h1
        class="mt-5 font-display text-5xl leading-none tracking-tight text-fg lg:text-6xl xl:text-7xl"
        style="animation: fadeUp 700ms var(--ease-premium) 80ms both"
      >
        {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
      </h1>
      <p
        class="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-fg-muted"
        style="animation: fadeUp 700ms var(--ease-premium) 160ms both"
      >
        {{ subtitle }}
      </p>
    </div>
  </section>
</template>
