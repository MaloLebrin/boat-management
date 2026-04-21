<script setup lang="ts">
import { Form, Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { usePage } from '@inertiajs/vue3'
import { watch } from 'vue'
import { Toaster, toast } from 'vue-sonner'
import BaseButton from '~/components/base/BaseButton.vue'
import brandIconUrl from '~/assets/brand/fleetide_ai_icon_C.svg?url'

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

        <nav class="flex gap-3 items-center sm:gap-4">
          <Link
            route="design_system"
            class="hidden text-sm font-medium text-fg-muted hover:text-brand sm:inline-flex"
          >
            Design
          </Link>
          <template v-if="page.props.user">
            <Link
              route="dashboard"
              class="inline-flex h-9 items-center justify-center rounded-(--radius-control) px-3 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Dashboard
            </Link>
            <a
              href="/boats"
              class="inline-flex h-9 items-center justify-center rounded-(--radius-control) px-3 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              Boats
            </a>
            <span
              class="inline-flex justify-center items-center w-9 h-9 text-sm font-semibold rounded-full ring-1 bg-surface-muted text-fg-muted ring-border"
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
      <div
        class="rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)"
      >
        <slot />
      </div>
    </main>

    <Toaster position="top-center" rich-colors />
  </div>
</template>
