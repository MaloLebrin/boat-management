<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-cream text-fg">
    <AppHeader />
    <main class="w-full">
      <slot />
    </main>
  </div>
</template>
