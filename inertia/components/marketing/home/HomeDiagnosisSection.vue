<script setup lang="ts">
import { SparklesIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import { useScrollReveal } from '~/composables/use_scroll_reveal'

/**
 * Diagnostic de panne IA en essai gratuit (#609) : le CTA vise le chat public
 * (`/fr/diagnostic-panne-ia`), jamais `/signup` — c'est l'entrée sans friction
 * du tunnel d'acquisition, l'inscription est proposée après le diagnostic.
 */
defineProps<{
  eyebrow: string
  title: string
  titleHighlight: string
  subtitle: string
  items: string[]
  ctaLabel: string
  ctaHref: string
  note: string
  disclaimer: string
}>()

const { el, isVisible } = useScrollReveal()
</script>

<template>
  <section
    id="diagnosis"
    :ref="el"
    class="reveal bg-paper px-6 py-20 lg:px-8 lg:py-24"
    :class="{ visible: isVisible }"
  >
    <div class="mx-auto max-w-7xl">
      <div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <!-- Colonne texte -->
        <div>
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-coral-600">
            {{ eyebrow }}
          </p>
          <h2 class="mt-3 font-display text-3xl leading-tight text-fg lg:text-4xl">
            {{ title }} <em class="text-coral-500">{{ titleHighlight }}</em>
          </h2>
          <p class="mt-4 text-lg text-fg-muted">{{ subtitle }}</p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <BaseButton :href="ctaHref" size="lg">
              {{ ctaLabel }}
            </BaseButton>
            <span class="text-sm font-medium text-fg-subtle">{{ note }}</span>
          </div>
        </div>

        <!-- Colonne preuve : ce que rend le diagnostic, étape par étape -->
        <div class="overflow-hidden rounded-2xl border border-bone bg-surface-elevated shadow-sm">
          <div class="h-1.5 bg-gradient-to-r from-coral-500 to-coral-400" aria-hidden="true" />
          <ol class="space-y-5 p-8 lg:p-10">
            <li v-for="(item, idx) in items" :key="idx" class="flex items-start gap-4">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral-100 font-mono text-sm font-semibold text-coral-700"
                aria-hidden="true"
              >
                {{ idx + 1 }}
              </span>
              <span class="text-sm leading-relaxed text-fg-muted">{{ item }}</span>
            </li>
          </ol>
          <div
            class="flex items-center gap-2 border-t border-bone bg-surface-muted px-8 py-4 lg:px-10"
          >
            <SparklesIcon class="h-4 w-4 shrink-0 text-coral-500" aria-hidden="true" />
            <span class="text-xs text-fg-subtle">{{ disclaimer }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
