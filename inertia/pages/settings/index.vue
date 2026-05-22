<script setup lang="ts">
import { ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import BaseHeading from '~/components/base/BaseHeading.vue'
import SettingsMeTab from '~/components/settings/tabs/SettingsMeTab.vue'
import SettingsOrgTab from '~/components/settings/tabs/SettingsOrgTab.vue'
import SettingsMembersTab from '~/components/settings/tabs/SettingsMembersTab.vue'
import SettingsBillingTab from '~/components/settings/tabs/SettingsBillingTab.vue'
import { useT } from '~/composables/useT'

const { t } = useT()
const page = usePage()

const props = defineProps<{
  user: {
    id: number
    email: string
    fullName: string | null
  }
  organization: {
    id: number
    name: string
  }
}>()

type SettingsSection = 'org' | 'members' | 'billing' | 'me'

const activeSection = ref<SettingsSection>('me')

const sections = [
  { key: 'me' as SettingsSection, label: t('settings.sections.me') },
  { key: 'org' as SettingsSection, label: t('settings.sections.org') },
  { key: 'members' as SettingsSection, label: t('settings.sections.members') },
  { key: 'billing' as SettingsSection, label: t('settings.sections.billing') },
]
</script>

<template>
  <div class="flex w-full max-w-7xl px-6 py-10 sm:px-8">
    <div class="flex w-full gap-8">
      <nav class="w-56 shrink-0">
        <BaseHeading level="2" class="mb-6">{{ t('settings.title') }}</BaseHeading>
        <ul class="space-y-1">
          <li v-for="section in sections" :key="section.key">
            <button
              type="button"
              :class="[
                'w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                activeSection === section.key
                  ? 'bg-brand/10 text-brand'
                  : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
              ]"
              @click="activeSection = section.key"
            >
              {{ section.label }}
            </button>
          </li>
        </ul>
      </nav>

      <div class="flex-1">
        <div
          v-if="page.props.flash?.success"
          class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {{ page.props.flash.success }}
        </div>
        <div
          v-if="page.props.flash?.error"
          class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {{ page.props.flash.error }}
        </div>

        <SettingsMeTab v-if="activeSection === 'me'" :user="props.user" />
        <SettingsOrgTab v-if="activeSection === 'org'" :organization="props.organization" />
        <SettingsMembersTab v-if="activeSection === 'members'" :user="props.user" />
        <SettingsBillingTab v-if="activeSection === 'billing'" />
      </div>
    </div>
  </div>
</template>
