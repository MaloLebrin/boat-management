<script setup lang="ts">
/** En-tête éditorial commun aux sections de la page « Installer Signal K » (#1022). */
defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
}>()
</script>

<template>
  <div class="max-w-2xl">
    <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-600">
      {{ eyebrow }}
    </p>
    <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">
      {{ title }}
      <em class="text-coral-500 not-italic">{{ titleHighlight }}</em>
    </h2>
    <p class="mt-3 text-fg-muted">{{ subtitle }}</p>
  </div>
</template>
