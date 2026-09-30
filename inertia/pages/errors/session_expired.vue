<script lang="ts">
import ErrorLayout from '~/layouts/error.vue'

export default {
  layout: ErrorLayout,
}
</script>

<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { Head, router } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import { useErrorPageExit } from '~/composables/use_error_page'

const { t } = useT()
const { href, labelKey } = useErrorPageExit('errors.sessionExpired.home')

/**
 * Inertia 2 ne rejoue pas un 419 (seul le 409 + `x-inertia-location` est
 * spécial). `router.reload()` refait un GET de l'URL courante et récupère un
 * jeton CSRF frais. Le brouillon du formulaire n'est pas restauré.
 */
function reload() {
  router.reload()
}
</script>

<template>
  <Head :title="t('errors.sessionExpired.title')" />
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
    <p class="text-6xl font-bold text-fg-muted">419</p>
    <h1 class="mt-4 text-2xl font-semibold text-fg">{{ t('errors.sessionExpired.title') }}</h1>
    <p class="mt-2 max-w-md text-base text-fg-muted">
      {{ t('errors.sessionExpired.description') }}
    </p>
    <button
      type="button"
      class="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand"
      @click="reload"
    >
      {{ t('errors.sessionExpired.action') }}
    </button>
    <Link :href="href" class="mt-4 text-sm font-medium text-brand hover:underline">
      {{ t(labelKey) }}
    </Link>
  </div>
</template>
