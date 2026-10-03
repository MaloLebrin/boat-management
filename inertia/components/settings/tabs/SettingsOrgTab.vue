<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useNumberFormat } from '~/composables/use_number_format'
import { useT } from '~/composables/use_t'
import { usePermissions } from '~/composables/use_permissions'
import TwoFactorPolicyCard from '~/components/settings/org/TwoFactorPolicyCard.vue'
import DeleteOrganizationCard from '~/components/settings/org/DeleteOrganizationCard.vue'
import type { OrganizationTwoFactorPolicy } from '#shared/types/two_factor'
import type { OrganizationDeletionProps } from '#shared/types/account'
import type { OrganizationSettingsData } from '#shared/types/organization'

const { t } = useT()
const { can } = usePermissions()
const { currencyOptions } = useNumberFormat()

defineProps<{
  organization: OrganizationSettingsData
  twoFactorPolicy: OrganizationTwoFactorPolicy
  deletion: OrganizationDeletionProps
}>()

// #761 — l'onglet s'ouvre à `members.view` (cf. `SettingsShell`), le renommage
// est réservé à `organization.manage`. Sans cette distinction, un member voyait
// un formulaire que le backend refuse désormais : `PUT /settings/org` passe par
// `OrganizationPolicy.manageOrganization`.
const canManage = can('organization.manage')
</script>

<template>
  <div>
    <BaseHeading level="2" class="mb-6">{{ t('settings.org.title') }}</BaseHeading>
    <Form
      v-if="canManage"
      :action="{ url: '/settings/org', method: 'put' }"
      #default="{ processing, errors }"
    >
      <BaseCard>
        <div class="space-y-6">
          <BaseInput
            name="name"
            :label="t('settings.org.nameLabel')"
            :model-value="organization.name"
            :placeholder="t('settings.org.namePlaceholder')"
            :errors="errors"
          />
          <BaseSelect
            name="currency"
            :label="t('settings.org.currencyLabel')"
            :hint="t('settings.org.currencyHint')"
            :model-value="organization.currency"
            :options="currencyOptions"
            :errors="errors"
          />
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" :disabled="processing">
              {{ t('settings.org.save') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
    <BaseCard v-else>
      <div class="space-y-6">
        <BaseInput
          name="name"
          :label="t('settings.org.nameLabel')"
          :model-value="organization.name"
          readonly
          disabled
        />
        <BaseSelect
          name="currency"
          :label="t('settings.org.currencyLabel')"
          :model-value="organization.currency"
          :options="currencyOptions"
          disabled
        />
        <p class="text-fg-muted text-sm">{{ t('settings.org.readOnlyHint') }}</p>
      </div>
    </BaseCard>

    <TwoFactorPolicyCard :policy="twoFactorPolicy" :can-manage="canManage" class="mt-10" />

    <!-- Zone dangereuse (#886) : suppression de l'organisation, admins seuls. -->
    <DeleteOrganizationCard
      v-if="canManage"
      :deletion="deletion"
      :organization-name="organization.name"
      class="mt-10"
    />
  </div>
</template>
