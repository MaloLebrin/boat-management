<script setup lang="ts">
import { ref } from 'vue'
import { router } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import BaseInput from '~/components/base/BaseInput.vue'
import BaseField from '~/components/base/BaseField.vue'
import { useT } from '~/composables/use_t'
import type { BrandingConfig } from '../../../../shared/types/branding'

const { t } = useT()

const props = defineProps<{
  branding: BrandingConfig
}>()

const logoInput = ref<HTMLInputElement | null>(null)
const logoPreview = ref<string | null>(props.branding.logoUrl)

const primaryColor = ref(props.branding.primaryColor ?? '#3b82f6')
const secondaryColor = ref(props.branding.secondaryColor ?? '#6b7280')

function onLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoPreview.value = URL.createObjectURL(file)
}

function submitLogo() {
  if (!logoInput.value?.files?.[0]) return
  const form = new FormData()
  form.append('logo', logoInput.value.files[0])
  router.post('/settings/branding/logo', form, { preserveScroll: true })
}

function deleteLogo() {
  router.delete('/settings/branding/logo', { preserveScroll: true })
  logoPreview.value = null
}
</script>

<template>
  <div class="space-y-6">
    <BaseHeading level="2" class="mb-6">{{ t('settings.branding.title') }}</BaseHeading>
    <p class="text-sm text-fg-muted">{{ t('settings.branding.description') }}</p>

    <!-- Logo -->
    <BaseCard>
      <BaseField :label="t('settings.branding.logoLabel')" :hint="t('settings.branding.logoHint')">
        <div class="flex items-center gap-4">
          <div
            v-if="logoPreview"
            class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted"
          >
            <img :src="logoPreview" alt="" class="h-full w-full object-contain" />
          </div>
          <div
            v-else
            class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted text-fg-muted"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div class="flex flex-col gap-2">
            <input
              ref="logoInput"
              type="file"
              accept=".jpg,.jpeg,.png,.svg,.webp"
              class="hidden"
              @change="onLogoChange"
            />
            <BaseButton variant="secondary" size="sm" @click="logoInput?.click()">
              {{ t('settings.branding.uploadLogo') }}
            </BaseButton>
            <BaseButton
              v-if="logoPreview && logoInput?.files?.[0]"
              variant="primary"
              size="sm"
              @click="submitLogo"
            >
              {{ t('settings.branding.save') }}
            </BaseButton>
            <BaseButton v-if="branding.logoUrl" variant="danger" size="sm" @click="deleteLogo">
              {{ t('settings.branding.deleteLogo') }}
            </BaseButton>
          </div>
        </div>
      </BaseField>
    </BaseCard>

    <!-- Couleurs + app name -->
    <Form :action="{ url: '/settings/branding', method: 'put' }" #default="{ processing, errors }">
      <BaseCard>
        <div class="space-y-6">
          <BaseInput
            name="appName"
            :label="t('settings.branding.appNameLabel')"
            :model-value="branding.appName ?? ''"
            :placeholder="t('settings.branding.appNamePlaceholder')"
            :hint="t('settings.branding.appNameHint')"
            :errors="errors"
          />

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <BaseField :label="t('settings.branding.primaryColorLabel')">
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  name="primaryColor"
                  :value="primaryColor"
                  class="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  @input="primaryColor = ($event.target as HTMLInputElement).value"
                />
                <span class="text-sm text-fg-muted font-mono">{{ primaryColor }}</span>
              </div>
            </BaseField>

            <BaseField :label="t('settings.branding.secondaryColorLabel')">
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  name="secondaryColor"
                  :value="secondaryColor"
                  class="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  @input="secondaryColor = ($event.target as HTMLInputElement).value"
                />
                <span class="text-sm text-fg-muted font-mono">{{ secondaryColor }}</span>
              </div>
            </BaseField>
          </div>

          <!-- Preview bande de couleurs -->
          <div>
            <p class="mb-2 text-sm font-medium text-fg">{{ t('settings.branding.preview') }}</p>
            <div class="flex h-8 overflow-hidden rounded-lg">
              <div class="flex-1" :style="{ backgroundColor: primaryColor }" />
              <div class="flex-1" :style="{ backgroundColor: secondaryColor }" />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <BaseButton type="submit" variant="primary" :disabled="processing">
              {{ t('settings.branding.save') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </Form>
  </div>
</template>
