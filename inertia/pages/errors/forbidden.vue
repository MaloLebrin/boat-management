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
const { href, labelKey } = useErrorPageExit('errors.forbidden.action')
</script>

<template>
  <Head :title="t('errors.forbidden.title')" />
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
    <p class="text-6xl font-bold text-fg-muted">403</p>
    <h1 class="mt-4 text-2xl font-semibold text-fg">{{ t('errors.forbidden.title') }}</h1>
    <p class="mt-2 text-base text-fg-muted">{{ t('errors.forbidden.description') }}</p>
    <Link :href="href" class="mt-6 text-sm font-medium text-brand hover:underline">
      {{ t(labelKey) }}
    </Link>
  </div>
</template>
