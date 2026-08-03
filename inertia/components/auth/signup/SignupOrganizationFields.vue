<script setup lang="ts">
import { computed } from 'vue'
import SignupSectionHeader from '~/components/auth/signup/SignupSectionHeader.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'
import { FLEET_SIZES, ORGANIZATION_TYPES } from '../../../../shared/types/organization'
import type { FormErrors } from '~/utils/form_errors'

/** Section 02 of the signup form — the organization profile. */
defineProps<{ errors?: FormErrors }>()

const { t } = useT()

// Values come from the shared enums the validator uses, so a new option can
// never be offered by the form and rejected by the server (#448).
const organizationTypeOptions = computed(() =>
  ORGANIZATION_TYPES.map((value) => ({ value, label: t(`auth.signup.orgTypes.${value}`) }))
)

const FLEET_SIZE_LABEL_KEYS: Record<(typeof FLEET_SIZES)[number], string> = {
  '1-4': 'auth.signup.fleetSizes.s1',
  '5-20': 'auth.signup.fleetSizes.s2',
  '21-50': 'auth.signup.fleetSizes.s3',
  '51+': 'auth.signup.fleetSizes.s4',
}

const fleetSizeOptions = computed(() =>
  FLEET_SIZES.map((value) => ({ value, label: t(FLEET_SIZE_LABEL_KEYS[value]) }))
)
</script>

<template>
  <SignupSectionHeader
    step="02"
    :title="t('auth.signup.section02Title')"
    :subtitle="t('auth.signup.section02Sub')"
    class="mt-2.5"
  />

  <BaseInput
    id="organizationName"
    name="organizationName"
    :label="t('auth.signup.orgNameLabel')"
    :placeholder="t('auth.signup.orgNamePlaceholder')"
    :hint="t('auth.signup.orgNameHint')"
    required
    :errors="errors"
  />

  <div class="grid grid-cols-2 gap-2.5">
    <BaseSelect
      id="organizationType"
      name="organizationType"
      :label="t('auth.signup.orgTypeLabel')"
      :placeholder="t('common.selectPlaceholder')"
      :options="organizationTypeOptions"
      allow-empty
      :errors="errors"
    />
    <BaseSelect
      id="fleetSize"
      name="fleetSize"
      :label="t('auth.signup.fleetSizeLabel')"
      :placeholder="t('common.selectPlaceholder')"
      :options="fleetSizeOptions"
      allow-empty
      :errors="errors"
    />
  </div>
</template>
