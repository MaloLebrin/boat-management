<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseTextarea from '~/components/base/BaseTextarea.vue'
import { useT } from '~/composables/use_t'
import type { BoatShowEngine } from '~/types/boat_show'

const props = defineProps<{
  engine: BoatShowEngine
  boat: { id: number; name: string }
  canManage: boolean
}>()

const { t } = useT()

const editing = ref(false)
const draft = ref(props.engine.notes ?? '')
const saving = ref(false)

function startEdit() {
  draft.value = props.engine.notes ?? ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

function save() {
  saving.value = true
  router.patch(
    `/boats/${props.boat.id}/engines/${props.engine.id}/notes`,
    { notes: draft.value || null },
    {
      preserveScroll: true,
      onFinish: () => {
        saving.value = false
        editing.value = false
      },
    }
  )
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-fg">{{ t('boats.engineShow.notes.title') }}</h2>
      <BaseButton
        v-if="canManage && !editing"
        variant="secondary"
        size="sm"
        type="button"
        @click="startEdit"
      >
        {{ t('boats.engineShow.notes.edit') }}
      </BaseButton>
    </div>

    <!-- Edit mode -->
    <div v-if="editing" class="space-y-3">
      <BaseTextarea
        v-model="draft"
        :rows="8"
        :placeholder="t('boats.engineShow.notes.placeholder')"
      />
      <div class="flex gap-2 justify-end">
        <BaseButton variant="ghost" size="sm" type="button" @click="cancelEdit">
          {{ t('boats.engineShow.notes.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" size="sm" type="button" :disabled="saving" @click="save">
          {{ t('boats.engineShow.notes.save') }}
        </BaseButton>
      </div>
    </div>

    <!-- Read mode -->
    <div v-else>
      <div v-if="engine.notes" class="rounded-lg border border-border bg-surface-elevated p-4">
        <p class="text-sm text-fg whitespace-pre-wrap">{{ engine.notes }}</p>
      </div>
      <div v-else class="rounded-lg border-2 border-dashed border-border p-8 text-center">
        <p class="text-sm text-fg-muted">{{ t('boats.engineShow.notes.empty') }}</p>
      </div>
    </div>
  </div>
</template>
