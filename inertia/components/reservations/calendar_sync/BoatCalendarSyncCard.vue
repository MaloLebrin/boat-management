<script setup lang="ts">
import BaseCard from '~/components/base/BaseCard.vue'
import CalendarFeedPanel from '~/components/reservations/calendar_sync/CalendarFeedPanel.vue'
import ExternalCalendarList from '~/components/reservations/calendar_sync/ExternalCalendarList.vue'
import { useT } from '~/composables/use_t'
import type { BoatCalendarSyncProps } from '#shared/types/calendar_sync'

/** Encart « Synchroniser avec un calendrier externe » d'un bateau (#880). */
defineProps<{
  boatId: number
  sync: BoatCalendarSyncProps
}>()

const { t } = useT()
</script>

<template>
  <BaseCard data-testid="boat-calendar-sync">
    <p class="text-base font-semibold text-fg">{{ t('reservations.calendarSync.title') }}</p>
    <p class="mt-1 text-sm text-fg-muted">{{ t('reservations.calendarSync.intro') }}</p>

    <div class="mt-5 grid gap-6 lg:grid-cols-2">
      <CalendarFeedPanel
        :feed="sync.feed"
        :endpoint="`/boats/${boatId}/calendar-feed`"
        :can-manage="sync.canManage"
      />
      <ExternalCalendarList
        :boat-id="boatId"
        :calendars="sync.externalCalendars"
        :can-manage="sync.canManage"
      />
    </div>
  </BaseCard>
</template>
