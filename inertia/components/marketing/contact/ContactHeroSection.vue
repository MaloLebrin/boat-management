<script setup lang="ts">
import PortsMapCanvas from '../canvas/PortsMapCanvas.vue'
import { useTheme } from '~/composables/use_theme'

defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
}>()

const { resolved } = useTheme()
</script>

<template>
  <section class="relative overflow-hidden bg-cream px-6 pb-12 pt-20 lg:px-8 lg:pt-28">
    <!-- Le fond de section suit le thème : la carte doit suivre aussi. `key`
         force la recréation du canvas, dont le rendu est calculé une fois. -->
    <PortsMapCanvas :key="resolved" :variant="resolved" :intensity="0.5" />
    <div class="relative mx-auto max-w-3xl text-center">
      <p
        class="animate-fade-up-slow font-mono text-xs font-semibold uppercase tracking-widest text-coral-500"
      >
        {{ eyebrow }}
      </p>
      <h1
        class="mt-5 animate-fade-up-slow font-display text-5xl leading-none tracking-tight text-fg [animation-delay:80ms] lg:text-6xl xl:text-7xl"
      >
        {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
      </h1>
      <p
        class="mx-auto mt-5 max-w-xl animate-fade-up-slow text-lg leading-relaxed text-fg-muted [animation-delay:160ms]"
      >
        {{ subtitle }}
      </p>
    </div>
  </section>
</template>
