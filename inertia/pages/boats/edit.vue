<script setup lang="ts">
import { Form, Link } from '@adonisjs/inertia/vue'
import { Head } from '@inertiajs/vue3'
import BoatFormHullFields from '~/components/boats/hull/BoatFormHullFields.vue'
import BoatOwnersManager from '~/components/boats/BoatOwnersManager.vue'
import type { BoatEditPayload, PortForForm, PropulsionTypeUi } from '~/types/boat_form'
import type { BoatBrandOption, BoatModelOption } from '../../../shared/types/boat_catalog'
import type { PortNameOption } from '../../../shared/types/port'
import { parsePropulsionType } from '~/types/boat_form'
import { computed, ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseConfirmModal from '~/components/base/BaseConfirmModal.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useDeleteConfirmation } from '~/composables/use_delete_confirmation'
import { useT } from '~/composables/use_t'
import { usePermissions } from '~/composables/use_permissions'

interface BoatOwnerOption {
  id: number
  fullName: string | null
  email: string
}

const { t } = useT()
const { can } = usePermissions()

const props = defineProps<{
  boat: BoatEditPayload
  ports: PortForForm[]
  portOptions: PortNameOption[]
  owners: BoatOwnerOption[]
  ownerCandidates: BoatOwnerOption[]
  brands: BoatBrandOption[]
  catalogModels: BoatModelOption[]
  catalogBrandId: number | null
}>()

const propulsionType = ref<PropulsionTypeUi>(parsePropulsionType(props.boat.propulsionType))
const showSailFields = computed(() => propulsionType.value === 'sailboat')

const deleting = ref(false)

const deletion = useDeleteConfirmation({
  url: () => `/boats/${props.boat.id}`,
  visit: {
    onFinish: () => {
      deleting.value = false
    },
  },
})

/** Le chargement du bouton se pose avant la visite, comme avant le composable. */
function executeDeleteBoat() {
  deleting.value = true
  deletion.confirm()
}
</script>

<template>
  <Head :title="t('boats.edit.title')" />

  <div class="mx-auto w-full max-w-xl px-6 py-10 sm:px-8">
    <div class="space-y-2">
      <BaseHeading level="1">{{ t('boats.edit.title') }}</BaseHeading>
      <p class="text-base text-fg-muted">{{ t('boats.edit.subtitle') }}</p>
    </div>

    <div class="mt-8">
      <Form :action="{ url: `/boats/${boat.id}`, method: 'put' }" #default="{ processing, errors }">
        <div class="space-y-6">
          <BoatFormHullFields
            v-model:propulsion-type="propulsionType"
            mode="edit"
            :boat="boat"
            :show-mast-height="showSailFields"
            :errors="errors"
            :ports="ports"
            :port-options="portOptions"
            :brands="brands"
            :catalog-models="catalogModels"
            :catalog-brand-id="catalogBrandId"
          />

          <div class="flex items-center gap-3">
            <BaseButton type="submit" :disabled="processing">{{
              t('boats.edit.submit')
            }}</BaseButton>
            <Link
              :href="`/boats/${boat.id}`"
              class="text-sm font-semibold text-fg-muted hover:text-fg hover:underline"
            >
              {{ t('boats.edit.cancel') }}
            </Link>
          </div>
        </div>
      </Form>

      <div v-if="can('boats.delete')" class="mt-6 flex justify-end">
        <BaseButton
          type="button"
          variant="danger"
          size="sm"
          :disabled="deleting"
          @click="deletion.ask()"
        >
          {{ t('common.delete') }}
        </BaseButton>
      </div>

      <BoatOwnersManager
        class="mt-6"
        :boat-id="boat.id"
        :owners="owners"
        :owner-candidates="ownerCandidates"
      />
    </div>

    <BaseConfirmModal
      :open="deletion.isOpen.value"
      :title="t('boats.edit.deleteConfirm.title')"
      :message="t('boats.edit.deleteConfirm.message', { name: boat.name })"
      :confirm-label="t('common.delete')"
      :cancel-label="t('boats.edit.cancel')"
      @update:open="deletion.release()"
      @confirm="executeDeleteBoat"
    />
  </div>
</template>
