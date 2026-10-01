<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import TwoFactorSetup from '~/components/settings/me/two_factor/TwoFactorSetup.vue'
import TwoFactorManage from '~/components/settings/me/two_factor/TwoFactorManage.vue'
import TwoFactorRecoveryCodes from '~/components/settings/me/two_factor/TwoFactorRecoveryCodes.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { TwoFactorSettingsProps } from '#shared/types/two_factor'

/**
 * Double authentification (#884) : activation, codes de secours, désactivation.
 * Les codes de secours en clair n'arrivent qu'une fois, juste après leur
 * génération.
 */
defineProps<{ twoFactor: TwoFactorSettingsProps }>()

const { t } = useT()
const { formatDateLong } = useDateFormat()

function startSetup() {
  router.post('/settings/two-factor', {}, { preserveScroll: true })
}
</script>

<template>
  <section id="two-factor" data-testid="two-factor-card">
    <div class="mb-2 flex items-center gap-3">
      <BaseHeading level="2">{{ t('settings.security.twoFactor.title') }}</BaseHeading>
      <BaseBadge :variant="twoFactor.enabled ? 'success' : 'empty'">
        {{
          t(
            twoFactor.enabled
              ? 'settings.security.twoFactor.statusOn'
              : 'settings.security.twoFactor.statusOff'
          )
        }}
      </BaseBadge>
    </div>
    <p class="mb-6 text-sm text-fg-muted">{{ t('settings.security.twoFactor.subtitle') }}</p>

    <BaseAlert
      v-if="twoFactor.requiredByOrganization && !twoFactor.enabled"
      variant="warning"
      class="mb-4"
      data-testid="two-factor-required"
    >
      {{
        twoFactor.graceEndsAt
          ? t('settings.security.twoFactor.requiredBy', {
              date: formatDateLong(twoFactor.graceEndsAt),
            })
          : t('settings.security.twoFactor.requiredNow')
      }}
    </BaseAlert>

    <TwoFactorRecoveryCodes
      v-if="twoFactor.recoveryCodes"
      :codes="twoFactor.recoveryCodes"
      class="mb-4"
    />

    <TwoFactorManage
      v-if="twoFactor.enabled"
      :recovery-codes-remaining="twoFactor.recoveryCodesRemaining"
    />
    <TwoFactorSetup v-else-if="twoFactor.pendingSetup" :setup="twoFactor.pendingSetup" />
    <BaseCard v-else>
      <p class="text-sm text-fg-muted">{{ t('settings.security.twoFactor.intro') }}</p>
      <template #footer>
        <div class="flex justify-end">
          <BaseButton
            type="button"
            variant="primary"
            data-testid="two-factor-start"
            @click="startSetup"
          >
            {{ t('settings.security.twoFactor.enable') }}
          </BaseButton>
        </div>
      </template>
    </BaseCard>
  </section>
</template>
