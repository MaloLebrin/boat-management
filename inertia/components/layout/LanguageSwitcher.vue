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
          ? 'bg-navy-500 text-white'
          : 'text-navy-200 hover:text-white hover:bg-navy-700'
      "
      @click="switchLocale('en')"
    >
      EN
    </button>
    <span class="text-navy-500 text-xs select-none">/</span>
    <button
      type="button"
      class="text-xs font-semibold px-2 py-1 rounded transition-colors"
      :class="
        locale === 'fr'
          ? 'bg-navy-500 text-white'
          : 'text-navy-200 hover:text-white hover:bg-navy-700'
      "
      @click="switchLocale('fr')"
    >
      FR
    </button>
  </div>
</template>
