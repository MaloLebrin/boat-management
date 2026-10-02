<script setup lang="ts">
import { computed } from 'vue'
import { useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import { useT } from '~/composables/use_t'
import { browserTimeZone } from '~/utils/local_datetime'
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_FAMILIES,
} from '../../../../shared/constants/notifications'
import type {
  NotificationChannel,
  NotificationPreferenceMatrix,
  NotificationPreferencesProps,
} from '../../../../shared/types/notification'

/**
 * Matrice familles × canaux des notifications (#888), « tout couper » par
 * canal, heures calmes du push et résumé quotidien des e-mails. Le fuseau du
 * navigateur part avec l'enregistrement : c'est lui qui règle 22h-7h et 8h.
 */
const props = defineProps<{ preferences: NotificationPreferencesProps }>()

const { t } = useT()

// Copie par famille : les props sont des proxys réactifs, `structuredClone`
// les refuse.
const families = Object.fromEntries(
  NOTIFICATION_FAMILIES.map((family) => [family, { ...props.preferences.families[family] }])
) as NotificationPreferenceMatrix

const form = useForm({
  families,
  quietHours: props.preferences.quietHours,
  emailDigest: props.preferences.emailDigest,
  timezone: props.preferences.timezone,
})

function columnOn(channel: NotificationChannel): boolean {
  return NOTIFICATION_FAMILIES.some((family) => form.families[family][channel])
}

function toggleColumn(channel: NotificationChannel) {
  const next = !columnOn(channel)
  for (const family of NOTIFICATION_FAMILIES) form.families[family][channel] = next
}

const emailUsed = computed(() => columnOn('email'))

function save() {
  form
    .transform((data) => ({ ...data, timezone: browserTimeZone() ?? data.timezone }))
    .put('/settings/notifications/preferences', { preserveScroll: true })
}
</script>

<template>
  <BaseCard data-testid="notification-preferences">
    <p class="text-sm font-semibold text-fg">{{ t('settings.notifications.preferences.title') }}</p>
    <p class="mt-1 text-sm text-fg-muted">
      {{ t('settings.notifications.preferences.description') }}
    </p>

    <form class="mt-4 space-y-5" @submit.prevent="save">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border">
              <th scope="col" class="py-2 pr-3 text-left font-medium text-fg-muted">
                {{ t('settings.notifications.preferences.family') }}
              </th>
              <th
                v-for="channel in NOTIFICATION_CHANNELS"
                :key="channel"
                scope="col"
                class="px-2 py-2 text-center font-medium text-fg"
              >
                <span class="block">{{ t(`settings.notifications.channels.${channel}`) }}</span>
                <button
                  type="button"
                  class="text-xs font-normal text-brand hover:underline"
                  :data-testid="`toggle-column-${channel}`"
                  @click="toggleColumn(channel)"
                >
                  {{
                    t(
                      columnOn(channel)
                        ? 'settings.notifications.preferences.muteAll'
                        : 'settings.notifications.preferences.enableAll'
                    )
                  }}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="family in NOTIFICATION_FAMILIES"
              :key="family"
              class="border-b border-border last:border-0"
              data-testid="preference-row"
            >
              <th scope="row" class="py-3 pr-3 text-left font-normal">
                <span class="block font-medium text-fg">
                  {{ t(`notifications.families.${family}.label`) }}
                </span>
                <span class="block text-xs text-fg-muted">
                  {{ t(`notifications.families.${family}.hint`) }}
                </span>
              </th>
              <td v-for="channel in NOTIFICATION_CHANNELS" :key="channel" class="px-2 py-3">
                <div class="flex justify-center">
                  <input
                    v-model="form.families[family][channel]"
                    type="checkbox"
                    :name="`${family}.${channel}`"
                    class="h-4 w-4 accent-brand"
                    :aria-label="
                      t('settings.notifications.preferences.cellLabel', {
                        family: t(`notifications.families.${family}.label`),
                        channel: t(`settings.notifications.channels.${channel}`),
                      })
                    "
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <BaseCheckbox id="notification-quiet-hours" v-model="form.quietHours" name="quietHours">
        {{ t('settings.notifications.preferences.quietHours') }}
      </BaseCheckbox>
      <BaseCheckbox
        id="notification-email-digest"
        v-model="form.emailDigest"
        name="emailDigest"
        :hint="emailUsed ? undefined : t('settings.notifications.preferences.digestNeedsEmail')"
      >
        {{ t('settings.notifications.preferences.emailDigest') }}
      </BaseCheckbox>
      <p class="text-xs text-fg-subtle">
        {{ t('settings.notifications.preferences.timezone', { timezone: preferences.timezone }) }}
      </p>

      <BaseButton type="submit" size="sm" :disabled="form.processing">
        {{ t('settings.notifications.preferences.save') }}
      </BaseButton>
    </form>
  </BaseCard>
</template>
