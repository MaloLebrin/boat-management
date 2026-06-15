<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const page = usePage()

type SettingsSection = 'me' | 'org' | 'members' | 'billing'

const sections: { key: SettingsSection; route: string; label: () => string }[] = [
  { key: 'me', route: 'settings.me', label: () => t('settings.sections.me') },
  { key: 'org', route: 'settings.org', label: () => t('settings.sections.org') },
  { key: 'members', route: 'settings.members', label: () => t('settings.sections.members') },
  { key: 'billing', route: 'settings.billing', label: () => t('settings.sections.billing') },
]

function isActive(key: SettingsSection) {
  return page.url.startsWith(`/settings/${key}`)
}
</script>

<template>
  <div class="flex w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
    <div class="flex w-full flex-col gap-6 sm:flex-row sm:gap-8">
      <nav class="w-full shrink-0 sm:w-56">
        <BaseHeading level="2" class="mb-4 hidden sm:mb-6 sm:block">{{
          t('settings.title')
        }}</BaseHeading>
        <ul class="flex gap-1 overflow-x-auto sm:block sm:space-y-1">
          <li v-for="section in sections" :key="section.key" class="shrink-0">
            <Link
              :route="section.route"
              :class="[
                'block rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                isActive(section.key)
                  ? 'bg-brand/10 text-brand'
                  : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
              ]"
            >
              {{ section.label() }}
            </Link>
          </li>
        </ul>
      </nav>

      <div class="min-w-0 flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>
