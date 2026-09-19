<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import { usePermissions } from '~/composables/use_permissions'

const { t } = useT()
const { can } = usePermissions()

defineProps<{
  organization: {
    id: number
    name: string
  }
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
        <p class="text-fg-muted text-sm">{{ t('settings.org.readOnlyHint') }}</p>
      </div>
    </BaseCard>
  </div>
</template>
