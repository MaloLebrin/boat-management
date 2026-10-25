<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import { INSTRUMENT_ICONS } from './instrument_icons'
import type { InstrumentsMarketingCard } from '#shared/types/marketing_instruments'

/**
 * Grille de cartes titre + description de la page instruments (#995) : familles
 * de mesures, bénéfices d'entretien, prérequis d'installation, garanties de
 * sécurité. `columns` règle la largeur de la grille (3 par défaut). La section
 * apparaît au défilement et ses cartes entrent l'une après l'autre (`.stagger`,
 * neutralisé par `prefers-reduced-motion`).
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

const { isVisible } = useScrollReveal()
</script>

<template>
  <section
    ref="el"
    class="reveal px-6 py-16 lg:px-8 lg:py-20"
    :class="[bgClass, { visible: isVisible }]"
    :data-testid="testId"
  >
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
        class="stagger mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2"
        :class="[columns === 3 ? 'lg:grid-cols-3' : '', { visible: isVisible }]"
      >
        <li
          v-for="item in items"
          :key="item.title"
          class="group rounded-xl border border-border bg-surface p-5 transition duration-300 hover:-translate-y-1 hover:border-coral-400 hover:shadow-md"
          data-testid="instruments-card"
        >
          <span
            v-if="item.icon"
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-coral-100 text-coral-700 transition duration-300 group-hover:scale-110"
            data-testid="instruments-card-icon"
          >
            <component :is="INSTRUMENT_ICONS[item.icon]" class="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 class="font-semibold text-fg" :class="{ 'mt-4': item.icon }">{{ item.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ item.description }}</p>
        </li>
      </ul>
      <slot />
    </div>
  </section>
</template>
