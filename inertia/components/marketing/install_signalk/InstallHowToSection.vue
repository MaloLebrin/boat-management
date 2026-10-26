<script setup lang="ts">
import { ClockIcon } from '@heroicons/vue/24/outline'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import InstallSectionHeader from './InstallSectionHeader.vue'
import InstallStepList from './InstallStepList.vue'
import type { InstallSignalKMarketingContentProps } from '#shared/types/marketing_install_signalk'

/**
 * Chemin pas à pas (#1022) : plugin ou appli. En-tête, temps total, puis les
 * étapes. `id` sert d'ancre aux cartes de « Choisis ton chemin ».
 */
withDefaults(
  defineProps<{
    id: string
    content: InstallSignalKMarketingContentProps['appHowTo']
    bgClass?: string
    testId?: string
  }>(),
  { bgClass: 'bg-paper', testId: 'install-howto' }
)

const { isVisible } = useScrollReveal()
</script>

<template>
  <section
    :id="id"
    ref="el"
    class="reveal scroll-mt-20 px-6 py-16 lg:px-8 lg:py-20"
    :class="[bgClass, { visible: isVisible }]"
    :data-testid="testId"
  >
    <div class="mx-auto max-w-5xl">
      <InstallSectionHeader v-bind="content" />
      <p
        class="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
        data-testid="install-howto-time"
      >
        <ClockIcon class="h-4 w-4" aria-hidden="true" />
        {{ content.totalTime }}
      </p>
      <div class="mt-8">
        <InstallStepList :steps="content.steps" />
      </div>
      <slot />
    </div>
  </section>
</template>
