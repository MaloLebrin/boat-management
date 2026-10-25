<script setup lang="ts">
import { BellAlertIcon } from '@heroicons/vue/24/outline'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import { INSTRUMENT_ICONS } from './instrument_icons'
import type { InstrumentsMarketingContentProps } from '#shared/types/marketing_instruments'

/**
 * Alertes livrées avec l'onglet (#993) : les quatre règles intégrées, avec leurs
 * seuils réels, puis les règles propres au bateau et la notification de
 * l'équipe. Gravité en jetons `warning` / `danger`, jamais une couleur brute.
 */
defineProps<{ content: InstrumentsMarketingContentProps['alerts'] }>()

const { isVisible } = useScrollReveal()

const SEVERITY_CLASSES = {
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-coral-100 text-coral-700',
} as const
</script>

<template>
  <section
    ref="el"
    class="reveal bg-navy-900 px-6 py-16 lg:px-8 lg:py-20"
    :class="{ visible: isVisible }"
    data-testid="instruments-alerts"
  >
    <div class="mx-auto max-w-5xl">
      <div class="max-w-2xl">
        <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-300">
          {{ content.eyebrow }}
        </p>
        <h2 class="mt-2 font-display text-3xl text-white lg:text-4xl">
          {{ content.title }}
          <em class="text-coral-400 not-italic">{{ content.titleHighlight }}</em>
        </h2>
        <p class="mt-3 text-navy-100">{{ content.subtitle }}</p>
      </div>

      <ul
        class="stagger mt-10 grid grid-cols-1 gap-4 md:grid-cols-2"
        :class="{ visible: isVisible }"
      >
        <li
          v-for="item in content.items"
          :key="item.title"
          class="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-5"
          data-testid="instruments-alert-card"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-coral-300"
          >
            <component :is="INSTRUMENT_ICONS[item.icon]" class="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-semibold text-white">{{ item.title }}</h3>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="SEVERITY_CLASSES[item.severity]"
                :data-severity="item.severity"
              >
                {{ item.severityLabel }}
              </span>
            </div>
            <p class="mt-2 text-sm leading-relaxed text-navy-100">{{ item.description }}</p>
          </div>
        </li>
      </ul>

      <div class="mt-6 flex gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
        <BellAlertIcon class="h-6 w-6 shrink-0 text-coral-300" aria-hidden="true" />
        <div>
          <h3 class="font-semibold text-white">{{ content.customTitle }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-navy-100">{{ content.customDescription }}</p>
          <p class="mt-2 text-sm leading-relaxed text-navy-100">{{ content.team }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
