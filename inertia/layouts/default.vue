<script setup lang="ts">
import { Form, Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/vue3'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Toaster, toast } from 'vue-sonner'
import BaseButton from '~/components/base/BaseButton.vue'
import brandIconUrl from '~/assets/brand/fleetide_ai_icon_C.svg?url'

const page = usePage<Data.SharedProps>()
const isSidebarOpen = ref(false)
const closeButtonEl = ref<HTMLButtonElement | null>(null)

const isAuthed = computed(() => Boolean(page.props.user))
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
  <div
    class="min-h-screen bg-linear-to-br from-lilac-50 via-peach-50 to-mint-100 text-fg"
  >
    <header class="border-b backdrop-blur-md border-border bg-surface-elevated/85">
      <div class="flex justify-between items-center px-6 mx-auto max-w-7xl h-16">
        <a href="/en" class="inline-flex gap-3 items-center text-fg hover:text-brand">
          <img
            :src="brandIconUrl"
            alt="Fleetide AI"
            class="h-9 w-9 rounded-(--radius-control) shadow-(--shadow-xs)"
          />
          <div class="hidden sm:flex flex-col leading-tight">
            <span class="font-display text-sm font-semibold text-fg">Fleetide AI</span>
            <span class="text-xs font-semibold text-fg-subtle">Fleet intelligence</span>
          </div>
        </a>

        <nav class="flex items-center gap-3 sm:gap-4">
          <template v-if="isAuthed">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-(--radius-control) px-3 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
              aria-controls="auth-sidebar-drawer"
              :aria-expanded="isSidebarOpen ? 'true' : 'false'"
              @click="openSidebar"
            >
              Menu
            </button>

            <span
              class="inline-flex justify-center items-center w-9 h-9 text-sm font-semibold rounded-full ring-1 bg-surface-muted text-fg-muted ring-border"
            >
              {{ page.props.user?.initials }}
            </span>
          </template>

          <template v-else>
            <Link
              route="new_account.create"
              class="inline-flex h-10 items-center justify-center rounded-(--radius-control) px-4 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Signup
            </Link>
            <Link
              route="session.create"
              class="inline-flex h-10 items-center justify-center rounded-(--radius-control) bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Login
            </Link>
          </template>
        </nav>
      </div>
    </header>

    <main class="px-6 py-10 mx-auto w-full max-w-7xl">
      <div v-if="!isAuthed" class="rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)">
        <slot />
      </div>

      <div v-else class="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside class="hidden lg:block">
          <div class="sticky top-20 rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)">
            <div class="px-4 py-4 border-b border-border">
              <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Workspace</p>
              <p class="mt-1 text-sm font-semibold text-fg">{{ page.props.user?.fullName ?? 'Account' }}</p>
            </div>
            <nav class="p-2">
              <Link
                route="dashboard"
                class="flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg"
              >
                Dashboard
              </Link>
              <a
                href="/boats"
                class="mt-1 flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg"
              >
                Boats
              </a>
              <Link
                route="design_system"
                class="mt-1 flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg"
              >
                Design system
              </Link>

              <div class="mt-2 border-t border-border pt-2">
                <Form route="session.destroy">
                  <BaseButton type="submit" size="sm" variant="danger" class="w-full">
                    Logout
                  </BaseButton>
                </Form>
              </div>
            </nav>
          </div>
        </aside>

        <div class="rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)">
          <slot />
        </div>
      </div>
    </main>

    <div v-if="isAuthed && isSidebarOpen" class="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        class="absolute inset-0 bg-black/20 backdrop-blur-sm"
        aria-label="Close menu"
        @click="closeSidebar"
      />

      <div
        id="auth-sidebar-drawer"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="drawerTitleId"
        class="absolute left-0 top-0 h-full w-[18rem] border-r border-border bg-surface-elevated shadow-(--shadow-lg)"
      >
        <div class="flex items-center justify-between border-b border-border px-4 py-4">
          <div class="flex items-center gap-3">
            <img
              :src="brandIconUrl"
              alt="Fleetide AI"
              class="h-9 w-9 rounded-(--radius-control) shadow-(--shadow-xs)"
            />
            <div class="flex flex-col leading-tight">
              <span :id="drawerTitleId" class="text-sm font-semibold text-fg">Menu</span>
              <span class="text-xs font-semibold text-fg-subtle">{{ page.props.user?.initials }}</span>
            </div>
          </div>
          <button
            ref="closeButtonEl"
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-(--radius-control) px-3 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Close menu"
            @click="closeSidebar"
          >
            Close
          </button>
        </div>

        <nav class="p-2">
          <Link
            route="dashboard"
            class="flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg"
            @click="closeSidebar"
          >
            Dashboard
          </Link>
          <a
            href="/boats"
            class="mt-1 flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg"
            @click="closeSidebar"
          >
            Boats
          </a>
          <Link
            route="design_system"
            class="mt-1 flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg"
            @click="closeSidebar"
          >
            Design system
          </Link>

          <div class="mt-2 border-t border-border pt-2">
            <Form route="session.destroy" @submit="closeSidebar">
              <BaseButton type="submit" size="sm" variant="danger" class="w-full">
                Logout
              </BaseButton>
            </Form>
          </div>
        </nav>
      </div>
    </div>

    <Toaster position="top-center" rich-colors />
  </div>
</template>
