<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'
import { PLAN_LIMITS } from '../../../shared/types/plan'
import type { PlanTier } from '../../../shared/types/plan'

const { t } = useT()
const page = usePage()

type SettingsSection = 'me' | 'org' | 'members' | 'billing' | 'ai'

const baseSections: { key: SettingsSection; route: string; label: () => string }[] = [
  { key: 'me', route: 'settings.me', label: () => t('settings.sections.me') },
  { key: 'org', route: 'settings.org', label: () => t('settings.sections.org') },
  { key: 'members', route: 'settings.members', label: () => t('settings.sections.members') },
  { key: 'billing', route: 'settings.billing', label: () => t('settings.sections.billing') },
]

const VALID_PLANS = new Set<string>(['starter', 'pro', 'enterprise'])

const canCustomizeAI = computed(() => {
  const plan = page.props.currentPlan
  if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return false
  return PLAN_LIMITS[plan as PlanTier].canCustomizeAI
})

const sections = computed(() => {
  if (!canCustomizeAI.value) return baseSections
  return [
    ...baseSections,
    { key: 'ai' as SettingsSection, route: 'settings.ai', label: () => t('settings.sections.ai') },
  ]
})

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
