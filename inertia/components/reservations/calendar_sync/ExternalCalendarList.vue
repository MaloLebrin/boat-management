<script setup lang="ts">
import { ref } from 'vue'
import { router, useForm } from '@inertiajs/vue3'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { ExternalCalendarRow } from '#shared/types/calendar_sync'

/**
 * Calendriers externes importés sur un bateau (#880) : état de la dernière
 * synchronisation, synchronisation à la demande, retrait, ajout d'un flux.
 */
const props = defineProps<{
  boatId: number
  calendars: ExternalCalendarRow[]
  canManage: boolean
}>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const form = useForm({ name: '', url: '' })
const removing = ref<ExternalCalendarRow | null>(null)
const syncingId = ref<number | null>(null)

const base = `/boats/${props.boatId}/external-calendars`

function add() {
  form.post(base, { preserveScroll: true, onSuccess: () => form.reset() })
}

function sync(calendar: ExternalCalendarRow) {
  syncingId.value = calendar.id
  router.post(
    `${base}/${calendar.id}/sync`,
    {},
    { preserveScroll: true, onFinish: () => (syncingId.value = null) }
  )
}

function remove() {
  if (!removing.value) return
  router.delete(`${base}/${removing.value.id}`, { preserveScroll: true })
}
</script>

<template>
  <div data-testid="external-calendar-list">
    <p class="text-sm font-semibold text-fg">{{ t('reservations.calendarSync.import.title') }}</p>
    <p class="mt-1 text-xs text-fg-muted">
      {{ t('reservations.calendarSync.import.readOnlyHint') }}
    </p>

    <p v-if="calendars.length === 0" class="mt-3 text-sm text-fg-muted">
      {{ t('reservations.calendarSync.import.empty') }}
    </p>
    <ul v-else class="mt-3 divide-y divide-border rounded-lg border border-border">
      <li
        v-for="calendar in calendars"
        :key="calendar.id"
        class="flex flex-wrap items-center justify-between gap-3 p-3"
        data-testid="external-calendar-row"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-fg">
            {{ calendar.name }}
            <span class="font-normal text-fg-muted">· {{ calendar.host }}</span>
          </p>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <span>
              {{
                calendar.lastSyncedAt
                  ? t('reservations.calendarSync.import.lastSynced', {
                      date: formatDateTime(calendar.lastSyncedAt),
                    })
                  : t('reservations.calendarSync.import.neverSynced')
              }}
            </span>
            <BaseBadge variant="neutral">
              {{
                t('reservations.calendarSync.import.events', { count: String(calendar.eventCount) })
              }}
            </BaseBadge>
            <BaseBadge v-if="calendar.conflictCount > 0" variant="warning">
              {{
                t('reservations.calendarSync.import.conflicts', {
                  count: String(calendar.conflictCount),
                })
              }}
            </BaseBadge>
            <BaseBadge
              v-if="calendar.lastError"
              variant="danger"
              data-testid="external-calendar-error"
            >
              {{ t(`reservations.calendarSync.errors.${calendar.lastError}`) }}
            </BaseBadge>
          </div>
        </div>
        <div v-if="canManage" class="flex shrink-0 gap-2">
          <BaseButton
            size="sm"
            variant="secondary"
            type="button"
            :disabled="syncingId === calendar.id"
            @click="sync(calendar)"
          >
            {{ t('reservations.calendarSync.import.sync') }}
          </BaseButton>
          <BaseButton size="sm" variant="ghost" type="button" @click="removing = calendar">
            {{ t('reservations.calendarSync.import.remove') }}
          </BaseButton>
        </div>
      </li>
    </ul>

    <form
      v-if="canManage"
      class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end"
      data-testid="external-calendar-form"
      @submit.prevent="add"
    >
      <BaseInput
        id="external-calendar-name"
        v-model="form.name"
        :label="t('reservations.calendarSync.import.name')"
        :placeholder="t('reservations.calendarSync.import.namePlaceholder')"
        :error="form.errors.name"
        required
      />
      <BaseInput
        id="external-calendar-url"
        v-model="form.url"
        type="url"
        :label="t('reservations.calendarSync.import.url')"
        :placeholder="t('reservations.calendarSync.import.urlPlaceholder')"
        :error="form.errors.url"
        required
      />
      <BaseButton type="submit" size="sm" :disabled="form.processing">
        {{ t('reservations.calendarSync.import.add') }}
      </BaseButton>
    </form>

    <BaseConfirmModal
      :open="removing !== null"
      :title="t('reservations.calendarSync.import.remove')"
      :message="t('reservations.calendarSync.import.removeConfirm')"
      @update:open="(open: boolean) => !open && (removing = null)"
      @confirm="remove"
    />
  </div>
</template>
