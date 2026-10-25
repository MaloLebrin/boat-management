<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import InstallSectionHeader from './InstallSectionHeader.vue'
import type { InstallSignalKMarketingContentProps } from '#shared/types/marketing_install_signalk'

/**
 * « Choisis ton chemin » (#1022) : plugin (recommandé) contre appli à bord,
 * deux cartes de présentation puis un comparatif critère par critère. Le
 * tableau devient une liste empilée sous `md`.
 */
defineProps<{ content: InstallSignalKMarketingContentProps['paths'] }>()

const { isVisible } = useScrollReveal()
</script>

<template>
  <section
    id="paths"
    ref="el"
    class="reveal scroll-mt-20 bg-cream px-6 py-16 lg:px-8 lg:py-20"
    :class="{ visible: isVisible }"
    data-testid="install-paths"
  >
    <div class="mx-auto max-w-5xl">
      <InstallSectionHeader v-bind="content" />

      <div
        class="stagger mt-10 grid grid-cols-1 gap-4 md:grid-cols-2"
        :class="{ visible: isVisible }"
      >
        <a
          href="#plugin"
          class="rounded-xl border-2 border-coral-400 bg-surface p-6 transition hover:shadow-md"
          data-testid="install-path-plugin"
        >
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-semibold text-fg">{{ content.pluginTitle }}</h3>
            <span
              class="rounded-full bg-coral-100 px-2.5 py-0.5 text-xs font-semibold text-coral-700"
            >
              {{ content.pluginBadge }}
            </span>
          </div>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ content.pluginDescription }}</p>
        </a>
        <a
          href="#app"
          class="rounded-xl border border-border bg-surface p-6 transition hover:border-coral-300 hover:shadow-md"
          data-testid="install-path-app"
        >
          <h3 class="font-semibold text-fg">{{ content.appTitle }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ content.appDescription }}</p>
        </a>
      </div>

      <div class="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
        <table class="w-full text-sm" data-testid="install-paths-table">
          <thead
            class="hidden bg-surface-muted text-left text-xs uppercase tracking-wider text-fg-subtle md:table-header-group"
          >
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">{{ content.criterionHeader }}</th>
              <th scope="col" class="px-4 py-3 font-semibold text-coral-700">
                {{ content.pluginTitle }}
              </th>
              <th scope="col" class="px-4 py-3 font-semibold">{{ content.appTitle }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="row in content.rows"
              :key="row.criterion"
              class="grid grid-cols-1 gap-1 px-4 py-3 md:table-row md:p-0"
              data-testid="install-paths-row"
            >
              <th scope="row" class="text-left font-semibold text-fg md:px-4 md:py-3">
                {{ row.criterion }}
              </th>
              <td class="text-fg-muted md:px-4 md:py-3">
                <span class="mr-1 text-xs font-semibold text-coral-700 md:hidden">
                  {{ content.pluginTitle }} :
                </span>
                {{ row.plugin }}
              </td>
              <td class="text-fg-muted md:px-4 md:py-3">
                <span class="mr-1 text-xs font-semibold text-fg-subtle md:hidden">
                  {{ content.appTitle }} :
                </span>
                {{ row.app }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
