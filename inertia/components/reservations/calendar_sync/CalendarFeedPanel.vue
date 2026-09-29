<script setup lang="ts">
import { ref, watch } from 'vue'
import { router, useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import type { CalendarFeedRow } from '#shared/types/calendar_sync'

/**
 * Flux iCal exporté (#880), pour un bateau ou pour la flotte : adresse à
 * copier, contenu (nom du client, entretiens), régénération et révocation.
 * `endpoint` est la route du flux (`/boats/:id/calendar-feed` ou
 * `/reservations/calendar-feed`).
 */
const props = defineProps<{
  feed: CalendarFeedRow | null
  endpoint: string
  canManage: boolean
}>()

const { t } = useT()

const form = useForm({
  includeClientName: props.feed?.includeClientName ?? false,
  includeMaintenance: props.feed?.includeMaintenance ?? false,
})

watch(
  () => props.feed,
  (feed) => {
    form.includeClientName = feed?.includeClientName ?? false
    form.includeMaintenance = feed?.includeMaintenance ?? false
  }
)

const copied = ref(false)
const confirming = ref<'regenerate' | 'revoke' | null>(null)

async function copy() {
  if (!props.feed) return
  try {
    await navigator.clipboard.writeText(props.feed.url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Presse-papiers refusé : l'adresse reste sélectionnable dans le champ.
  }
}

function create() {
  form.post(props.endpoint, { preserveScroll: true })
}

function save() {
  form.patch(props.endpoint, { preserveScroll: true })
}

function onConfirm() {
  if (confirming.value === 'regenerate') create()
  if (confirming.value === 'revoke') router.delete(props.endpoint, { preserveScroll: true })
}
</script>

<template>
  <div data-testid="calendar-feed-panel">
    <p class="text-sm font-semibold text-fg">{{ t('reservations.calendarSync.export.title') }}</p>

    <div v-if="feed" class="mt-3 space-y-2">
      <div class="flex flex-wrap items-end gap-2">
        <BaseInput id="calendar-feed-url" class="min-w-0 flex-1" :model-value="feed.url" readonly />
        <BaseButton size="sm" variant="secondary" type="button" @click="copy">
          {{
            copied
              ? t('reservations.calendarSync.export.copied')
              : t('reservations.calendarSync.export.copy')
          }}
        </BaseButton>
        <!-- `webcal://` ouvre l'agenda du système : une ancre, pas une visite Inertia. -->
        <BaseButton size="sm" variant="ghost" :href="feed.webcalUrl" external-href>
          {{ t('reservations.calendarSync.export.subscribe') }}
        </BaseButton>
      </div>
      <p class="text-xs text-fg-muted">{{ t('reservations.calendarSync.export.secretHint') }}</p>
    </div>
    <p v-else class="mt-2 text-sm text-fg-muted">
      {{ t('reservations.calendarSync.export.empty') }}
    </p>

    <div v-if="canManage" class="mt-3 space-y-3">
      <BaseCheckbox
        id="calendar-feed-client-name"
        v-model="form.includeClientName"
        :label="t('reservations.calendarSync.export.includeClientName')"
        :hint="t('reservations.calendarSync.export.includeClientNameHint')"
      />
      <BaseCheckbox
        id="calendar-feed-maintenance"
        v-model="form.includeMaintenance"
        :label="t('reservations.calendarSync.export.includeMaintenance')"
      />
      <div v-if="feed" class="flex flex-wrap gap-2">
        <BaseButton
          size="sm"
          type="button"
          :disabled="form.processing || !form.isDirty"
          data-testid="calendar-feed-save"
          @click="save"
        >
          {{ t('reservations.calendarSync.export.save') }}
        </BaseButton>
        <BaseButton size="sm" variant="secondary" type="button" @click="confirming = 'regenerate'">
          {{ t('reservations.calendarSync.export.regenerate') }}
        </BaseButton>
        <BaseButton size="sm" variant="ghost" type="button" @click="confirming = 'revoke'">
          {{ t('reservations.calendarSync.export.revoke') }}
        </BaseButton>
      </div>
      <BaseButton
        v-else
        size="sm"
        type="button"
        :disabled="form.processing"
        data-testid="calendar-feed-create"
        @click="create"
      >
        {{ t('reservations.calendarSync.export.create') }}
      </BaseButton>
    </div>

    <BaseConfirmModal
      :open="confirming !== null"
      :title="
        confirming === 'revoke'
          ? t('reservations.calendarSync.export.revoke')
          : t('reservations.calendarSync.export.regenerate')
      "
      :message="
        confirming === 'revoke'
          ? t('reservations.calendarSync.export.revokeConfirm')
          : t('reservations.calendarSync.export.regenerateConfirm')
      "
      @update:open="(open: boolean) => !open && (confirming = null)"
      @confirm="onConfirm"
    />
  </div>
</template>
