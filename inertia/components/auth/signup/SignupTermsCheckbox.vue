<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { getFieldError, type FormErrors } from '~/utils/form_errors'

const props = defineProps<{ errors?: FormErrors }>()

const { t } = useT()

type SharedProps = { locale?: 'en' | 'fr' }

const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

/**
 * Les deux liens pointaient sur `href="#"` (#455) : la politique de
 * confidentialité existait déjà, les CGU non — elles sont désormais publiées.
 * `target="_blank"` évite de perdre un formulaire à moitié rempli : Inertia
 * n'intercepte pas un `<Link>` qui porte un `target`.
 */
const termsHref = computed(() => (locale.value === 'fr' ? '/fr/cgu' : '/en/terms'))
const privacyHref = computed(() => (locale.value === 'fr' ? '/fr/confidentialite' : '/en/privacy'))

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
        <Link
          :href="termsHref"
          target="_blank"
          rel="noopener"
          class="font-semibold text-coral-500"
          >{{ t('auth.signup.cgu') }}</Link
        >
        {{ t('auth.signup.acceptTermsConjunction') }}
        <Link
          :href="privacyHref"
          target="_blank"
          rel="noopener"
          class="font-semibold text-coral-500"
          >{{ t('auth.signup.privacyPolicy') }}</Link
        >.
        {{ t('auth.signup.termsHosting') }}
      </span>
    </label>
    <p v-if="error" class="mt-1 text-xs text-danger" role="alert">{{ error }}</p>
  </div>
</template>
