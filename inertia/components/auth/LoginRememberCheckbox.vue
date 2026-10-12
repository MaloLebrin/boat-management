<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useT } from '~/composables/use_t'
import { isStandalone } from '~/composables/use_pwa_install'
import { REMEMBER_ME_DAYS } from '../../../shared/constants/auth'

/**
 * Case « rester connecté » (#951). Cochée par défaut quand l'app tourne
 * installée (standalone) : c'est le cas d'usage traversée, où la session doit
 * survivre des semaines sans réseau. Dans un onglet, elle reste décochée
 * (poste partagé, capitainerie). Le mode n'est connu qu'au montage — le rendu
 * SSR part donc décoché.
 */
const { t } = useT()

const checked = ref(false)
const standalone = ref(false)

onMounted(() => {
  standalone.value = isStandalone()
  checked.value = standalone.value
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <label class="flex cursor-pointer items-center gap-2.5 select-none">
      <input
        v-model="checked"
        type="checkbox"
        name="remember"
        class="h-[18px] w-[18px] rounded-[5px] border-border accent-[var(--color-brand)]"
      />
      <span class="text-[13px] text-fg-muted">
        {{ t('auth.login.rememberMe', { days: String(REMEMBER_ME_DAYS) }) }}
      </span>
    </label>
    <p
      v-if="standalone"
      data-test="remember-standalone-hint"
      class="pl-[28px] text-[12px] text-fg-subtle"
    >
      {{ t('auth.login.rememberMeStandaloneHint') }}
    </p>
  </div>
</template>
