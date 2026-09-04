<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useT } from '~/composables/use_t'
import type { PublicNavGroup } from '~/composables/use_public_nav'

defineProps<{
  groups: PublicNavGroup[]
}>()

const { t } = useT()
const page = usePage()

const isOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('click', onDocumentClick)
    window.addEventListener('keydown', onKeydown)
    return
  }
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('keydown', onKeydown)
})

// Fermer à la navigation (le clic sur un <Link> du panneau déclenche une visite).
watch(
  () => page.url,
  () => close()
)

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) ease-premium hover:bg-paper hover:text-fg"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="true"
      @click="toggle"
    >
      {{ t('public.nav.product') }}
      <svg
        class="h-4 w-4 transition-transform duration-(--motion-fast)"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-bone bg-cream p-3 shadow-xl"
    >
      <div v-for="group in groups" :key="group.labelKey" class="pb-1">
        <p class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          {{ t(group.labelKey) }}
        </p>
        <Link
          v-for="link in group.links"
          :key="link.href"
          :href="link.href"
          class="block rounded-(--radius-control) px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-(--motion-fast) hover:bg-paper hover:text-fg"
          @click="close"
        >
          {{ t(link.labelKey) }}
        </Link>
      </div>
    </div>
  </div>
</template>
