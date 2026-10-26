<script setup lang="ts">
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import InstallSectionHeader from './InstallSectionHeader.vue'
import type { InstallSignalKMarketingContentProps } from '#shared/types/marketing_install_signalk'

/** Tableau symptômes / causes (#1022), empilé sous `md`. */
defineProps<{ content: InstallSignalKMarketingContentProps['troubleshooting'] }>()

const { isVisible } = useScrollReveal()
</script>

<template>
  <section
    id="troubleshooting"
    ref="el"
    class="reveal scroll-mt-20 bg-cream px-6 py-16 lg:px-8 lg:py-20"
    :class="{ visible: isVisible }"
    data-testid="install-troubleshooting"
  >
    <div class="mx-auto max-w-5xl">
      <InstallSectionHeader v-bind="content" />
      <div class="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
        <table class="w-full text-sm">
          <thead
            class="hidden bg-surface-muted text-left text-xs uppercase tracking-wider text-fg-subtle md:table-header-group"
          >
            <tr>
              <th scope="col" class="w-1/3 px-4 py-3 font-semibold">{{ content.symptomHeader }}</th>
              <th scope="col" class="px-4 py-3 font-semibold">{{ content.causeHeader }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="row in content.rows"
              :key="row.symptom"
              class="grid grid-cols-1 gap-1 px-4 py-3 md:table-row md:p-0"
              data-testid="install-trouble-row"
            >
              <th scope="row" class="text-left font-semibold text-fg md:px-4 md:py-3 md:align-top">
                {{ row.symptom }}
              </th>
              <td class="text-fg-muted md:px-4 md:py-3">{{ row.cause }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
