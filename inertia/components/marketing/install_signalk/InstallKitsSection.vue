<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/outline'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import InstallSectionHeader from './InstallSectionHeader.vue'
import InstallExternalLinks from './InstallExternalLinks.vue'
import type { InstallSignalKMarketingContentProps } from '#shared/types/marketing_install_signalk'

/**
 * « Choisis ton matériel » (#1022) : une carte par situation de départ (rien à
 * bord, Cerbo GX, serveur existant) avec budget indicatif, temps de mise en
 * place, liste du matériel et liens officiels.
 */
defineProps<{ content: InstallSignalKMarketingContentProps['kits'] }>()

const { isVisible } = useScrollReveal()
</script>

<template>
  <section
    id="kits"
    ref="el"
    class="reveal scroll-mt-20 bg-paper px-6 py-16 lg:px-8 lg:py-20"
    :class="{ visible: isVisible }"
    data-testid="install-kits"
  >
    <div class="mx-auto max-w-5xl">
      <InstallSectionHeader v-bind="content" />
      <ul
        class="stagger mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3"
        :class="{ visible: isVisible }"
      >
        <li
          v-for="kit in content.items"
          :key="kit.title"
          class="flex flex-col rounded-xl border border-border bg-surface p-6"
          data-testid="install-kit"
        >
          <h3 class="font-semibold text-fg">{{ kit.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ kit.description }}</p>
          <dl class="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-muted p-3 text-xs">
            <div>
              <dt class="text-fg-subtle">{{ content.budgetLabel }}</dt>
              <dd class="mt-0.5 font-semibold text-fg">{{ kit.budget }}</dd>
            </div>
            <div>
              <dt class="text-fg-subtle">{{ content.durationLabel }}</dt>
              <dd class="mt-0.5 font-semibold text-fg">{{ kit.duration }}</dd>
            </div>
          </dl>
          <ul class="mt-4 flex-1 space-y-2 text-sm text-fg-muted">
            <li
              v-for="item in kit.items"
              :key="item"
              class="flex items-start gap-2"
              data-testid="install-kit-item"
            >
              <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span>{{ item }}</span>
            </li>
          </ul>
          <InstallExternalLinks class="mt-5" :label="content.linksLabel" :links="kit.links" />
        </li>
      </ul>
    </div>
  </section>
</template>
