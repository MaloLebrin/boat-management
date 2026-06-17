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
import { routes } from '~/utils/routes'
import type { BrandingConfig } from '../../../../shared/types/branding'

const { t } = useT()

const props = defineProps<{
  branding: BrandingConfig
}>()

const logoInput = ref<HTMLInputElement | null>(null)
const logoPreview = ref<string | null>(props.branding.logoUrl)

const primaryColorEnabled = ref(props.branding.primaryColor !== null)
const secondaryColorEnabled = ref(props.branding.secondaryColor !== null)
const primaryColor = ref<string>(props.branding.primaryColor ?? '#3b82f6')
const secondaryColor = ref<string>(props.branding.secondaryColor ?? '#6b7280')

function onLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoPreview.value = URL.createObjectURL(file)
}

function submitLogo() {
  if (!logoInput.value?.files?.[0]) return
  const form = new FormData()
  form.append('logo', logoInput.value.files[0])
  router.post(routes.branding.logoUpload(), form, { preserveScroll: true })
}

function deleteLogo() {
  router.delete(routes.branding.logoDelete(), {
    preserveScroll: true,
    onSuccess: () => {
      logoPreview.value = null
    },
  })
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
              <template v-if="primaryColorEnabled">
                <input type="hidden" name="primaryColor" :value="primaryColor" />
                <div class="flex items-center gap-3">
                  <input
                    type="color"
                    :value="primaryColor"
                    class="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    @input="primaryColor = ($event.target as HTMLInputElement).value"
                  />
                  <span class="text-sm text-fg-muted font-mono">{{ primaryColor }}</span>
                  <BaseButton variant="ghost" size="sm" @click="primaryColorEnabled = false">{{
                    t('settings.branding.resetColor')
                  }}</BaseButton>
                </div>
              </template>
              <template v-else>
                <input type="hidden" name="primaryColor" value="" />
                <BaseButton variant="secondary" size="sm" @click="primaryColorEnabled = true">
                  {{ t('settings.branding.setCustomColor') }}
                </BaseButton>
              </template>
            </BaseField>

            <BaseField :label="t('settings.branding.secondaryColorLabel')">
              <template v-if="secondaryColorEnabled">
                <input type="hidden" name="secondaryColor" :value="secondaryColor" />
                <div class="flex items-center gap-3">
                  <input
                    type="color"
                    :value="secondaryColor"
                    class="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    @input="secondaryColor = ($event.target as HTMLInputElement).value"
                  />
                  <span class="text-sm text-fg-muted font-mono">{{ secondaryColor }}</span>
                  <BaseButton variant="ghost" size="sm" @click="secondaryColorEnabled = false">{{
                    t('settings.branding.resetColor')
                  }}</BaseButton>
                </div>
              </template>
              <template v-else>
                <input type="hidden" name="secondaryColor" value="" />
                <BaseButton variant="secondary" size="sm" @click="secondaryColorEnabled = true">
                  {{ t('settings.branding.setCustomColor') }}
                </BaseButton>
              </template>
            </BaseField>
          </div>

          <!-- Preview bande de couleurs -->
          <div v-if="primaryColorEnabled || secondaryColorEnabled">
            <p class="mb-2 text-sm font-medium text-fg">{{ t('settings.branding.preview') }}</p>
            <div class="flex h-8 overflow-hidden rounded-lg">
              <div
                v-if="primaryColorEnabled"
                class="flex-1"
                :style="{ backgroundColor: primaryColor }"
              />
              <div
                v-if="secondaryColorEnabled"
                class="flex-1"
                :style="{ backgroundColor: secondaryColor }"
              />
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
