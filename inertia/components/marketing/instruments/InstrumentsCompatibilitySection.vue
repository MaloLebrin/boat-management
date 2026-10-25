<script setup lang="ts">
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import type { InstrumentsMarketingContentProps } from '#shared/types/marketing_instruments'

/**
 * Compatibilité honnête (#995) : ce qui est lu, ce qui ne l'est pas, et le plan
 * requis. Deux colonnes de listes, sans icône colorée posée sur un fond brut :
 * coche et croix héritent des tokens `success` / `danger`.
 */
defineProps<{ content: InstrumentsMarketingContentProps['compatibility'] }>()

const { isVisible } = useScrollReveal()
</script>

<template>
  <section
    ref="el"
    class="reveal bg-paper px-6 py-16 lg:px-8 lg:py-20"
    :class="{ visible: isVisible }"
    data-testid="instruments-compatibility"
  >
    <div class="mx-auto max-w-5xl">
      <div class="max-w-2xl">
        <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-600">
          {{ content.eyebrow }}
        </p>
        <h2 class="mt-2 font-display text-3xl text-fg lg:text-4xl">
          {{ content.title }}
          <em class="text-coral-500 not-italic">{{ content.titleHighlight }}</em>
        </h2>
        <p class="mt-3 text-fg-muted">{{ content.subtitle }}</p>
      </div>

      <div
        class="stagger mt-10 grid grid-cols-1 gap-4 md:grid-cols-2"
        :class="{ visible: isVisible }"
      >
        <div class="rounded-xl border border-border bg-surface p-6">
          <h3 class="font-semibold text-success">{{ content.supportedTitle }}</h3>
          <ul class="mt-4 space-y-3 text-sm text-fg-muted">
            <li
              v-for="line in content.supported"
              :key="line"
              class="flex items-start gap-3"
              data-testid="instruments-supported"
            >
              <CheckIcon class="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
              <span>{{ line }}</span>
            </li>
          </ul>
        </div>
        <div class="rounded-xl border border-border bg-surface p-6">
          <h3 class="font-semibold text-danger">{{ content.unsupportedTitle }}</h3>
          <ul class="mt-4 space-y-3 text-sm text-fg-muted">
            <li
              v-for="line in content.unsupported"
              :key="line"
              class="flex items-start gap-3"
              data-testid="instruments-unsupported"
            >
              <XMarkIcon class="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
              <span>{{ line }}</span>
            </li>
          </ul>
        </div>
      </div>

      <p class="mt-6 rounded-xl bg-brand-soft px-5 py-4 text-sm text-brand">
        {{ content.planNote }}
      </p>
    </div>
  </section>
</template>
