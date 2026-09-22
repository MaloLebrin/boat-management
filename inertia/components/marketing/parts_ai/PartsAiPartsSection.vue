<script setup lang="ts">
import type { PublicPartSearchPartCard } from '#shared/types/spare_part_chat'

/**
 * Pièces fréquentes de la page publique de recherche de références : le contenu
 * indexable « longue traîne » (turbine, bougie, anode, kit carburateur…) que le
 * chat seul n'offre pas aux moteurs de recherche. Chaque carte est une ancre
 * vers le chat de la même page (`#parts-chat`, id posé par
 * `pages/marketing/parts_ai.vue`) — un défilement, pas une navigation Inertia.
 */
defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  items: PublicPartSearchPartCard[]
}>()
</script>

<template>
  <section class="bg-cream px-6 py-16 lg:px-8 lg:py-20">
    <div class="mx-auto max-w-5xl">
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
      <ul class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="item in items" :key="item.title">
          <a
            href="#parts-chat"
            class="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-coral-300"
          >
            <h3 class="font-semibold text-fg group-hover:text-coral-700">{{ item.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ item.description }}</p>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
