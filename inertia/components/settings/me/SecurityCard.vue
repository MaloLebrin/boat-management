<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'

const { t } = useT()
</script>

<template>
  <section>
    <BaseHeading level="2" class="mb-2">{{ t('settings.security.title') }}</BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">{{ t('settings.security.subtitle') }}</p>
    <Form
      :action="{ url: '/settings/password', method: 'put' }"
      reset-on-success
      #default="{ processing, errors }"
    >
      <BaseCard>
        <div class="space-y-6">
          <BaseInput
            name="currentPassword"
            type="password"
            autocomplete="current-password"
            :label="t('settings.security.currentPasswordLabel')"
            :errors="errors"
          />
          <BaseInput
            name="password"
            type="password"
            autocomplete="new-password"
            :label="t('settings.security.newPasswordLabel')"
            :hint="t('settings.security.newPasswordHint')"
            :errors="errors"
          />
          <BaseInput
            name="passwordConfirmation"
            type="password"
            autocomplete="new-password"
            :label="t('settings.security.confirmPasswordLabel')"
            :errors="errors"
          />
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" :disabled="processing">
              {{ t('settings.security.save') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
  </section>
</template>
