<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { router } from '@inertiajs/vue3'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import type { OrganizationDeletionProps } from '#shared/types/account'

/**
 * « Supprimer l'organisation » (#886), réservé à `organization.manage` :
 * mot de passe + saisie du nom. Pendant la période de grâce, la carte
 * propose d'annuler.
 */
defineProps<{ deletion: OrganizationDeletionProps; organizationName: string }>()

const { t } = useT()
const { formatDateLong } = useDateFormat()

function restore() {
  router.post('/settings/org/restore', {}, { preserveScroll: true })
}
</script>

<template>
  <section>
    <BaseHeading level="2" class="mb-2 text-danger">
      {{ t('settings.danger.deleteOrganization.title') }}
    </BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">
      {{ t('settings.danger.deleteOrganization.subtitle', { days: String(deletion.graceDays) }) }}
    </p>
    <BaseCard v-if="deletion.scheduledFor" data-testid="organization-deletion-scheduled">
      <BaseAlert variant="warning">
        {{
          t('settings.danger.deleteOrganization.scheduled', {
            date: formatDateLong(deletion.scheduledFor),
          })
        }}
      </BaseAlert>
      <template #footer>
        <div class="flex justify-end">
          <BaseButton type="button" variant="primary" @click="restore">
            {{ t('settings.danger.deleteOrganization.restore') }}
          </BaseButton>
        </div>
      </template>
    </BaseCard>
    <Form
      v-else
      :action="{ url: '/settings/org', method: 'delete' }"
      reset-on-error
      #default="{ processing, errors }"
    >
      <BaseCard>
        <div class="space-y-6">
          <p class="text-sm text-fg-muted">
            {{ t('settings.danger.deleteOrganization.exportHint') }}
          </p>
          <BaseInput
            name="organizationName"
            autocomplete="off"
            :label="t('settings.danger.deleteOrganization.nameLabel', { name: organizationName })"
            :errors="errors"
          />
          <BaseInput
            name="password"
            type="password"
            autocomplete="current-password"
            :label="t('settings.danger.deleteOrganization.passwordLabel')"
            :errors="errors"
          />
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton
              type="submit"
              variant="danger"
              :disabled="processing"
              data-testid="delete-organization-submit"
            >
              {{ t('settings.danger.deleteOrganization.action') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
  </section>
</template>
