<script lang="ts">
import DefaultLayout from '~/layouts/default.vue'
export default { layout: DefaultLayout }
</script>

<script setup lang="ts">
import SettingsShell from '~/components/settings/SettingsShell.vue'
import SettingsAuditLogTab from '~/components/settings/tabs/SettingsAuditLogTab.vue'
import type { AuditLogPage, AuditLogFilters } from '../../../shared/types/audit_log'

defineProps<{
  auditLog: AuditLogPage
  filters: AuditLogFilters
  members: { id: number; fullName: string | null; email: string }[]
}>()
</script>

<template>
  <SettingsShell>
    <SettingsAuditLogTab :audit-log="auditLog" :filters="filters" :members="members" />
  </SettingsShell>
</template>
