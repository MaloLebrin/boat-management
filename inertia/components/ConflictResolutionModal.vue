<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseModal from '~/components/base/BaseModal.vue'
import ConflictFieldTable from '~/components/ConflictFieldTable.vue'
import { useT } from '~/composables/use_t'
import type { ConflictChoice, ConflictState } from '~/composables/use_offline_queue'
import { conflictDescriptionKey, groupConflicts, type ConflictGroup } from '~/lib/conflict_fields'

const props = defineProps<{ conflicts: ConflictState[] }>()
const emit = defineEmits<{
  resolve: [actionId: number, choice: ConflictChoice]
  resolveAll: [choice: ConflictChoice]
}>()
const { t } = useT()

/** Après une longue coupure, les conflits arrivent en nombre (#970). */
const isBatch = computed(() => props.conflicts.length > 1)
const groups = computed(() => groupConflicts(props.conflicts))

const description = computed(() =>
  isBatch.value
    ? t('common.offline.conflict.batchDescription', { count: String(props.conflicts.length) })
    : t(conflictDescriptionKey(props.conflicts[0].action.type))
)

/** Le pied de modale tranche tout — ou le seul conflit, avec son propre message. */
function chooseForAll(choice: ConflictChoice) {
  if (isBatch.value) emit('resolveAll', choice)
  else emit('resolve', props.conflicts[0].action.id!, choice)
}

function groupTitle(group: ConflictGroup): string {
  const type = t(`common.offline.queue.type.${group.type}`)
  return group.boatName ? `${group.boatName} · ${type}` : type
}
</script>

<template>
  <!-- `dismissible: false` (#734) : la modale ne se referme qu'une fois chaque
       conflit tranché. Les autres saisies de la file, elles, sont déjà parties
       (#970) : un conflit ne bloque plus que lui-même. `BaseModal` porte
       `role="dialog"`, `aria-modal` et le nom accessible. -->
  <BaseModal
    :open="true"
    :title="t('common.offline.conflict.title')"
    :subtitle="description"
    :dismissible="false"
    size="2xl"
  >
    <ConflictFieldTable v-if="!isBatch" :conflict="conflicts[0]" />

    <div v-else class="space-y-6">
      <section
        v-for="group in groups"
        :key="group.key"
        :aria-label="groupTitle(group)"
        data-testid="conflict-group"
      >
        <h3 class="mb-2 text-sm font-semibold text-fg">
          {{ groupTitle(group) }}
          <span class="font-normal text-fg-subtle">({{ group.conflicts.length }})</span>
        </h3>
        <ul class="space-y-3">
          <li
            v-for="conflict in group.conflicts"
            :key="conflict.action.id"
            class="rounded-lg border border-border bg-surface-muted p-3"
            data-testid="conflict-item"
          >
            <ConflictFieldTable :conflict="conflict" />
            <div class="mt-3 flex flex-wrap justify-end gap-2">
              <BaseButton
                variant="secondary"
                size="sm"
                @click="emit('resolve', conflict.action.id!, 'server')"
              >
                {{ t('common.offline.conflict.keepServer') }}
              </BaseButton>
              <BaseButton
                variant="primary"
                size="sm"
                @click="emit('resolve', conflict.action.id!, 'local')"
              >
                {{ t('common.offline.conflict.keepLocal') }}
              </BaseButton>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-3">
        <BaseButton variant="secondary" @click="chooseForAll('server')">
          {{
            t(
              isBatch
                ? 'common.offline.conflict.keepServerAll'
                : 'common.offline.conflict.keepServer'
            )
          }}
        </BaseButton>
        <BaseButton variant="primary" @click="chooseForAll('local')">
          {{
            t(
              isBatch ? 'common.offline.conflict.keepLocalAll' : 'common.offline.conflict.keepLocal'
            )
          }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
