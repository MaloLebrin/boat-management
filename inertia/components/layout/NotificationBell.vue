<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useNotifications } from '~/composables/use_notifications'
import { useT } from '~/composables/use_t'
import NotificationPanel from '~/components/layout/NotificationPanel.vue'

const { unreadCount, hasUnread } = useNotifications()
const { t } = useT()

const isOpen = ref(false)
const bellRef = ref<HTMLElement | null>(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function onClickOutside(e: MouseEvent) {
  if (bellRef.value && !bellRef.value.contains(e.target as Node)) {
    close()
  }
}

watch(isOpen, (open) => {
  if (open) {
    window.addEventListener('keydown', onKeydown)
    document.addEventListener('mousedown', onClickOutside)
  } else {
    window.removeEventListener('keydown', onKeydown)
    document.removeEventListener('mousedown', onClickOutside)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <div ref="bellRef" class="relative">
    <button
      type="button"
      class="relative inline-flex h-9 w-9 items-center justify-center rounded-(--radius-control) text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      :aria-label="t('notifications.title')"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span
        v-if="hasUnread"
        class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
        aria-hidden="true"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <NotificationPanel v-if="isOpen" @close="close" />
  </div>
</template>
