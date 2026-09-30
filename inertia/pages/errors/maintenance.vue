<script lang="ts">
import BareLayout from '~/layouts/bare.vue'

/**
 * Jumeau visuel de la page servie en HTTP. Le middleware de maintenance
 * n'envoie pas ce composant : le rendu Inertia exécute `share()`, qui lit la
 * base. La réponse réelle est le HTML statique de `renderMaintenancePage()`
 * (`app/services/maintenance_mode.ts`), mêmes chaînes i18n, les deux locales.
 */
export default {
  layout: BareLayout,
}
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'

const { t } = useT()

function retry() {
  window.location.reload()
}
</script>

<template>
  <Head :title="t('errors.maintenance.title')" />
  <div class="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
    <h1 class="text-2xl font-semibold text-fg">{{ t('errors.maintenance.title') }}</h1>
    <p class="mt-2 max-w-md text-base text-fg-muted">{{ t('errors.maintenance.description') }}</p>
    <button
      type="button"
      class="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand"
      @click="retry"
    >
      {{ t('errors.maintenance.action') }}
    </button>
  </div>
</template>
