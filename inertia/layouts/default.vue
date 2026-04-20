<script setup lang="ts">
import { watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { toast, Toaster } from 'vue-sonner'
import type { Data } from '@generated/data'
import { Link, Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'

const page = usePage<Data.SharedProps>()

watch(
  () => page.url,
  () => toast.dismiss()
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
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-lilac-50 via-peach-50 to-mint-100 text-fg"
  >
    <header class="border-b border-border bg-surface-elevated/85 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link route="home" class="inline-flex items-center gap-3 text-fg hover:text-brand">
          <svg
            width="66"
            height="24"
            viewBox="0 0 105 38"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 0h7.5v15H0ZM7.5 15h7.5v15H7.5ZM15 30h7.5v7.5H15ZM22.5 15h7.5v15H22.5ZM30 0h7.5v15H30ZM45 0h7.5v30h15v-30h7.5v37.5h-30v-37.5ZM82.5 37.5V0H105v7.5H90V15h15v7.5H90V30h15v7.5H82.5Z"
              fill="currentColor"
            />
          </svg>
          <span class="sr-only">Home</span>
        </Link>

        <nav class="flex items-center gap-3 sm:gap-4">
          <Link
            route="design_system"
            class="hidden text-sm font-medium text-fg-muted hover:text-brand sm:inline-flex"
          >
            Design
          </Link>
          <template v-if="page.props.user">
            <a
              href="/boats"
              class="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Boats
            </a>
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-fg-muted ring-1 ring-border"
            >
              {{ page.props.user.initials }}
            </span>
            <Form route="session.destroy">
              <BaseButton type="submit" size="md" variant="primary">
                Logout
              </BaseButton>
            </Form>
          </template>
          <template v-else>
            <Link
              route="new_account.create"
              class="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] px-4 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Signup
            </Link>
            <Link
              route="session.create"
              class="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Login
            </Link>
          </template>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-6 py-10">
      <div
        class="rounded-[var(--radius-card)] border border-border bg-surface-elevated shadow-[var(--shadow-card)]"
      >
        <slot />
      </div>
    </main>

    <Toaster position="top-center" rich-colors />
  </div>
</template>
