<script setup lang="ts">
import { Form, Link } from '@adonisjs/inertia/vue';
import BaseButton from '~/components/base/BaseButton.vue';

type AuthUser = {
  id: number
  email: string
  fullName: string | null
  initials: string
}

const props = defineProps<{
  user: AuthUser
}>()
</script>

<template>
  <aside class="hidden lg:block">
    <div class="sticky top-20 rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-card)">
      <div class="px-4 py-4 border-b border-border">
        <p class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Workspace</p>
        <p class="mt-1 text-sm font-semibold text-fg">{{ user?.fullName ?? 'Account' }}</p>
      </div>
      <nav class="p-2">
        <Link route="dashboard"
          class="flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg">
        Dashboard
        </Link>
        <a href="/boats"
          class="mt-1 flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg">
          Boats
        </a>
        <Link route="design_system"
          class="mt-1 flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-fg-muted hover:bg-surface-muted hover:text-fg">
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
</template>
