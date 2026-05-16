<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
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
      <!-- Sidebar navigation -->
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

      <!-- Main content -->
      <div class="flex-1">
        <!-- Flash messages -->
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

        <!-- My Profile -->
        <div v-if="activeSection === 'me'">
          <BaseHeading level="2" class="mb-6">{{ t('settings.me.title') }}</BaseHeading>
          <Form method="PUT" action="/settings/profile" #default="{ processing, errors }">
            <BaseCard>
              <div class="space-y-6">
                <BaseInput
                  name="fullName"
                  :label="t('settings.me.fullNameLabel')"
                  :model-value="user.fullName ?? ''"
                  :placeholder="t('settings.me.fullNamePlaceholder')"
                  :errors="errors"
                />
                <BaseInput
                  :label="t('settings.me.emailLabel')"
                  :model-value="user.email"
                  disabled
                  readonly
                />
                <p class="text-xs text-fg-muted">{{ t('settings.me.emailHint') }}</p>
              </div>
              <template #footer>
                <div class="flex justify-end">
                  <BaseButton type="submit" variant="primary" :disabled="processing">
                    {{ t('settings.me.save') }}
                  </BaseButton>
                </div>
              </template>
            </BaseCard>
          </Form>
        </div>

        <!-- Organisation Profile -->
        <div v-if="activeSection === 'org'">
          <BaseHeading level="2" class="mb-6">{{ t('settings.org.title') }}</BaseHeading>
          <Form method="PUT" action="/settings/org" #default="{ processing, errors }">
            <BaseCard>
              <div class="space-y-6">
                <BaseInput
                  name="name"
                  :label="t('settings.org.nameLabel')"
                  :model-value="organization.name"
                  :placeholder="t('settings.org.namePlaceholder')"
                  :errors="errors"
                />
              </div>
              <template #footer>
                <div class="flex justify-end">
                  <BaseButton type="submit" variant="primary" :disabled="processing">
                    {{ t('settings.org.save') }}
                  </BaseButton>
                </div>
              </template>
            </BaseCard>
          </Form>
        </div>

        <!-- Members -->
        <div v-if="activeSection === 'members'">
          <div class="mb-6 flex items-center justify-between">
            <BaseHeading level="2">{{ t('settings.members.title') }}</BaseHeading>
            <BaseButton variant="primary" size="sm" disabled>
              {{ t('settings.members.invite') }}
            </BaseButton>
          </div>
          <BaseCard :padded="false">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {{ t('settings.members.columns.member') }}
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {{ t('settings.members.columns.role') }}
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {{ t('settings.members.columns.status') }}
                  </th>
                  <th class="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border last:border-b-0">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
                        {{ user.fullName?.charAt(0)?.toUpperCase() ?? user.email.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <p class="text-sm font-medium text-fg">{{ user.fullName ?? t('settings.members.noName') }}</p>
                        <p class="text-xs text-fg-muted">{{ user.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center rounded-full bg-brand/10 px-2 py-1 text-xs font-medium text-brand">
                      {{ t('settings.members.roles.admin') }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      {{ t('settings.members.statuses.active') }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-xs text-fg-muted">{{ t('settings.members.you') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </BaseCard>
        </div>

        <!-- Billing -->
        <div v-if="activeSection === 'billing'">
          <BaseHeading level="2" class="mb-6">{{ t('settings.billing.title') }}</BaseHeading>
          <div class="space-y-6">
            <BaseCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-semibold text-fg">{{ t('settings.billing.currentPlan') }}</span>
                  <span class="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
                    {{ t('settings.billing.freePlan') }}
                  </span>
                </div>
              </template>
              <div class="space-y-4">
                <p class="text-sm text-fg-muted">{{ t('settings.billing.freeDescription') }}</p>
                <ul class="space-y-2 text-sm text-fg-muted">
                  <li class="flex items-center gap-2">
                    <span class="text-green-600">&#10003;</span>
                    {{ t('settings.billing.features.upTo3Boats') }}
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-green-600">&#10003;</span>
                    {{ t('settings.billing.features.maintenanceHistory') }}
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-fg-muted">&#10007;</span>
                    {{ t('settings.billing.features.aiSuggestions') }}
                  </li>
                </ul>
              </div>
              <template #footer>
                <BaseButton variant="primary" disabled>
                  {{ t('settings.billing.upgradePro') }}
                </BaseButton>
              </template>
            </BaseCard>

            <BaseCard>
              <template #header>
                <span class="text-sm font-semibold text-fg">{{ t('settings.billing.paymentMethod') }}</span>
              </template>
              <p class="text-sm text-fg-muted">{{ t('settings.billing.noPaymentMethod') }}</p>
              <template #footer>
                <BaseButton variant="secondary" size="sm" disabled>
                  {{ t('settings.billing.addCard') }}
                </BaseButton>
              </template>
            </BaseCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
