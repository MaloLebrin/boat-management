<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { router } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import type { TwoFactorSetupData } from '#shared/types/two_factor'

/** Étape d'activation (#884) : scanner le QR code, saisir un premier code. */
defineProps<{ setup: TwoFactorSetupData }>()

const { t } = useT()

function cancel() {
  router.delete('/settings/two-factor/setup', { preserveScroll: true })
}
</script>

<template>
  <Form
    :action="{ url: '/settings/two-factor/confirm', method: 'post' }"
    :options="{ preserveScroll: true }"
    reset-on-error
    #default="{ processing, errors }"
  >
    <BaseCard>
      <ol class="space-y-6 text-sm text-fg">
        <li>
          <p class="font-semibold">{{ t('settings.security.twoFactor.setup.scanTitle') }}</p>
          <p class="mt-1 text-fg-muted">{{ t('settings.security.twoFactor.setup.scanHint') }}</p>
          <!-- QR code rendu côté serveur (SVG en data-URI) : fond blanc requis
               pour la lecture, dans les deux thèmes. -->
          <img
            :src="setup.qrCodeDataUri"
            :alt="t('settings.security.twoFactor.setup.qrAlt')"
            width="192"
            height="192"
            class="mt-3 h-48 w-48 rounded-lg border border-border bg-surface p-2"
            data-testid="two-factor-qr"
          />
          <p class="mt-3 text-fg-muted">{{ t('settings.security.twoFactor.setup.manualHint') }}</p>
          <code
            class="mt-1 inline-block break-all rounded bg-surface-muted px-2 py-1 font-mono text-xs text-fg"
            data-testid="two-factor-secret"
            >{{ setup.secret }}</code
          >
        </li>
        <li>
          <BaseInput
            name="code"
            autocomplete="one-time-code"
            inputmode="numeric"
            :label="t('settings.security.twoFactor.setup.codeLabel')"
            :hint="t('settings.security.twoFactor.setup.codeHint')"
            :errors="errors"
          />
        </li>
      </ol>
      <template #footer>
        <div class="flex justify-end gap-2">
          <BaseButton type="button" variant="ghost" @click="cancel">
            {{ t('settings.security.twoFactor.setup.cancel') }}
          </BaseButton>
          <BaseButton type="submit" variant="primary" :disabled="processing">
            {{ t('settings.security.twoFactor.setup.confirm') }}
          </BaseButton>
        </div>
      </template>
    </BaseCard>
  </Form>
</template>
