<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { PortEditPayload } from '~/types/port'

const { t } = useT()

const props = defineProps<{
  port: PortEditPayload
}>()

const form = useForm({
  name: props.port.name,
  city: props.port.city ?? '',
  country: props.port.country ?? '',
  address: props.port.address ?? '',
  notes: props.port.notes ?? '',
})

function submit() {
  form.put(`/ports/${props.port.id}`)
}
</script>

<template>
  <Head :title="t('ports.edit')" />
  <div class="mx-auto w-full max-w-xl px-6 py-10 sm:px-8">
    <div class="space-y-2">
      <BaseHeading level="1">{{ t('ports.edit') }}</BaseHeading>
    </div>

    <div class="mt-8">
      <form @submit.prevent="submit" class="space-y-6">
        <BaseInput
          id="name"
          name="name"
          :label="t('ports.fields.name')"
          v-model="form.name"
          :errors="form.errors"
          required
        />

        <div class="grid grid-cols-2 gap-4">
          <BaseInput
            id="city"
            name="city"
            :label="t('ports.fields.city')"
            v-model="form.city"
            :errors="form.errors"
          />

          <BaseInput
            id="country"
            name="country"
            :label="t('ports.fields.country')"
            v-model="form.country"
            :errors="form.errors"
            maxlength="2"
          />
        </div>

        <BaseTextarea
          id="address"
          name="address"
          :label="t('ports.fields.address')"
          v-model="form.address"
          :errors="form.errors"
          :rows="2"
        />

        <BaseTextarea
          id="notes"
          name="notes"
          :label="t('ports.fields.notes')"
          v-model="form.notes"
          :errors="form.errors"
          :rows="3"
        />

        <div class="flex items-center gap-3">
          <BaseButton type="submit" :disabled="form.processing">
            {{ t('common.save') }}
          </BaseButton>
          <a
            :href="`/ports/${port.id}`"
            class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
          >
            {{ t('common.cancel') }}
          </a>
        </div>
      </form>
    </div>
  </div>
</template>
