<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

const page = usePage()
const locale = computed(() => ((page.props as any).locale as 'en' | 'fr') ?? 'en')

function switchLocale(newLocale: 'en' | 'fr') {
  if (newLocale === locale.value) return
  router.post('/locale', { locale: newLocale }, { preserveScroll: true })
}
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      type="button"
      class="text-xs font-semibold px-2 py-1 rounded transition-colors"
      :class="
        locale === 'en'
          ? 'bg-lagoon-500 text-white'
          : 'text-abyss-300 hover:text-white hover:bg-abyss-800'
      "
      @click="switchLocale('en')"
    >
      EN
    </button>
    <span class="text-abyss-600 text-xs select-none">/</span>
    <button
      type="button"
      class="text-xs font-semibold px-2 py-1 rounded transition-colors"
      :class="
        locale === 'fr'
          ? 'bg-lagoon-500 text-white'
          : 'text-abyss-300 hover:text-white hover:bg-abyss-800'
      "
      @click="switchLocale('fr')"
    >
      FR
    </button>
  </div>
</template>
