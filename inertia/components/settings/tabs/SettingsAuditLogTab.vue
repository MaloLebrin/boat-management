<script setup lang="ts">
import { ref, computed } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseEmptyState from '~/components/base/BaseEmptyState.vue'
import BasePagination from '~/components/base/BasePagination.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import type { AuditLogPage, AuditLogFilters, AuditAction } from '../../../../shared/types/audit_log'

const { t } = useT()

const props = defineProps<{
  auditLog: AuditLogPage
  filters: AuditLogFilters
  members: { id: number; fullName: string | null; email: string }[]
}>()

const selectedUserId = ref(props.filters.userId ? String(props.filters.userId) : '')
const selectedAction = ref(props.filters.action ?? '')

const userOptions = computed(() => [
  { label: t('settings.auditLog.filters.allUsers'), value: '' },
  ...props.members.map((m) => ({
    label: m.fullName ?? m.email,
    value: String(m.id),
  })),
])

const actionOptions = computed(() => [
  { label: t('settings.auditLog.filters.allActions'), value: '' },
  { label: t('settings.auditLog.actions.login'), value: 'login' },
  { label: t('settings.auditLog.actions.logout'), value: 'logout' },
  { label: t('settings.auditLog.actions.boat_create'), value: 'boat.create' },
  { label: t('settings.auditLog.actions.boat_update'), value: 'boat.update' },
  { label: t('settings.auditLog.actions.boat_delete'), value: 'boat.delete' },
  { label: t('settings.auditLog.actions.member_add'), value: 'member.add' },
  { label: t('settings.auditLog.actions.member_remove'), value: 'member.remove' },
  { label: t('settings.auditLog.actions.member_update_role'), value: 'member.update_role' },
])

function applyFilters() {
  const query: Record<string, string> = {}
  if (selectedUserId.value) query.userId = selectedUserId.value
  if (selectedAction.value) query.action = selectedAction.value
  router.get('/settings/audit-log', query, { preserveScroll: true })
}

function onUserChange(value: string) {
  selectedUserId.value = value
  applyFilters()
}

function onActionChange(value: string) {
  selectedAction.value = value
  applyFilters()
}

function onPageChange(page: number) {
  const query: Record<string, string> = { page: String(page) }
  if (selectedUserId.value) query.userId = selectedUserId.value
  if (selectedAction.value) query.action = selectedAction.value
  router.get('/settings/audit-log', query, { preserveScroll: true })
}

function actionLabel(action: AuditAction): string {
  const key = action.replaceAll('.', '_')
  return t(`settings.auditLog.actions.${key}`)
}

function actionVariant(action: AuditAction): 'neutral' | 'success' | 'warning' | 'info' {
  if (action === 'login') return 'success'
  if (action === 'logout') return 'neutral'
  if (action.endsWith('.delete') || action.endsWith('.remove')) return 'warning'
  if (action.endsWith('.create') || action.endsWith('.add')) return 'info'
  return 'neutral'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-2">{{ t('settings.auditLog.title') }}</BaseHeading>
    <p class="text-fg-muted mb-6 text-sm">{{ t('settings.auditLog.description') }}</p>

    <BaseCard class="mb-4">
      <div class="flex flex-wrap gap-4">
        <div class="w-48">
          <BaseSelect
            name="userId"
            :label="t('settings.auditLog.filters.user')"
            :model-value="selectedUserId"
            :options="userOptions"
            @update:model-value="onUserChange"
          />
        </div>
        <div class="w-52">
          <BaseSelect
            name="action"
            :label="t('settings.auditLog.filters.action')"
            :model-value="selectedAction"
            :options="actionOptions"
            @update:model-value="onActionChange"
          />
        </div>
      </div>
    </BaseCard>

    <BaseEmptyState
      v-if="auditLog.data.length === 0"
      :title="t('settings.auditLog.empty.title')"
      :description="t('settings.auditLog.empty.description')"
    />

    <template v-else>
      <BaseCard class="mb-4 overflow-x-auto p-0">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.auditLog.columns.date') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.auditLog.columns.user') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.auditLog.columns.action') }}
              </th>
              <th class="px-4 py-3 text-left font-medium text-fg-muted">
                {{ t('settings.auditLog.columns.details') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in auditLog.data"
              :key="entry.id"
              class="border-b border-border last:border-0 hover:bg-surface-muted"
            >
              <td class="px-4 py-3 text-fg-muted whitespace-nowrap">
                {{ formatDate(entry.createdAt) }}
              </td>
              <td class="px-4 py-3">
                <div class="font-medium">
                  {{ entry.userFullName ?? t('settings.auditLog.unknownUser') }}
                </div>
                <div v-if="entry.userEmail" class="text-xs text-fg-muted">
                  {{ entry.userEmail }}
                </div>
              </td>
              <td class="px-4 py-3">
                <BaseBadge :variant="actionVariant(entry.action)">
                  {{ actionLabel(entry.action) }}
                </BaseBadge>
              </td>
              <td class="px-4 py-3 text-fg-muted">
                <span v-if="entry.metadata?.name">{{ entry.metadata.name }}</span>
                <span v-else-if="entry.metadata?.email">{{ entry.metadata.email }}</span>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>

      <BasePagination
        v-if="auditLog.meta.lastPage > 1"
        :page="auditLog.meta.currentPage"
        :page-count="auditLog.meta.lastPage"
        @update:page="onPageChange"
      />
    </template>
  </div>
</template>
