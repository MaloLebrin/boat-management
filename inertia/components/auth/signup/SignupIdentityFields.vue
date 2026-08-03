<script setup lang="ts">
import { computed, ref } from 'vue'
import PasswordStrength from '~/components/auth/PasswordStrength.vue'
import SignupSectionHeader from '~/components/auth/signup/SignupSectionHeader.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import { useT } from '~/composables/use_t'
import type { FormErrors } from '~/utils/form_errors'

/** Section 01 of the signup form — the account owner. */
defineProps<{ errors?: FormErrors }>()

const { t } = useT()

const showPassword = ref(false)
const passwordValue = ref('')
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
</script>

<template>
  <SignupSectionHeader
    step="01"
    :title="t('auth.signup.section01Title')"
    :subtitle="t('auth.signup.section01Sub')"
  />

  <div class="grid grid-cols-2 gap-2.5">
    <BaseInput
      id="firstName"
      name="firstName"
      :label="t('auth.signup.firstNameLabel')"
      :placeholder="t('auth.signup.firstNamePlaceholder')"
      autocomplete="given-name"
      required
      :errors="errors"
    />
    <BaseInput
      id="lastName"
      name="lastName"
      :label="t('auth.signup.lastNameLabel')"
      :placeholder="t('auth.signup.lastNamePlaceholder')"
      autocomplete="family-name"
      required
      :errors="errors"
    />
  </div>

  <BaseInput
    id="email"
    name="email"
    type="email"
    autocomplete="email"
    :label="t('auth.signup.emailLabel')"
    :placeholder="t('auth.signup.emailPlaceholder')"
    :hint="t('auth.signup.emailHint')"
    required
    :errors="errors"
  />

  <div>
    <BaseInput
      id="password"
      name="password"
      :type="passwordType"
      autocomplete="new-password"
      :label="t('auth.signup.passwordLabel')"
      :placeholder="t('auth.signup.passwordPlaceholder')"
      required
      :errors="errors"
      :model-value="passwordValue"
      @update:model-value="passwordValue = $event"
    >
      <template #trailing>
        <button
          type="button"
          class="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted focus-visible:outline-none"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword') }}
        </button>
      </template>
    </BaseInput>
    <PasswordStrength :value="passwordValue" />
  </div>
</template>
