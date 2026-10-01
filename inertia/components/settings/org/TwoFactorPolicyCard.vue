<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { ref } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseCheckbox from '~/components/base/BaseCheckbox.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import { TWO_FACTOR_MAX_GRACE_DAYS } from '#shared/constants/two_factor'
import type { OrganizationTwoFactorPolicy } from '#shared/types/two_factor'

/**
 * Politique 2FA de l'organisation (#884) : obligation pour tous les membres,
 * avec un délai de grâce. Formulaire avec `organization.manage`, lecture seule
 * sinon — comme le renommage de l'onglet (#761).
 */
const props = defineProps<{ policy: OrganizationTwoFactorPolicy; canManage: boolean }>()

const { t } = useT()
const { formatDateLong } = useDateFormat()
const required = ref(props.policy.requireTwoFactor)
</script>

<template>
  <section data-testid="two-factor-policy">
    <BaseHeading level="2" class="mb-2">{{ t('settings.org.twoFactor.title') }}</BaseHeading>
    <p class="mb-6 text-sm text-fg-muted">{{ t('settings.org.twoFactor.subtitle') }}</p>
    <Form
      v-if="canManage"
      :action="{ url: '/settings/org/two-factor', method: 'put' }"
      :options="{ preserveScroll: true }"
      #default="{ processing, errors }"
    >
      <BaseCard>
        <div class="space-y-4">
          <BaseCheckbox
            v-model="required"
            name="requireTwoFactor"
            :hint="t('settings.org.twoFactor.requireHint')"
          >
            {{ t('settings.org.twoFactor.requireLabel') }}
          </BaseCheckbox>
          <BaseInput
            v-if="required"
            name="graceDays"
            type="number"
            min="0"
            :max="TWO_FACTOR_MAX_GRACE_DAYS"
            model-value="7"
            :label="t('settings.org.twoFactor.graceLabel')"
            :hint="
              t('settings.org.twoFactor.graceHint', { max: String(TWO_FACTOR_MAX_GRACE_DAYS) })
            "
            :errors="errors"
          />
          <p v-if="policy.requireTwoFactor && policy.graceEndsAt" class="text-sm text-fg-muted">
            {{
              t('settings.org.twoFactor.graceEndsAt', { date: formatDateLong(policy.graceEndsAt) })
            }}
          </p>
          <p class="text-sm text-fg-muted" data-testid="two-factor-policy-missing">
            {{
              t('settings.org.twoFactor.membersWithout', {
                count: String(policy.membersWithoutTwoFactor),
              })
            }}
          </p>
        </div>
        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" :disabled="processing">
              {{ t('settings.org.twoFactor.save') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
    <BaseCard v-else>
      <div class="space-y-3 text-sm text-fg-muted">
        <BaseBadge :variant="policy.requireTwoFactor ? 'success' : 'empty'">
          {{
            t(policy.requireTwoFactor ? 'settings.org.twoFactor.on' : 'settings.org.twoFactor.off')
          }}
        </BaseBadge>
        <p v-if="policy.requireTwoFactor && policy.graceEndsAt">
          {{
            t('settings.org.twoFactor.graceEndsAt', { date: formatDateLong(policy.graceEndsAt) })
          }}
        </p>
        <p>{{ t('settings.org.readOnlyHint') }}</p>
      </div>
    </BaseCard>
  </section>
</template>
