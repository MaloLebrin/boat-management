<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'
import { usePermissions } from '~/composables/use_permissions'
import { PLAN_LIMITS } from '../../../shared/types/plan'
import type { PlanTier } from '../../../shared/types/plan'

const { t } = useT()
const page = usePage()
const { can } = usePermissions()

type SettingsSection =
  | 'me'
  | 'org'
  | 'members'
  | 'billing'
  | 'ai'
  | 'audit-log'
  | 'branding'
  | 'import'

// `org`/`members` partagent la même audience que la capability `members.view`
// (member + admin) — mechanic/boat_owner n'ont accès à aucune section
// administrative de l'organisation. Cf. #397.
const baseSections = computed(() => {
  const result: { key: SettingsSection; route: string; label: () => string }[] = [
    { key: 'me', route: 'settings.me', label: () => t('settings.sections.me') },
  ]
  if (can('members.view')) {
    result.push({ key: 'org', route: 'settings.org', label: () => t('settings.sections.org') })
    result.push({
      key: 'members',
      route: 'settings.members',
      label: () => t('settings.sections.members'),
    })
  }
  if (can('subscription.view')) {
    result.push({
      key: 'billing',
      route: 'settings.billing',
      label: () => t('settings.sections.billing'),
    })
  }
  return result
})

const VALID_PLANS = new Set<string>(['starter', 'pro', 'enterprise'])

const canExport = computed(() => {
  const plan = page.props.currentPlan
  if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return false
  return PLAN_LIMITS[plan as PlanTier].canExport
})

const canCustomizeAI = computed(() => {
  const plan = page.props.currentPlan
  if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return false
  return PLAN_LIMITS[plan as PlanTier].canCustomizeAI
})

const canViewAuditLog = computed(() => {
  const plan = page.props.currentPlan
  if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return false
  return PLAN_LIMITS[plan as PlanTier].auditLogRetentionDays !== 0
})

const canWhiteLabel = computed(() => {
  const plan = page.props.currentPlan
  if (typeof plan !== 'string' || !VALID_PLANS.has(plan)) return false
  return PLAN_LIMITS[plan as PlanTier].canWhiteLabel
})

const sections = computed(() => {
  const result = [...baseSections.value]
  if (canExport.value) {
    result.push({
      key: 'import' as SettingsSection,
      route: 'settings.import',
      label: () => t('settings.sections.import'),
    })
  }
  if (canCustomizeAI.value && can('ai.configure')) {
    result.push({
      key: 'ai' as SettingsSection,
      route: 'settings.ai',
      label: () => t('settings.sections.ai'),
    })
  }
  if (canViewAuditLog.value && can('audit_log.view')) {
    result.push({
      key: 'audit-log' as SettingsSection,
      route: 'settings.auditLog',
      label: () => t('settings.sections.auditLog'),
    })
  }
  if (canWhiteLabel.value && can('branding.configure')) {
    result.push({
      key: 'branding' as SettingsSection,
      route: 'settings.branding',
      label: () => t('settings.sections.branding'),
    })
  }
  return result
})

function isActive(key: SettingsSection) {
  if (key === 'import') return page.url.startsWith('/settings/import')
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
