<script setup lang="ts">
import { computed, ref } from 'vue'
import { router } from '@inertiajs/vue3'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseSelect from '~/components/base/BaseSelect.vue'
import { useT } from '~/composables/use_t'

interface BoatOwnerOption {
  id: number
  fullName: string | null
  email: string
}

const props = defineProps<{
  boatId: number
  owners: BoatOwnerOption[]
  ownerCandidates: BoatOwnerOption[]
}>()

const { t } = useT()

const selectedCandidateId = ref<number | ''>('')

const candidateOptions = computed(() =>
  props.ownerCandidates.map((candidate) => ({
    label: candidate.fullName ?? candidate.email,
    value: candidate.id,
  }))
)

function attachOwner() {
  if (!selectedCandidateId.value) return
  router.post(
    `/boats/${props.boatId}/owners`,
    { userId: selectedCandidateId.value },
    { preserveScroll: true, onSuccess: () => (selectedCandidateId.value = '') }
  )
}

function detachOwner(userId: number) {
  router.delete(`/boats/${props.boatId}/owners/${userId}`, { preserveScroll: true })
}
</script>

<template>
  <BaseCard>
    <p class="mb-4 text-sm font-semibold text-fg">{{ t('boats.owners.title') }}</p>

    <ul v-if="owners.length > 0" class="mb-4 flex flex-col gap-2">
      <li
        v-for="owner in owners"
        :key="owner.id"
        class="flex items-center justify-between rounded-(--radius-control) border border-border px-3 py-2"
      >
        <div>
          <p class="text-sm font-medium text-fg">{{ owner.fullName ?? owner.email }}</p>
          <p class="text-xs text-fg-muted">{{ owner.email }}</p>
        </div>
        <BaseButton variant="danger" size="sm" type="button" @click="detachOwner(owner.id)">
          {{ t('boats.owners.remove') }}
        </BaseButton>
      </li>
    </ul>
    <p v-else class="mb-4 text-sm text-fg-muted">{{ t('boats.owners.empty') }}</p>

    <div v-if="candidateOptions.length > 0" class="flex items-end gap-2">
      <div class="flex-1">
        <BaseSelect
          v-model="selectedCandidateId"
          :label="t('boats.owners.addLabel')"
          :options="candidateOptions"
        />
      </div>
      <BaseButton
        type="button"
        variant="secondary"
        :disabled="!selectedCandidateId"
        @click="attachOwner"
      >
        {{ t('boats.owners.add') }}
      </BaseButton>
    </div>
    <p v-else class="text-xs text-fg-muted">{{ t('boats.owners.noCandidates') }}</p>
  </BaseCard>
</template>
