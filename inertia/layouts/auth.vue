<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import AppHeader from '~/components/layout/AppHeader.vue'
import { useFlashToasts } from '~/composables/use_flash_toasts'
import { useT } from '~/composables/use_t'

const { t } = useT()

useFlashToasts()
</script>

<template>
  <div class="min-h-dvh bg-cream text-fg">
    <AppHeader />
    <main class="w-full">
      <slot />
    </main>
    <Toaster
      position="top-center"
      rich-colors
      close-button
      :container-aria-label="t('common.toasts.region')"
      :toast-options="{ closeButtonAriaLabel: t('common.toasts.close') }"
    />
  </div>
</template>
