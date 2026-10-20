<script setup lang="ts">
import { router, useForm } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseToggle from '~/components/base/BaseToggle.vue'
import { useT } from '~/composables/use_t'
import type { InstrumentSourceRow } from '#shared/types/instruments'

const props = defineProps<{ boatId: number; source: InstrumentSourceRow | null }>()

const { t } = useT()
const confirmRemove = ref(false)

const form = useForm({
  baseUrl: props.source?.baseUrl ?? '',
  // Écriture seule : le jeton n'est jamais pré-rempli, `hasToken` l'indique.
  token: '',
  clearToken: false,
  vesselContext: props.source?.vesselContext ?? 'vessels.self',
  enabled: props.source?.enabled ?? true,
})

function submit() {
  // Jeton absent = conservé ; `null` = effacé ; chaîne = remplacé.
  form
    .transform((data) => ({
      baseUrl: data.baseUrl,
      vesselContext: data.vesselContext,
      enabled: data.enabled,
      ...(data.clearToken ? { token: null } : data.token ? { token: data.token } : {}),
    }))
    .put(`/boats/${props.boatId}/instrument-source`, {
      preserveScroll: true,
      onSuccess: () => form.reset('token', 'clearToken'),
    })
}

function remove() {
  router.delete(`/boats/${props.boatId}/instrument-source`, { preserveScroll: true })
}
</script>

<template>
  <BaseCard padded data-testid="instrument-source-form">
    <template #header>
      <p class="text-sm font-semibold text-fg">{{ t('instruments.form.title') }}</p>
    </template>

    <form class="space-y-4" @submit.prevent="submit">
      <BaseInput
        v-model="form.baseUrl"
        :label="t('instruments.form.baseUrl')"
        :hint="t('instruments.form.baseUrlHint')"
        :errors="form.errors"
        error-key="baseUrl"
        name="baseUrl"
        type="url"
        inputmode="url"
        placeholder="https://signalk.local:3443"
        required
      />
      <BaseInput
        v-model="form.token"
        :label="t('instruments.form.token')"
        :hint="source?.hasToken ? t('instruments.form.tokenSet') : t('instruments.form.tokenHint')"
        :errors="form.errors"
        error-key="token"
        name="token"
        type="password"
        autocomplete="off"
      />
      <BaseToggle
        v-if="source?.hasToken"
        v-model="form.clearToken"
        :label="t('instruments.form.clearToken')"
        name="clearToken"
      />
      <BaseInput
        v-model="form.vesselContext"
        :label="t('instruments.form.vesselContext')"
        :hint="t('instruments.form.vesselContextHint')"
        :errors="form.errors"
        error-key="vesselContext"
        name="vesselContext"
      />
      <BaseToggle v-model="form.enabled" :label="t('instruments.form.enabled')" name="enabled" />

      <div class="flex flex-wrap items-center justify-between gap-3">
        <BaseButton type="submit" :disabled="form.processing">
          {{ t('instruments.form.save') }}
        </BaseButton>
        <BaseButton v-if="source" type="button" variant="danger" @click="confirmRemove = true">
          {{ t('instruments.form.remove') }}
        </BaseButton>
      </div>
    </form>

    <BaseConfirmModal
      v-model:open="confirmRemove"
      :title="t('instruments.form.removeTitle')"
      :message="t('instruments.form.removeMessage')"
      :confirm-label="t('instruments.form.remove')"
      @confirm="remove"
    />
  </BaseCard>
</template>
