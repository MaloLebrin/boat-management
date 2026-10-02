<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { ref } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import { getFieldError } from '~/utils/form_errors'

/**
 * « Supprimer mon compte » (#886) : mot de passe + confirmation. Bloqué tant
 * que l'utilisateur est le dernier admin d'une organisation active.
 */
defineProps<{ lastAdminOf: string[]; graceDays: number }>()

const { t } = useT()
const confirmed = ref(false)
</script>

<template>
  <section>
    <BaseHeading level="2" class="mb-2 text-danger">
      {{ t('settings.danger.deleteAccount.title') }}
    </BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">
      {{ t('settings.danger.deleteAccount.subtitle', { days: String(graceDays) }) }}
    </p>
    <BaseAlert v-if="lastAdminOf.length > 0" variant="warning" data-testid="delete-account-blocked">
      {{ t('settings.danger.deleteAccount.blocked', { organizations: lastAdminOf.join(', ') }) }}
    </BaseAlert>
    <Form
      v-else
      :action="{ url: '/settings/me', method: 'delete' }"
      reset-on-error
      #default="{ processing, errors }"
    >
      <BaseCard>
        <div class="space-y-6">
          <BaseInput
            name="password"
            type="password"
            autocomplete="current-password"
            :label="t('settings.danger.deleteAccount.passwordLabel')"
            :errors="errors"
          />
          <BaseCheckbox
            id="delete-account-confirm"
            v-model="confirmed"
            name="confirm"
            :error="getFieldError(errors, 'confirm')"
          >
            {{ t('settings.danger.deleteAccount.confirmLabel', { days: String(graceDays) }) }}
          </BaseCheckbox>
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton
              type="submit"
              variant="danger"
              :disabled="processing || !confirmed"
              data-testid="delete-account-submit"
            >
              {{ t('settings.danger.deleteAccount.action') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
  </section>
</template>
