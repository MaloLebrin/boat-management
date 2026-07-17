<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    align?: 'left' | 'right'
    variant?: 'default' | 'primary'
  }>(),
  { align: 'left', variant: 'default' }
)

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function close() {
  open.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (!open.value) return
  if (!rootEl.value) return
  if (e.target instanceof Node && rootEl.value.contains(e.target)) return
  close()
}

function onKeyDown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div ref="rootEl" class="relative inline-flex">
    <button
      type="button"
      :class="[
        'inline-flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold shadow-(--shadow-xs) transition-[transform,box-shadow] duration-(--motion-fast) ease-premium hover:shadow-(--shadow-sm) focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
        variant === 'primary'
          ? 'bg-brand text-white hover:bg-brand-hover'
          : 'border border-border bg-surface-elevated text-fg',
      ]"
      :aria-expanded="open ? 'true' : 'false'"
      @click="open = !open"
    >
      <slot name="trigger"> Menu </slot>
      <svg
        :class="['h-4 w-4', variant === 'primary' ? 'text-white/80' : 'text-fg-subtle']"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.936a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute top-full z-20 mt-2 min-w-56 rounded-(--radius-card) border border-border bg-surface-elevated p-1 shadow-(--shadow-md)"
        :class="align === 'right' ? 'right-0' : 'left-0'"
        role="menu"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
