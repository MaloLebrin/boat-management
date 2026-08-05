<script lang="ts">
import ErrorLayout from '~/layouts/error.vue'

export default {
  layout: ErrorLayout,
}
</script>

<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import { useT } from '~/composables/use_t'
import { useErrorPageExit } from '~/composables/use_error_page'

const { t } = useT()
const { href, labelKey } = useErrorPageExit('errors.notFound.action')
</script>

<template>
  <Head :title="t('errors.notFound.title')" />
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
    <p class="text-6xl font-bold text-fg-muted">404</p>
    <h1 class="mt-4 text-2xl font-semibold text-fg">{{ t('errors.notFound.title') }}</h1>
    <p class="mt-2 text-base text-fg-muted">{{ t('errors.notFound.description') }}</p>
    <Link :href="href" class="mt-6 text-sm font-medium text-brand hover:underline">
      {{ t(labelKey) }}
    </Link>
  </div>
</template>
