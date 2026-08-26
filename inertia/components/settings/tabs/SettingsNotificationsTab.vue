<script setup lang="ts">
import { router, usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import IosInstallHint from '~/components/pwa/IosInstallHint.vue'
import { usePushNotifications } from '~/composables/use_push_notifications'
import { isIos, isStandalone } from '~/composables/use_pwa_install'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { PushSubscriptionRow } from '../../../../shared/types/push'

/** Gestion permanente du Web Push : cet appareil + liste des appareils (#498). */
const props = defineProps<{
  pushSubscriptions: PushSubscriptionRow[]
}>()

const { t } = useT()
const page = usePage()
const { formatDateTime } = useDateFormat()
const { isSupported, permission, isSubscribed, isBusy, subscribe, unsubscribe } =
  usePushNotifications()

const pushConfigured = computed(() => Boolean(page.props.vapidPublicKey))
const needsIosInstall = computed(() => isIos() && !isStandalone())

async function enableThisDevice() {
  const ok = await subscribe()
  if (ok) {
    // Recharge la liste des appareils (le POST vient d'en créer un)
    router.reload({ only: ['pushSubscriptions'] })
  }
}

async function disableThisDevice() {
  await unsubscribe()
  router.reload({ only: ['pushSubscriptions'] })
}

function removeDevice(id: number) {
  router.delete(`/push/subscriptions/${id}`, { preserveScroll: true })
}

function deviceLabel(subscription: PushSubscriptionRow): string {
  return subscription.userAgent ?? t('settings.notifications.devices.unknownDevice')
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <BaseHeading level="2">{{ t('settings.notifications.title') }}</BaseHeading>
      <p class="mt-2 text-sm text-fg-muted">{{ t('settings.notifications.subtitle') }}</p>
    </div>

    <!-- Push non configuré côté serveur -->
    <p v-if="!pushConfigured" class="text-sm text-fg-muted">
      {{ t('settings.notifications.notConfigured') }}
    </p>

    <template v-else>
      <!-- Cet appareil -->
      <section class="rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
        <p class="text-sm font-semibold text-fg">{{ t('settings.notifications.thisDevice') }}</p>

        <IosInstallHint v-if="needsIosInstall" />

        <p v-else-if="!isSupported" class="text-sm text-fg-muted">
          {{ t('settings.notifications.unsupported') }}
        </p>

        <p v-else-if="permission === 'denied'" class="text-sm text-fg-muted">
          {{ t('settings.notifications.permissionDenied') }}
        </p>

        <div v-else class="flex items-center gap-3">
          <BaseButton
            v-if="!isSubscribed"
            size="sm"
            variant="primary"
            type="button"
            :disabled="isBusy"
            @click="enableThisDevice"
          >
            {{ t('settings.notifications.enable') }}
          </BaseButton>
          <template v-else>
            <span class="text-sm text-success">{{ t('settings.notifications.enabled') }}</span>
            <BaseButton
              size="sm"
              variant="ghost"
              type="button"
              :disabled="isBusy"
              @click="disableThisDevice"
            >
              {{ t('settings.notifications.disable') }}
            </BaseButton>
          </template>
        </div>
      </section>

      <!-- Appareils abonnés -->
      <section class="space-y-3">
        <p class="text-sm font-semibold text-fg">
          {{ t('settings.notifications.devices.title') }}
        </p>

        <p v-if="props.pushSubscriptions.length === 0" class="text-sm text-fg-muted">
          {{ t('settings.notifications.devices.empty') }}
        </p>

        <ul v-else class="space-y-2">
          <li
            v-for="subscription in props.pushSubscriptions"
            :key="subscription.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-fg">{{ deviceLabel(subscription) }}</p>
              <p class="text-xs text-fg-muted">
                {{
                  t('settings.notifications.devices.added', {
                    date: formatDateTime(subscription.createdAt),
                  })
                }}
                <template v-if="subscription.lastUsedAt">
                  ·
                  {{
                    t('settings.notifications.devices.lastUsed', {
                      date: formatDateTime(subscription.lastUsedAt),
                    })
                  }}
                </template>
              </p>
            </div>
            <BaseButton
              variant="danger"
              size="sm"
              type="button"
              :aria-label="
                t('settings.notifications.devices.removeAriaLabel', {
                  device: deviceLabel(subscription),
                })
              "
              @click="removeDevice(subscription.id)"
            >
              {{ t('settings.notifications.devices.remove') }}
            </BaseButton>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
