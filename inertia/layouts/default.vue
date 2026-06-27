<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/vue3'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Toaster, toast } from 'vue-sonner'
import brandIconUrl from '~/assets/brand/fleetai_compass.svg'
import AsideMenu from '~/components/layout/AsideMenu.vue'
import DemoSessionBanner from '~/components/layout/DemoSessionBanner.vue'
import LanguageSwitcher from '~/components/layout/LanguageSwitcher.vue'
import NavItem from '~/components/layout/NavItem.vue'
import { useNavSections } from '~/composables/use_nav_sections'
import { useNetworkStatus } from '~/composables/use_network_status'
import ConflictResolutionModal from '~/components/ConflictResolutionModal.vue'
import OfflinePendingQueue from '~/components/OfflinePendingQueue.vue'
import { useOfflineQueue } from '~/composables/use_offline_queue'
import { usePwaUpdate } from '~/composables/use_pwa_update'
import { useT } from '~/composables/use_t'

const page = usePage<Data.SharedProps>()
const isSidebarOpen = ref(false)
const closeButtonEl = ref<HTMLButtonElement | null>(null)
const drawerTitleId = 'auth-sidebar-title'

const { t } = useT()
const { navSections } = useNavSections()
const { isOnline } = useNetworkStatus()
const { drainQueue, conflictedAction, resolveConflict } = useOfflineQueue()
usePwaUpdate()

watch(isOnline, (online) => {
  if (online) drainQueue()
})

function closeSidebar() {
  isSidebarOpen.value = false
}

function openSidebar() {
  isSidebarOpen.value = true
  nextTick(() => closeButtonEl.value?.focus())
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeSidebar()
  }
}

watch(
  () => page.url,
  () => {
    toast.dismiss()
    closeSidebar()
  }
)

watch(
  () => page.props.flash,
  (flashMessages) => {
    if (flashMessages.error) {
      toast.error(flashMessages.error)
    }
    if (flashMessages.success) {
      toast.success(flashMessages.success)
    }
    if (flashMessages.info) {
      toast.info(flashMessages.info)
    }
  },
  { immediate: true }
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
        <a href="/dashboard" class="flex items-center gap-3">
          <img :src="brandIconUrl" alt="FleetAi" class="h-9 w-9 rounded-lg shadow-md" />
          <span class="font-display text-sm font-semibold text-white">FleetAi</span>
        </a>
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
      </header>

      <!-- Demo session countdown (demo users only) -->
      <DemoSessionBanner />

      <!-- Offline indicator -->
      <div
        v-if="!isOnline"
        class="bg-amber-500 text-white text-sm font-medium text-center py-1.5 px-4 shrink-0"
      >
        {{ t('offline.banner') }}
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
    <Transition name="drawer-overlay">
      <button
        v-if="isSidebarOpen"
        type="button"
        class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
        :aria-label="t('nav.closeMenu')"
        @click="closeSidebar"
      />
    </Transition>
    <Transition name="drawer-panel">
      <div
        v-if="isSidebarOpen"
        id="auth-sidebar-drawer"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="drawerTitleId"
        class="fixed left-0 top-0 z-50 h-full w-64 bg-navy-900 shadow-xl lg:hidden"
      >
        <!-- Drawer header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-navy-700">
          <div class="flex items-center gap-3">
            <img :src="brandIconUrl" alt="FleetAi" class="h-10 w-10 rounded-lg shadow-md" />
            <div class="flex flex-col leading-tight">
              <span :id="drawerTitleId" class="font-display text-base font-semibold text-white"
                >FleetAi</span
              >
              <span class="text-xs font-medium text-navy-200">Fleet intelligence</span>
            </div>
          </div>
          <button
            ref="closeButtonEl"
            type="button"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-navy-100 hover:bg-navy-700 hover:text-white transition-colors"
            :aria-label="t('nav.closeMenu')"
            @click="closeSidebar"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Drawer navigation -->
        <nav class="flex-1 overflow-y-auto px-3 py-4">
          <div v-for="section in navSections" :key="section.label" class="mb-6">
            <p class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-navy-300">
              {{ section.label }}
            </p>
            <ul class="space-y-1">
              <li v-for="item in section.items" :key="item.path">
                <NavItem
                  :name="item.name"
                  :path="item.path"
                  :route="item.route"
                  :icon="item.icon"
                  @click="closeSidebar"
                />
              </li>
            </ul>
          </div>
        </nav>

        <!-- Drawer footer with user info -->
        <div
          class="absolute bottom-0 left-0 right-0 border-t border-navy-700 px-4 py-4 bg-navy-900"
        >
          <div class="mb-3">
            <LanguageSwitcher />
          </div>
          <div class="flex items-center gap-3 mb-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-navy-500 text-white font-semibold text-sm"
            >
              {{ page.props.user?.initials ?? '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">
                {{ page.props.user?.fullName ?? t('nav.unknownUser') }}
              </p>
              <p class="text-xs text-navy-200 truncate">
                {{ page.props.user?.email ?? '' }}
              </p>
            </div>
          </div>
          <Form route="session.destroy" @submit="closeSidebar">
            <button
              type="submit"
              class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-navy-100 hover:bg-navy-700 hover:text-white transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>{{ t('nav.logout') }}</span>
            </button>
          </Form>
        </div>
      </div>
    </Transition>

    <Toaster position="top-center" rich-colors />

    <ConflictResolutionModal
      v-if="conflictedAction"
      :conflict="conflictedAction"
      @resolve="resolveConflict"
    />
  </div>
</template>
