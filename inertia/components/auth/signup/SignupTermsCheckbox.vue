<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import { useT } from '~/composables/use_t'
import { getFieldError, type FormErrors } from '~/utils/form_errors'
import { marketingPath } from '#shared/helpers/locale_path'

const props = defineProps<{ errors?: FormErrors }>()

const { t } = useT()

type SharedProps = { locale?: 'en' | 'fr' }

const page = usePage<SharedProps>()
const locale = computed<'en' | 'fr'>(() => page.props.locale ?? 'en')

/**
 * Les deux liens pointaient sur `href="#"` (#455) : la politique de
 * confidentialité existait déjà, les CGU non — elles sont désormais publiées.
 *
 * Ancres `<a>` volontaires malgré la règle « navigation interne = <Link> »
 * (#533) : `target="_blank"` protège un formulaire à moitié rempli, et un
 * `<Link>` ne sait pas ouvrir un nouvel onglet. `shouldIntercept()` d'Inertia
 * ne regarde que les touches de modification et le bouton de la souris, jamais
 * l'attribut `target` : un clic gauche sur `<Link target="_blank">` est
 * intercepté et navigue dans le même onglet — exactement ce qu'on veut éviter.
 */
const termsHref = computed(() => marketingPath('terms', locale.value))
const privacyHref = computed(() => marketingPath('privacy', locale.value))

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
        <!-- eslint-disable vue/no-restricted-v-bind -- nouvel onglet : voir le bloc ci-dessus -->
        <a :href="termsHref" target="_blank" rel="noopener" class="font-semibold text-coral-500">{{
          t('auth.signup.cgu')
        }}</a>
        {{ t('auth.signup.acceptTermsConjunction') }}
        <a
          :href="privacyHref"
          target="_blank"
          rel="noopener"
          class="font-semibold text-coral-500"
          >{{ t('auth.signup.privacyPolicy') }}</a
        >.
        <!-- eslint-enable vue/no-restricted-v-bind -->
        {{ t('auth.signup.termsHosting') }}
      </span>
    </label>
    <p v-if="error" class="mt-1 text-xs text-danger" role="alert">{{ error }}</p>
  </div>
</template>
