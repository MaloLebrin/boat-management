<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>

<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { useT } from '~/composables/use_t'

const { t } = useT()
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
    <p class="text-6xl font-bold text-fg-muted">403</p>
    <h1 class="mt-4 text-2xl font-semibold text-fg">{{ t('errors.forbidden.title') }}</h1>
    <p class="mt-2 text-base text-fg-muted">{{ t('errors.forbidden.description') }}</p>
    <Link href="/dashboard" class="mt-6 text-sm font-medium text-brand hover:underline">
      {{ t('errors.forbidden.action') }}
    </Link>
  </div>
</template>
