<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/useT'

const { t } = useT()

defineProps<{
  user: {
    id: number
    email: string
    fullName: string | null
  }
}>()
</script>

<template>
  <div>
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
</template>
