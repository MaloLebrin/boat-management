<script setup lang="ts">
import { ref } from 'vue'
import { useScrollOverflow } from '~/composables/use_scroll_overflow'
import { useT } from '~/composables/use_t'

const containerEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)

const { t } = useT()
const { canScrollUp, canScrollDown, scrollDown } = useScrollOverflow(containerEl, contentEl)
</script>

<template>
  <div class="relative flex-1 min-h-0">
    <nav ref="containerEl" class="nav-scroll h-full overflow-y-auto overscroll-contain px-3 py-4">
      <div ref="contentEl">
        <slot />
      </div>
    </nav>

    <!-- Dégradés : signalent le contenu masqué au-dessus / en dessous -->
    <div
      v-show="canScrollUp"
      aria-hidden="true"
      data-testid="nav-scroll-fade-top"
      class="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-navy-900 to-transparent"
    />
    <div
      v-show="canScrollDown"
      aria-hidden="true"
      data-testid="nav-scroll-fade-bottom"
      class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-navy-900 to-transparent"
    />

    <button
      v-show="canScrollDown"
      type="button"
      data-testid="nav-scroll-down"
      class="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-navy-800 ring-1 ring-navy-600 text-navy-100 shadow-md cursor-pointer transition-colors hover:bg-navy-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      :aria-label="t('nav.scrollDown')"
      :title="t('nav.scrollDown')"
      @click="scrollDown"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
</template>
