<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseToggle from '~/components/base/BaseToggle.vue'
import SessionRow from '~/components/settings/me/sessions/SessionRow.vue'
import { useT } from '~/composables/use_t'
import type { UserSessionRow, UserSessionsSettingsProps } from '#shared/types/user_session'

/**
 * Appareils et sessions connectés (#885) : liste, déconnexion d'une session,
 * « déconnecter partout sauf ici », remember-me orphelins et alerte e-mail.
 */
const props = defineProps<{ sessions: UserSessionsSettingsProps }>()

const { t } = useT()

const pendingRevoke = ref<UserSessionRow | null>(null)
const confirmOthersOpen = ref(false)
const hasOtherSessions = computed(() => props.sessions.sessions.some((s) => !s.isCurrent))

const revokeModalOpen = computed({
  get: () => pendingRevoke.value !== null,
  set: (open: boolean) => {
    if (!open) pendingRevoke.value = null
  },
})

function revoke() {
  if (!pendingRevoke.value) return
  router.delete(`/settings/sessions/${pendingRevoke.value.id}`, { preserveScroll: true })
}

function revokeOthers() {
  router.delete('/settings/sessions/others', { preserveScroll: true })
}

function revokeOrphans() {
  router.delete('/settings/sessions/remembered', { preserveScroll: true })
}

function setNotify(enabled: boolean) {
  router.put('/settings/sessions/notifications', { enabled }, { preserveScroll: true })
}
</script>

<template>
  <section id="sessions" data-testid="sessions-card">
    <BaseHeading level="2" class="mb-2">{{ t('settings.sessions.title') }}</BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">{{ t('settings.sessions.subtitle') }}</p>

    <BaseCard>
      <div class="space-y-4">
        <ul class="space-y-2">
          <SessionRow
            v-for="session in props.sessions.sessions"
            :key="session.id"
            :session="session"
            @revoke="pendingRevoke = $event"
          />
        </ul>
        <p v-if="!hasOtherSessions" class="text-sm text-fg-muted">
          {{ t('settings.sessions.empty') }}
        </p>

        <div
          v-if="props.sessions.orphanRememberedCount > 0"
          class="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted"
          data-testid="sessions-orphans"
        >
          <span>
            {{
              t('settings.sessions.orphanRemembered', {
                count: String(props.sessions.orphanRememberedCount),
              })
            }}
          </span>
          <BaseButton size="sm" variant="secondary" type="button" @click="revokeOrphans">
            {{ t('settings.sessions.revokeOrphans') }}
          </BaseButton>
        </div>

        <BaseToggle :model-value="props.sessions.notifyNewLogin" @update:model-value="setNotify">
          {{ t('settings.sessions.notifyNewLogin') }}
        </BaseToggle>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <BaseButton
            variant="danger"
            type="button"
            data-testid="sessions-revoke-others"
            @click="confirmOthersOpen = true"
          >
            {{ t('settings.sessions.revokeOthers') }}
          </BaseButton>
        </div>
      </template>
    </BaseCard>

    <BaseConfirmModal
      v-model:open="revokeModalOpen"
      :title="t('settings.sessions.revoke')"
      :message="t('settings.sessions.revokeConfirm')"
      :confirm-label="t('settings.sessions.revoke')"
      @confirm="revoke"
    />
    <BaseConfirmModal
      v-model:open="confirmOthersOpen"
      :title="t('settings.sessions.revokeOthers')"
      :message="t('settings.sessions.revokeOthersConfirm')"
      :confirm-label="t('settings.sessions.revokeOthers')"
      @confirm="revokeOthers"
    />
  </section>
</template>
