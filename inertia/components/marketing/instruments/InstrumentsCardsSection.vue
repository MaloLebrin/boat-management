<script setup lang="ts">
import type { InstrumentsMarketingCard } from '#shared/types/marketing_instruments'

/**
 * Grille de cartes titre + description de la page instruments (#995) : familles
 * de mesures, bénéfices d'entretien, prérequis d'installation, garanties de
 * sécurité. `columns` règle la largeur de la grille (3 par défaut).
 */
withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    items: InstrumentsMarketingCard[]
    columns?: 2 | 3
    bgClass?: string
    testId?: string
  }>(),
  { columns: 3, bgClass: 'bg-cream', testId: 'instruments-cards' }
)
</script>

<template>
  <section class="px-6 py-16 lg:px-8 lg:py-20" :class="bgClass" :data-testid="testId">
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
      <ul
        class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2"
        :class="columns === 3 ? 'lg:grid-cols-3' : ''"
      >
        <li
          v-for="item in items"
          :key="item.title"
          class="rounded-xl border border-border bg-surface p-5"
          data-testid="instruments-card"
        >
          <h3 class="font-semibold text-fg">{{ item.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ item.description }}</p>
        </li>
      </ul>
      <slot />
    </div>
  </section>
</template>
