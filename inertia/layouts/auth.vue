<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { watch } from 'vue'
import { Toaster, toast } from 'vue-sonner'
import AppHeader from '~/components/layout/AppHeader.vue'
import type { Data } from '@generated/data'

const page = usePage<Data.SharedProps>()

watch(
  () => page.props.flash,
  (flashMessages) => {
    if (flashMessages.error) toast.error(flashMessages.error)
    if (flashMessages.success) toast.success(flashMessages.success)
    if (flashMessages.info) toast.info(flashMessages.info)
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen bg-cream text-fg">
    <AppHeader />
    <main class="w-full">
      <slot />
    </main>
    <Toaster position="top-center" rich-colors />
  </div>
</template>
