<script setup lang="ts">
import { isIos, isStandalone } from '~/composables/use_pwa_install'
import { useT } from '~/composables/use_t'

/**
 * Entonnoir d'installation iOS (#498) : Safari n'émet jamais
 * `beforeinstallprompt`, et Web Push n'y fonctionne qu'en PWA installée
 * (16.4+). Instructions « Partager → Sur l'écran d'accueil ».
 */
const { t } = useT()

const visible = isIos() && !isStandalone()
</script>

<template>
  <div v-if="visible" class="rounded-lg border border-border bg-surface-muted/40 p-4">
    <p class="text-sm font-semibold text-fg">{{ t('common.push.ios.title') }}</p>
    <ol class="mt-3 space-y-2 text-sm text-fg-muted">
      <li class="flex items-center gap-3">
        <!-- Icône Partager iOS -->
        <svg
          class="h-5 w-5 shrink-0 text-brand"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 3v12m0-12l-4 4m4-4l4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
        <span>{{ t('common.push.ios.step1') }}</span>
      </li>
      <li class="flex items-center gap-3">
        <!-- Icône Ajouter à l'écran d'accueil -->
        <svg
          class="h-5 w-5 shrink-0 text-brand"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path stroke-linecap="round" d="M12 9v6m-3-3h6" />
        </svg>
        <span>{{ t('common.push.ios.step2') }}</span>
      </li>
      <li class="flex items-center gap-3">
        <!-- Icône Cloche -->
        <svg
          class="h-5 w-5 shrink-0 text-brand"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <span>{{ t('common.push.ios.step3') }}</span>
      </li>
    </ol>
  </div>
</template>
