<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { getFieldError, type FormErrors } from '~/utils/form_errors'

const props = defineProps<{ errors?: FormErrors }>()

const { t } = useT()

// `acceptTerms` is a bare checkbox, so it needs its own error slot — otherwise
// a rejected signup shows nothing at all (#448).
const error = computed(() => getFieldError(props.errors, 'acceptTerms'))
</script>

<template>
  <div>
    <label class="flex cursor-pointer items-start gap-2.5 select-none">
      <input
        id="acceptTerms"
        type="checkbox"
        name="acceptTerms"
        required
        :aria-invalid="error ? 'true' : undefined"
        class="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-[5px] border-border accent-[var(--color-brand)]"
      />
      <span class="text-[13px] leading-relaxed text-fg-muted">
        {{ t('auth.signup.acceptTermsPrefix') }}
        <a href="#" class="font-semibold text-coral-500">{{ t('auth.signup.cgu') }}</a>
        {{ t('auth.signup.acceptTermsConjunction') }}
        <a href="#" class="font-semibold text-coral-500">{{ t('auth.signup.privacyPolicy') }}</a
        >.
        {{ t('auth.signup.termsHosting') }}
      </span>
    </label>
    <p v-if="error" class="mt-1 text-xs text-danger" role="alert">{{ error }}</p>
  </div>
</template>
