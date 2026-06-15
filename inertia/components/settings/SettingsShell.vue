<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()
const page = usePage()

type SettingsSection = 'me' | 'org' | 'members' | 'billing'

const sections: { key: SettingsSection; path: string; label: () => string }[] = [
  { key: 'me', path: '/settings/me', label: () => t('settings.sections.me') },
  { key: 'org', path: '/settings/org', label: () => t('settings.sections.org') },
  { key: 'members', path: '/settings/members', label: () => t('settings.sections.members') },
  { key: 'billing', path: '/settings/billing', label: () => t('settings.sections.billing') },
]

function isActive(path: string) {
  return page.url === path || page.url.startsWith(path + '?')
}
</script>

<template>
  <div class="flex w-full max-w-7xl px-6 py-10 sm:px-8">
    <div class="flex w-full gap-8">
      <nav class="w-56 shrink-0">
        <BaseHeading level="2" class="mb-6">{{ t('settings.title') }}</BaseHeading>
        <ul class="space-y-1">
          <li v-for="section in sections" :key="section.key">
            <Link
              :href="section.path"
              :class="[
                'block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                isActive(section.path)
                  ? 'bg-brand/10 text-brand'
                  : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
              ]"
            >
              {{ section.label() }}
            </Link>
          </li>
        </ul>
      </nav>

      <div class="flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>
