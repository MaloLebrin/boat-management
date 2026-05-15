<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    subtitle?: string
    closeLabel?: string
    size?: 'md' | 'lg' | 'xl' | '2xl'
  }>(),
  { title: undefined, subtitle: undefined, closeLabel: 'Close', size: 'lg' }
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
    <Transition name="modal-overlay">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-abyss-950/30 backdrop-blur-[2px]"
        @click="close"
      />
    </Transition>
    <Transition name="modal-panel">
      <div v-if="open" class="fixed inset-0 z-51 flex items-center justify-center p-6">
        <div
          :class="[
            'w-full rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-lg)',
            size === 'md' ? 'max-w-md' : size === 'xl' ? 'max-w-xl' : size === '2xl' ? 'max-w-2xl' : 'max-w-lg',
          ]"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'Modal'"
        >
          <div class="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p v-if="title" class="font-display text-base font-semibold text-fg">
                {{ title }}
              </p>
              <p v-if="subtitle" class="mt-0.5 text-xs text-fg-muted">{{ subtitle }}</p>
            </div>
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
    </Transition>
  </Teleport>
</template>

