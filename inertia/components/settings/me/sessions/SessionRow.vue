<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { UserSessionRow } from '#shared/types/user_session'

/** Une session de la liste « Appareils et sessions » (#885). */
const props = defineProps<{ session: UserSessionRow }>()
const emit = defineEmits<{ (e: 'revoke', session: UserSessionRow): void }>()

const { t } = useT()
const { formatDateTime } = useDateFormat()

const deviceLabel = computed(() =>
  t('settings.sessions.device', {
    browser: props.session.device.browser ?? t('settings.sessions.unknownBrowser'),
    os: props.session.device.os ?? t('settings.sessions.unknownOs'),
  })
)
</script>

<template>
  <li
    class="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3"
    data-testid="session-row"
  >
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <p class="truncate text-sm font-medium text-fg">{{ deviceLabel }}</p>
        <BaseBadge v-if="session.isCurrent" variant="success">
          {{ t('settings.sessions.current') }}
        </BaseBadge>
        <BaseBadge v-if="session.remembered" variant="empty">
          {{ t('settings.sessions.remembered') }}
        </BaseBadge>
      </div>
      <p class="text-xs text-fg-muted">
        {{ t('settings.sessions.lastSeen', { date: formatDateTime(session.lastSeenAt) }) }}
        ·
        {{ t('settings.sessions.openedAt', { date: formatDateTime(session.createdAt) }) }}
        <template v-if="session.ipAddress">
          · {{ t('settings.sessions.ip', { ip: session.ipAddress }) }}
        </template>
      </p>
    </div>
    <BaseButton
      v-if="!session.isCurrent"
      variant="danger"
      size="sm"
      type="button"
      :aria-label="t('settings.sessions.revokeFor', { device: deviceLabel })"
      @click="emit('revoke', session)"
    >
      {{ t('settings.sessions.revoke') }}
    </BaseButton>
  </li>
</template>
