<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    closeLabel?: string
  }>(),
  { title: undefined, closeLabel: 'Close' }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

function close() {
  emit('update:open', false)
}

function onKeyDown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
  { immediate: true }
)

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50">
      <div
        class="absolute inset-0 bg-abyss-950/30 backdrop-blur-[2px]"
        @click="close"
      />
      <div class="absolute inset-0 flex items-center justify-center p-6">
        <div
          class="w-full max-w-lg rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-lg)"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'Modal'"
        >
          <div class="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <p v-if="title" class="font-display text-base font-semibold text-fg">
              {{ title }}
            </p>
            <div class="ml-auto">
              <BaseButton variant="ghost" size="sm" type="button" @click="close">
                {{ closeLabel }}
              </BaseButton>
            </div>
          </div>
          <div class="px-5 py-5">
            <slot />
          </div>
          <div v-if="$slots.footer" class="border-t border-border px-5 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

