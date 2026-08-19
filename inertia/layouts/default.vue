<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/vue3'
import { onBeforeUnmount, ref, watch } from 'vue'
import { Toaster } from 'vue-sonner'
import brandIconUrl from '~/assets/brand/fleetai_compass.svg'
import AsideMenu from '~/components/layout/AsideMenu.vue'
import DemoSessionBanner from '~/components/layout/DemoSessionBanner.vue'
import MobileSidebarDrawer from '~/components/layout/MobileSidebarDrawer.vue'
import NotificationBell from '~/components/layout/NotificationBell.vue'
import { useNetworkStatus } from '~/composables/use_network_status'
import ConflictResolutionModal from '~/components/ConflictResolutionModal.vue'
import OfflinePendingQueue from '~/components/OfflinePendingQueue.vue'
import { useFlashToasts } from '~/composables/use_flash_toasts'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { usePwaUpdate } from '~/composables/use_pwa_update'
import { useT } from '~/composables/use_t'

const page = usePage<Data.SharedProps>()
const isSidebarOpen = ref(false)

const { t } = useT()
const { isOnline } = useNetworkStatus()
const { drainQueue, conflictedAction, resolveConflict } = useOfflineQueue()
const { dismissAll: dismissToasts } = useFlashToasts()
usePwaUpdate()

watch(isOnline, (online) => {
  if (online) drainQueue()
})

function closeSidebar() {
  isSidebarOpen.value = false
}

function openSidebar() {
  isSidebarOpen.value = true
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeSidebar()
  }
}

watch(
  () => page.url,
  () => {
    dismissToasts()
    closeSidebar()
  }
)

watch(
  () => isSidebarOpen.value,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown)
      return
    }
    window.removeEventListener('keydown', onKeydown)
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="h-screen overflow-hidden flex bg-navy-900">
    <!-- Desktop Sidebar (always visible on lg+) -->
    <AsideMenu :user="page.props.user" />

    <!-- Main content area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Mobile header bar (hamburger + logo) - only on small screens -->
      <header
        class="lg:hidden flex items-center justify-between px-4 py-3 bg-navy-900 border-b border-navy-700"
      >
        <Link href="/dashboard" class="flex items-center gap-3">
          <img :src="brandIconUrl" alt="FleetAi" class="h-9 w-9 rounded-lg shadow-md" />
          <span class="font-display text-sm font-semibold text-white">FleetAi</span>
        </Link>
        <div class="flex items-center gap-1">
          <NotificationBell tone="onDark" />
          <button
            type="button"
            class="inline-flex items-center justify-center w-10 h-10 rounded-lg text-navy-100 hover:bg-navy-700 hover:text-white transition-colors"
            aria-controls="auth-sidebar-drawer"
            :aria-expanded="isSidebarOpen ? 'true' : 'false'"
            @click="openSidebar"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span class="sr-only">{{ t('nav.menu') }}</span>
          </button>
        </div>
      </header>

      <!-- Demo session countdown (demo users only) -->
      <DemoSessionBanner />

      <!-- Offline indicator -->
      <div
        v-if="!isOnline"
        class="bg-amber-500 text-white text-sm font-medium text-center py-1.5 px-4 shrink-0"
      >
        {{ t('common.offline.banner') }}
      </div>

      <!-- Scrollable content area -->
      <main class="flex-1 overflow-y-auto bg-cream">
        <OfflinePendingQueue />
        <Transition name="page" mode="out-in">
          <div :key="page.url">
            <slot />
          </div>
        </Transition>
      </main>
    </div>

    <!-- Mobile sidebar drawer -->
    <MobileSidebarDrawer :open="isSidebarOpen" :user="page.props.user" @close="closeSidebar" />

    <Toaster
      position="top-center"
      rich-colors
      close-button
      :container-aria-label="t('common.toasts.region')"
      :toast-options="{ closeButtonAriaLabel: t('common.toasts.close') }"
    />

    <ConflictResolutionModal
      v-if="conflictedAction"
      :conflict="conflictedAction"
      @resolve="resolveConflict"
    />
  </div>
</template>
