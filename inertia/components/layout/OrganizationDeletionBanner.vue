<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import type { Data } from '@generated/data'
import { useDateFormat } from '~/composables/use_date_format'
import { usePermissions } from '~/composables/use_permissions'
import { useT } from '~/composables/use_t'

/**
 * Suppression programmée de l'organisation (#886) : rappelée à tous ses
 * membres pendant la période de grâce. Le lien d'annulation n'est proposé
 * qu'à `organization.manage`.
 */
const page = usePage<Data.SharedProps>()
const { t } = useT()
const { formatDateLong } = useDateFormat()
const { can } = usePermissions()

const scheduledFor = computed(() => page.props.organizationDeletionScheduledFor)
</script>

<template>
  <div
    v-if="scheduledFor"
    role="status"
    class="flex items-center justify-between gap-4 bg-coral-100 px-4 py-2 text-sm font-medium text-coral-800"
    data-testid="organization-deletion-banner"
  >
    <span>{{ t('settings.danger.banner.text', { date: formatDateLong(scheduledFor) }) }}</span>
    <Link
      v-if="can('organization.manage')"
      href="/settings/org"
      class="shrink-0 font-semibold underline underline-offset-2"
    >
      {{ t('settings.danger.banner.action') }}
    </Link>
  </div>
</template>
