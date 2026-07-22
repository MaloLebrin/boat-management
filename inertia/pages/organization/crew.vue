<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import BaseAlert from '~/components/base/BaseAlert.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import CrewMemberForm from '~/components/crew/CrewMemberForm.vue'
import CrewCertificationForm from '~/components/crew/CrewCertificationForm.vue'
import CrewCertificationBadge from '~/components/crew/CrewCertificationBadge.vue'
import { useT } from '~/composables/use_t'
import type { CrewMemberRow } from '../../../shared/types/crew'

const props = defineProps<{
  crewMembers: CrewMemberRow[]
  canDelete: boolean
}>()

const { t } = useT()
const page = usePage()

const flash = computed(() => page.props.flash as { error?: string; success?: string } | undefined)

const showCreateForm = ref(false)
const editingMemberId = ref<number | null>(null)
const addingCertMemberId = ref<number | null>(null)

function deleteMember(id: number) {
  if (!window.confirm(t('crew.deleteConfirm'))) return
  router.delete(`/crew/${id}`, { preserveScroll: true })
}

function deleteCertification(memberId: number, certId: number) {
  if (!window.confirm(t('crew.certificationDeleteConfirm'))) return
  router.delete(`/crew/${memberId}/certifications/${certId}`, { preserveScroll: true })
}
</script>

<template>
  <Head :title="t('crew.title')" />
  <div class="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
    <div class="mb-8 flex items-center justify-between">
      <BaseHeading level="1">{{ t('crew.title') }}</BaseHeading>
      <BaseButton variant="primary" size="sm" type="button" @click="showCreateForm = true">
        {{ t('crew.add') }}
      </BaseButton>
    </div>

    <BaseAlert v-if="flash?.success" variant="success" class="mb-6" dismissible>
      {{ flash.success }}
    </BaseAlert>
    <BaseAlert v-if="flash?.error" variant="danger" class="mb-6" dismissible>
      {{ flash.error }}
    </BaseAlert>

    <CrewMemberForm v-if="showCreateForm" class="mb-6" @close="showCreateForm = false" />

    <div v-if="crewMembers.length > 0" class="space-y-4">
      <BaseCard v-for="member in crewMembers" :key="member.id">
        <template v-if="editingMemberId === member.id">
          <CrewMemberForm :member="member" @close="editingMemberId = null" />
        </template>

        <template v-else>
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-fg">{{ member.fullName }}</p>
              <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
                <span v-if="member.email">{{ member.email }}</span>
                <span v-if="member.phone">{{ member.phone }}</span>
              </div>
              <p v-if="member.notes" class="mt-1 text-sm text-fg-muted whitespace-pre-wrap">
                {{ member.notes }}
              </p>

              <!-- Certifications -->
              <div class="mt-3 space-y-1">
                <div
                  v-for="cert in member.certifications"
                  :key="cert.id"
                  class="flex items-center justify-between gap-2"
                >
                  <CrewCertificationBadge :certification="cert" />
                  <BaseButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="deleteCertification(member.id, cert.id)"
                  >
                    {{ t('crew.form.delete') }}
                  </BaseButton>
                </div>
              </div>

              <CrewCertificationForm
                v-if="addingCertMemberId === member.id"
                :member-id="member.id"
                class="mt-3"
                @close="addingCertMemberId = null"
              />
              <div v-else class="mt-3">
                <BaseButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  @click="addingCertMemberId = member.id"
                >
                  + {{ t('crew.form.certTitle') }}
                </BaseButton>
              </div>
            </div>

            <div class="flex shrink-0 gap-2">
              <BaseButton
                type="button"
                variant="secondary"
                size="sm"
                @click="editingMemberId = member.id"
              >
                {{ t('crew.form.editTitle') }}
              </BaseButton>
              <BaseButton
                v-if="canDelete"
                type="button"
                variant="ghost"
                size="sm"
                @click="deleteMember(member.id)"
              >
                {{ t('crew.form.delete') }}
              </BaseButton>
            </div>
          </div>
        </template>
      </BaseCard>
    </div>

    <div
      v-else-if="!showCreateForm"
      class="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center"
    >
      <p class="text-fg-muted">{{ t('crew.empty') }}</p>
      <BaseButton
        variant="secondary"
        size="sm"
        type="button"
        class="mt-4"
        @click="showCreateForm = true"
      >
        {{ t('crew.add') }}
      </BaseButton>
    </div>
  </div>
</template>
