<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue';
import brandIconUrl from '~/assets/brand/fleetide_ai_icon_C.svg?url';

const props = defineProps<{
  isAuthed: boolean
  isSidebarOpen: boolean
  user: User
  openSidebar: () => void
}>()
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
        <template v-if="isAuthed">
          <button type="button"
            class="inline-flex h-10 items-center justify-center rounded-(--radius-control) px-3 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
            aria-controls="auth-sidebar-drawer" :aria-expanded="isSidebarOpen ? 'true' : 'false'" @click="openSidebar">
            Menu
          </button>

          <span
            class="inline-flex justify-center items-center w-9 h-9 text-sm font-semibold rounded-full ring-1 bg-surface-muted text-fg-muted ring-border">
            {{ user?.initials }}
          </span>
        </template>

        <template v-else>
          <Link route="new_account.create"
            class="inline-flex h-10 items-center justify-center rounded-(--radius-control) px-4 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
          Signup
          </Link>
          <Link route="session.create"
            class="inline-flex h-10 items-center justify-center rounded-(--radius-control) bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
          Login
          </Link>
        </template>
      </nav>
    </div>
  </header>
</template>
