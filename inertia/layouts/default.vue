<script setup lang="ts">
import { Form, Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/vue3'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Toaster, toast } from 'vue-sonner'
import brandIconUrl from '~/assets/brand/fleetai_compass.svg'
import AsideMenu from '~/components/layout/AsideMenu.vue'
import LanguageSwitcher from '~/components/layout/LanguageSwitcher.vue'

const page = usePage<Data.SharedProps>()
const isSidebarOpen = ref(false)
const closeButtonEl = ref<HTMLButtonElement | null>(null)
const drawerTitleId = 'auth-sidebar-title'

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
  <div class="h-screen overflow-hidden flex bg-abyss-950">
    <!-- Desktop Sidebar (always visible on lg+) -->
    <AsideMenu :user="page.props.user" />

    <!-- Main content area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Mobile header bar (hamburger + logo) - only on small screens -->
      <header class="lg:hidden flex items-center justify-between px-4 py-3 bg-abyss-950 border-b border-abyss-800">
        <a href="/dashboard" class="flex items-center gap-3">
          <img :src="brandIconUrl" alt="FleetAi" class="h-9 w-9 rounded-lg shadow-md" />
          <span class="font-display text-sm font-semibold text-white">FleetAi</span>
        </a>
        <button type="button"
          class="inline-flex items-center justify-center w-10 h-10 rounded-lg text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors"
          aria-controls="auth-sidebar-drawer" :aria-expanded="isSidebarOpen ? 'true' : 'false'" @click="openSidebar">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span class="sr-only">Menu</span>
        </button>
      </header>

      <!-- Scrollable content area -->
      <main class="flex-1 overflow-y-auto bg-linear-to-br from-lilac-50 via-peach-50 to-mint-100">
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
        aria-label="Fermer le menu"
        @click="closeSidebar"
      />
    </Transition>
    <Transition name="drawer-panel">
      <div v-if="isSidebarOpen" id="auth-sidebar-drawer" role="dialog" aria-modal="true" :aria-labelledby="drawerTitleId"
        class="fixed left-0 top-0 z-50 h-full w-64 bg-abyss-950 shadow-xl lg:hidden">
        <!-- Drawer header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-abyss-800">
          <div class="flex items-center gap-3">
            <img :src="brandIconUrl" alt="FleetAi" class="h-10 w-10 rounded-lg shadow-md" />
            <div class="flex flex-col leading-tight">
              <span :id="drawerTitleId" class="font-display text-base font-semibold text-white">FleetAi</span>
              <span class="text-xs font-medium text-abyss-300">Fleet intelligence</span>
            </div>
          </div>
          <button ref="closeButtonEl" type="button"
            class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors"
            aria-label="Fermer le menu" @click="closeSidebar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Drawer navigation -->
        <nav class="flex-1 overflow-y-auto px-3 py-4">
          <div class="mb-6">
            <p class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-abyss-400">FLOTTE</p>
            <ul class="space-y-1">
              <li>
                <Link route="dashboard"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors"
                  @click="closeSidebar">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <a href="/boats"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors"
                  @click="closeSidebar">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 17h18M5 17l2-8h10l2 8M9 9V6a3 3 0 116 0v3" />
                  </svg>
                  <span>Mes bateaux</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="mb-6">
            <p class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-abyss-400">MAINTENANCE</p>
            <ul class="space-y-1">
              <li>
                <a href="/planning"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors"
                  @click="closeSidebar">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Planning</span>
                </a>
              </li>
              <li>
                <a href="/maintenance/history"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors"
                  @click="closeSidebar">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Historique</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="mb-6">
            <p class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-abyss-400">PREFERENCES</p>
            <ul class="space-y-1">
              <li>
                <a href="/settings"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors"
                  @click="closeSidebar">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Reglages</span>
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <!-- Drawer footer with user info -->
        <div class="absolute bottom-0 left-0 right-0 border-t border-abyss-800 px-4 py-4 bg-abyss-950">
          <div class="mb-3">
            <LanguageSwitcher />
          </div>
          <div class="flex items-center gap-3 mb-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-lagoon-500 text-white font-semibold text-sm">
              {{ page.props.user?.initials ?? '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">
                {{ page.props.user?.fullName ?? 'Utilisateur' }}
              </p>
              <p class="text-xs text-abyss-300 truncate">
                {{ page.props.user?.email ?? '' }}
              </p>
            </div>
          </div>
          <Form route="session.destroy" @submit="closeSidebar">
            <button type="submit"
              class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-abyss-200 hover:bg-abyss-800 hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Deconnexion</span>
            </button>
          </Form>
        </div>
      </div>
    </Transition>

    <Toaster position="top-center" rich-colors />
  </div>
</template>
