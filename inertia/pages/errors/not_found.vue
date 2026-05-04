<script lang="ts">
import PublicLayout from '~/layouts/public.vue'

export default {
  layout: PublicLayout,
}
</script>

<script setup lang="ts">
import { useT } from '~/composables/useT'

const { t } = useT()
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
    <p class="text-6xl font-bold text-fg-muted">404</p>
    <h1 class="mt-4 text-2xl font-semibold text-fg">{{ t('errors.notFound.title') }}</h1>
    <p class="mt-2 text-base text-fg-muted">{{ t('errors.notFound.description') }}</p>
    <a href="/dashboard" class="mt-6 text-sm font-medium text-brand hover:underline">
      {{ t('errors.notFound.action') }}
    </a>
  </div>
</template>
