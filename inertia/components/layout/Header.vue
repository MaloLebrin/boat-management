<script setup lang="ts">
import brandIconUrl from '~/assets/brand/fleetide_ai_icon_C.svg?url';
import { useT } from '~/composables/useT';

type AuthUser = {
  id: number
  email: string
  fullName: string | null
  initials: string
}

const props = defineProps<{
  isSidebarOpen: boolean
  user?: AuthUser
  openSidebar: () => void
}>()

const { t } = useT()
</script>

<template>
  <header class="border-b backdrop-blur-md border-border bg-surface-elevated/85">
    <div class="flex justify-between items-center px-6 mx-auto max-w-7xl h-16">
      <a href="/en" class="inline-flex gap-3 items-center text-fg hover:text-brand">
        <img :src="brandIconUrl" alt="Fleetide AI" class="h-9 w-9 rounded-(--radius-control) shadow-(--shadow-xs)" />
        <div class="hidden sm:flex flex-col leading-tight">
          <span class="font-display text-sm font-semibold text-fg">Fleetide AI</span>
          <span class="text-xs font-semibold text-fg-subtle">Fleet intelligence</span>
        </div>
      </a>

      <nav class="flex items-center gap-3 sm:gap-4">
        <template v-if="user">
          <button type="button"
            class="inline-flex h-10 items-center justify-center rounded-(--radius-control) px-3 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
            aria-controls="auth-sidebar-drawer" :aria-expanded="isSidebarOpen ? 'true' : 'false'" @click="openSidebar">
            {{ t('nav.menu') }}
          </button>

          <span
            class="inline-flex justify-center items-center w-9 h-9 text-sm font-semibold rounded-full ring-1 bg-surface-muted text-fg-muted ring-border">
            {{ user?.initials }}
          </span>
        </template>
      </nav>
    </div>
  </header>
</template>
