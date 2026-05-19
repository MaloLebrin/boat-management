<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3'
import { ref } from 'vue'
import { ArrowLeftIcon, MapPinIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import MouillageCard from '~/components/ports/show/MouillageCard.vue'
import MouillageFormModal from '~/components/ports/modals/MouillageFormModal.vue'
import PontoonCard from '~/components/ports/show/PontoonCard.vue'
import PontoonFormModal from '~/components/ports/modals/PontoonFormModal.vue'
import { useT } from '~/composables/useT'
import type { PortShowDetail, PontoonRow, MouillageRow } from '~/types/port'

const props = defineProps<{
  port: PortShowDetail
}>()

const { t } = useT()

const showPontoonForm = ref(false)
const editingPontoon = ref<PontoonRow | null>(null)

const showMouillageForm = ref(false)
const editingMouillage = ref<MouillageRow | null>(null)

function handleAddPontoon() {
  editingPontoon.value = null
  showPontoonForm.value = true
}

function handleEditPontoon(pontoon: PontoonRow) {
  editingPontoon.value = pontoon
  showPontoonForm.value = true
}

function handleCloseForm() {
  showPontoonForm.value = false
  editingPontoon.value = null
}

function handleAddMouillage() {
  editingMouillage.value = null
  showMouillageForm.value = true
}

function handleEditMouillage(mouillage: MouillageRow) {
  editingMouillage.value = mouillage
  showMouillageForm.value = true
}

function handleCloseMouillageForm() {
  showMouillageForm.value = false
  editingMouillage.value = null
}

function handleDeletePort() {
  const hasBoats =
    props.port.pontoons.some((p) => p.boats.length > 0) ||
    props.port.mouillages.some((m) => m.boats.length > 0)
  if (hasBoats) {
    alert(t('ports.hasBoats'))
    return
  }
  if (confirm(t('ports.deleteConfirm'))) {
    router.delete(`/ports/${props.port.id}`)
  }
}
</script>

<template>
  <div class="w-full max-w-5xl px-6 py-10 sm:px-8">
    <!-- Breadcrumb -->
    <div class="mb-6">
      <Link href="/ports" class="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeftIcon class="h-4 w-4" />
        {{ t('ports.backToList') }}
      </Link>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
          <MapPinIcon class="h-6 w-6 text-brand" />
        </div>
        <div>
          <BaseHeading level="1">{{ port.name }}</BaseHeading>
          <p v-if="port.city" class="mt-1 text-fg-muted">
            {{ port.city }}<span v-if="port.country">, {{ port.country }}</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Link :href="`/ports/${port.id}/edit`">
          <BaseButton variant="secondary" size="sm">
            <PencilIcon class="h-4 w-4" />
            {{ t('common.edit') }}
          </BaseButton>
        </Link>
        <BaseButton variant="danger" size="sm" @click="handleDeletePort">
          <TrashIcon class="h-4 w-4" />
          {{ t('common.delete') }}
        </BaseButton>
      </div>
    </div>

    <!-- Port details -->
    <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Info card -->
      <BaseCard padded>
        <dl class="space-y-3 text-sm">
          <div v-if="port.address">
            <dt class="text-fg-muted">{{ t('ports.fields.address') }}</dt>
            <dd class="font-medium text-fg whitespace-pre-line">{{ port.address }}</dd>
          </div>
          <div v-if="port.notes">
            <dt class="text-fg-muted">{{ t('ports.fields.notes') }}</dt>
            <dd class="font-medium text-fg whitespace-pre-line">{{ port.notes }}</dd>
          </div>
          <div v-if="!port.address && !port.notes" class="text-fg-subtle">
            {{ t('common.none') }}
          </div>
        </dl>
      </BaseCard>

      <!-- Pontoons section -->
      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-fg">{{ t('ports.pontoons.title') }}</h2>
          <BaseButton size="sm" @click="handleAddPontoon">
            <PlusIcon class="h-4 w-4" />
            {{ t('ports.pontoons.add') }}
          </BaseButton>
        </div>

        <!-- Pontoon form -->
        <PontoonFormModal
          v-if="showPontoonForm"
          :port-id="port.id"
          :pontoon="editingPontoon"
          @close="handleCloseForm"
        />

        <!-- Empty state -->
        <BaseCard v-if="port.pontoons.length === 0 && !showPontoonForm" padded>
          <p class="text-center text-sm text-fg-muted py-4">
            {{ t('ports.pontoons.empty') }}
          </p>
        </BaseCard>

        <!-- Pontoons list -->
        <div v-else class="space-y-4">
          <PontoonCard
            v-for="pontoon in port.pontoons"
            :key="pontoon.id"
            :pontoon="pontoon"
            :port-id="port.id"
            @edit="handleEditPontoon"
          />
        </div>

        <!-- Mouillages section -->
        <div class="mt-8 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-fg">{{ t('ports.mouillages.title') }}</h2>
            <BaseButton size="sm" @click="handleAddMouillage">
              <PlusIcon class="h-4 w-4" />
              {{ t('ports.mouillages.add') }}
            </BaseButton>
          </div>

          <!-- Mouillage form -->
          <MouillageFormModal
            v-if="showMouillageForm"
            :port-id="port.id"
            :mouillage="editingMouillage"
            @close="handleCloseMouillageForm"
          />

          <!-- Empty state -->
          <BaseCard v-if="port.mouillages.length === 0 && !showMouillageForm" padded>
            <p class="text-center text-sm text-fg-muted py-4">
              {{ t('ports.mouillages.empty') }}
            </p>
          </BaseCard>

          <!-- Mouillages list -->
          <div v-else class="space-y-4">
            <MouillageCard
              v-for="mouillage in port.mouillages"
              :key="mouillage.id"
              :mouillage="mouillage"
              :port-id="port.id"
              @edit="handleEditMouillage"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
