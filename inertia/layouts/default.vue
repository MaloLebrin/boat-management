<script setup lang="ts">
import { watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { toast, Toaster } from 'vue-sonner'
import type { Data } from '@generated/data'
import { Link, Form } from '@adonisjs/inertia/vue'

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
  <div class="min-h-screen bg-zinc-50 text-zinc-900">
    <header class="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link route="home" class="inline-flex items-center gap-3 text-zinc-900 hover:text-zinc-700">
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

        <nav class="flex items-center gap-4">
          <template v-if="page.props.user">
            <a
              href="/boats"
              class="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            >
              Boats
            </a>
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200"
            >
              {{ page.props.user.initials }}
            </span>
            <Form route="session.destroy">
              <button
                type="submit"
                class="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Logout
              </button>
            </Form>
          </template>
          <template v-else>
            <Link
              route="new_account.create"
              class="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            >
              Signup
            </Link>
            <Link
              route="session.create"
              class="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Login
            </Link>
          </template>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-6 py-10">
      <div class="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <slot />
      </div>
    </main>

    <Toaster position="top-center" rich-colors />
  </div>
</template>
