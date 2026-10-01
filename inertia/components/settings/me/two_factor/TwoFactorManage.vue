<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

/**
 * 2FA active (#884) : codes de secours restants, régénération (second facteur
 * exigé) et désactivation (mot de passe **et** second facteur).
 */
defineProps<{ recoveryCodesRemaining: number }>()

const { t } = useT()
</script>

<template>
  <div class="space-y-4">
    <Form
      :action="{ url: '/settings/two-factor/recovery-codes', method: 'post' }"
      :options="{ preserveScroll: true }"
      reset-on-success
      reset-on-error
      #default="{ processing, errors }"
    >
      <BaseCard>
        <p class="text-sm text-fg" data-testid="two-factor-remaining">
          {{
            t('settings.security.twoFactor.manage.remaining', {
              count: String(recoveryCodesRemaining),
            })
          }}
        </p>
        <p class="mt-1 text-sm text-fg-muted">
          {{ t('settings.security.twoFactor.manage.regenerateHint') }}
        </p>
        <div class="mt-4">
          <BaseInput
            name="code"
            autocomplete="one-time-code"
            :label="t('settings.security.twoFactor.manage.codeLabel')"
            :errors="errors"
          />
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="secondary" :disabled="processing">
              {{ t('settings.security.twoFactor.manage.regenerate') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>

    <Form
      :action="{ url: '/settings/two-factor', method: 'delete' }"
      :options="{ preserveScroll: true }"
      reset-on-success
      reset-on-error
      #default="{ processing, errors }"
    >
      <BaseCard>
        <p class="text-sm font-semibold text-fg">
          {{ t('settings.security.twoFactor.manage.disableTitle') }}
        </p>
        <p class="mt-1 text-sm text-fg-muted">
          {{ t('settings.security.twoFactor.manage.disableHint') }}
        </p>
        <div class="mt-4 space-y-4">
          <BaseInput
            name="password"
            type="password"
            autocomplete="current-password"
            :label="t('settings.security.twoFactor.manage.passwordLabel')"
            :errors="errors"
          />
          <BaseInput
            name="code"
            autocomplete="one-time-code"
            :label="t('settings.security.twoFactor.manage.codeLabel')"
            :errors="errors"
          />
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="danger" :disabled="processing">
              {{ t('settings.security.twoFactor.manage.disable') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
  </div>
</template>
