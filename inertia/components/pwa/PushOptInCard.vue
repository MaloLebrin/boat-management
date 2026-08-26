<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed, onMounted, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import IosInstallHint from '~/components/pwa/IosInstallHint.vue'
import { usePushNotifications } from '~/composables/use_push_notifications'
import { isIos, isStandalone } from '~/composables/use_pwa_install'
import { useT } from '~/composables/use_t'

/**
 * Opt-in contextuel Web Push (#498). Jamais de prompt à froid : la carte
 * n'apparaît qu'à partir de la 2e session (signal d'engagement, compteur en
 * localStorage), et `subscribe()` n'est appelé que depuis le clic sur le
 * bouton — exigence navigateur (geste utilisateur).
 */
const DISMISS_KEY = 'fleetai:push-opt-in-dismissed'
const SESSION_COUNT_KEY = 'fleetai:session-count'
const SESSION_MARK_KEY = 'fleetai:session-counted'
const MIN_SESSIONS = 2

const { t } = useT()
const page = usePage()
const { isSupported, permission, isSubscribed, isBusy, subscribe } = usePushNotifications()

const dismissed = ref(true)
const engaged = ref(false)

// iOS hors PWA installée : Web Push impossible — on montre l'entonnoir
// d'installation à la place du bouton d'activation
const needsIosInstall = computed(() => isIos() && !isStandalone())

onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(DISMISS_KEY) === '1'
    // Une session navigateur = un incrément (marqueur en sessionStorage)
    let count = Number(localStorage.getItem(SESSION_COUNT_KEY) ?? '0')
    if (!sessionStorage.getItem(SESSION_MARK_KEY)) {
      sessionStorage.setItem(SESSION_MARK_KEY, '1')
      count += 1
      localStorage.setItem(SESSION_COUNT_KEY, String(count))
    }
    engaged.value = count >= MIN_SESSIONS
  } catch {
    // localStorage indisponible (navigation privée stricte) : pas de carte
  }
})

const visible = computed(
  () =>
    engaged.value &&
    !dismissed.value &&
    Boolean(page.props.vapidPublicKey) &&
    permission.value !== 'denied' &&
    !isSubscribed.value &&
    (isSupported || needsIosInstall.value)
)

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // au pire la carte réapparaîtra à la prochaine session
  }
}

async function enable() {
  const ok = await subscribe()
  if (ok) dismissed.value = true
}
</script>

<template>
  <div
    v-if="visible"
    class="mx-6 mt-4 rounded-lg border border-border bg-surface-elevated p-4 space-y-3"
  >
    <div>
      <p class="text-sm font-semibold text-fg">{{ t('common.push.optIn.title') }}</p>
      <p class="mt-1 text-sm text-fg-muted">{{ t('common.push.optIn.description') }}</p>
    </div>

    <IosInstallHint v-if="needsIosInstall" />

    <div class="flex items-center gap-2">
      <BaseButton
        v-if="!needsIosInstall"
        size="sm"
        variant="primary"
        type="button"
        :disabled="isBusy"
        @click="enable"
      >
        {{ t('common.push.optIn.enable') }}
      </BaseButton>
      <BaseButton size="sm" variant="ghost" type="button" @click="dismiss">
        {{ t('common.push.optIn.later') }}
      </BaseButton>
    </div>
  </div>
</template>
