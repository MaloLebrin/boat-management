<script setup lang="ts">
import BaseCodeBlock from '~/components/base/BaseCodeBlock.vue'
import InstallExternalLinks from './InstallExternalLinks.vue'
import type { InstallSignalKStep } from '#shared/types/marketing_install_signalk'

/**
 * Liste ordonnée d'étapes d'un HowTo (#1022) : numéro, titre, texte, puis un
 * `BaseCodeBlock` (commande à copier) et des liens officiels quand l'étape en
 * porte. Les chiffres sont des tokens de marque : la section s'inverse
 * correctement en thème sombre.
 */
defineProps<{ steps: InstallSignalKStep[] }>()
</script>

<template>
  <ol class="space-y-6">
    <li
      v-for="(step, index) in steps"
      :key="step.title"
      class="flex gap-4 rounded-xl border border-border bg-surface p-5"
      data-testid="install-step"
    >
      <p
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-100 font-display text-base font-bold text-coral-700"
        aria-hidden="true"
      >
        {{ index + 1 }}
      </p>
      <div class="min-w-0 flex-1">
        <h3 class="font-semibold text-fg">{{ step.title }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ step.description }}</p>
        <BaseCodeBlock
          v-if="step.code"
          class="mt-4"
          :code="step.code"
          :label="step.codeLabel"
          language="bash"
          wrap
        >
          <template v-if="step.codeCaption" #caption>{{ step.codeCaption }}</template>
        </BaseCodeBlock>
        <InstallExternalLinks v-if="step.links?.length" class="mt-4" :links="step.links" />
      </div>
    </li>
  </ol>
</template>
