<script setup lang="ts">
import { DevicePhoneMobileIcon, ShieldExclamationIcon } from '@heroicons/vue/24/outline'
import { useScrollReveal } from '~/composables/use_scroll_reveal'
import InstallSectionHeader from './InstallSectionHeader.vue'
import InstallStepList from './InstallStepList.vue'
import type { InstallSignalKMarketingContentProps } from '#shared/types/marketing_install_signalk'

/**
 * « Une adresse HTTPS pour ton serveur » (#1022) : nom de domaine, certificat
 * Let's Encrypt par défi DNS-01, fichiers de Signal K ou Caddy en frontal,
 * vérification ; puis le repli auto-signé et la réserve iPhone (non validé).
 */
defineProps<{ content: InstallSignalKMarketingContentProps['https'] }>()

const { isVisible } = useScrollReveal()
</script>

<template>
  <section
    id="https"
    ref="el"
    class="reveal scroll-mt-20 bg-cream px-6 py-16 lg:px-8 lg:py-20"
    :class="{ visible: isVisible }"
    data-testid="install-https"
  >
    <div class="mx-auto max-w-5xl">
      <InstallSectionHeader v-bind="content" />
      <div class="mt-8">
        <InstallStepList :steps="content.steps" />
      </div>

      <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          class="rounded-xl border border-border bg-surface p-5"
          data-testid="install-https-fallback"
        >
          <h3 class="flex items-center gap-2 font-semibold text-fg">
            <ShieldExclamationIcon class="h-5 w-5 text-warning" aria-hidden="true" />
            {{ content.fallbackTitle }}
          </h3>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">
            {{ content.fallbackDescription }}
          </p>
        </div>
        <div
          class="rounded-xl border border-warning/40 bg-amber-50 p-5"
          data-testid="install-https-iphone"
        >
          <h3 class="flex items-center gap-2 font-semibold text-amber-800">
            <DevicePhoneMobileIcon class="h-5 w-5" aria-hidden="true" />
            {{ content.iphoneTitle }}
          </h3>
          <p class="mt-2 text-sm leading-relaxed text-amber-800">{{ content.iphoneNote }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
