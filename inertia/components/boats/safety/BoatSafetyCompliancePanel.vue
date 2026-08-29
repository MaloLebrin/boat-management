<script setup lang="ts">
import { computed } from 'vue'
import BaseBadge from '~/components/base/BaseBadge.vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import { lifetimeFor } from '#shared/constants/safety/division240_content'
import type {
  SafetyComplianceIssue,
  SafetyComplianceIssueKind,
  SafetyComplianceReport,
} from '#shared/types/safety'
import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'

const props = defineProps<{
  boatId: number
  report: SafetyComplianceReport
  canManage: boolean
}>()

const emit = defineEmits<{
  /** Demande d'ajout d'un équipement, pré-rempli sur ce type. */
  (e: 'addEquipment', equipmentType: string): void
}>()

const { t } = useT()
const { formatDate } = useDateFormat()

const BADGE_VARIANTS: Record<SafetyComplianceIssueKind, 'danger' | 'warning'> = {
  missing: 'danger',
  insufficient_quantity: 'danger',
  expired: 'danger',
  review_due: 'danger',
  expiring_soon: 'warning',
  review_due_soon: 'warning',
}

/** Vert au-dessus de 90 %, orange au-dessus de 60 %, rouge en dessous. */
const scoreVariant = computed(() => {
  const score = props.report.score
  if (score === null) return 'empty' as const
  if (score >= 90) return 'success' as const
  return score >= 60 ? ('warning' as const) : ('danger' as const)
})

function issueLabel(issue: SafetyComplianceIssue): string {
  return t(issue.labelKey)
}

/**
 * Précision affichée sous le libellé : quantité manquante, ou échéance. Une
 * échéance déduite du corpus est annoncée comme telle — l'utilisateur doit
 * pouvoir distinguer sa saisie d'un défaut réglementaire.
 */
function issueDetail(issue: SafetyComplianceIssue): string {
  if (issue.kind === 'missing' && issue.requiredQuantity !== null) {
    return t('boats.safetyCompliance.detail.required', { count: String(issue.requiredQuantity) })
  }
  if (issue.kind === 'insufficient_quantity') {
    return t('boats.safetyCompliance.detail.quantity', {
      current: String(issue.currentQuantity ?? 0),
      required: String(issue.requiredQuantity ?? 0),
    })
  }
  if (issue.dueDate) {
    return t('boats.safetyCompliance.detail.due', { date: formatDate(issue.dueDate) })
  }
  return ''
}

/** Libellé de la durée de vie du corpus, quand l'échéance en est déduite. */
function defaultLifetimeLabel(issue: SafetyComplianceIssue): string | null {
  if (issue.dueDateSource !== 'default') return null
  const lifetime = lifetimeFor(issue.equipmentType)
  return lifetime ? t(lifetime.labelKey) : null
}
</script>

<template>
  <BaseCard padded>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-fg">{{ t('boats.safetyCompliance.title') }}</p>
          <p v-if="report.zone" class="mt-1 text-xs text-fg-muted">
            {{ t(`boats.options.armamentZone.${report.zone}`) }}
          </p>
        </div>
        <BaseBadge v-if="report.score !== null" :variant="scoreVariant">
          {{ t('boats.safetyCompliance.score', { score: String(report.score) }) }}
        </BaseBadge>
      </div>
    </template>

    <!-- Zone non renseignée : aucun contrôle, on invite simplement à la déclarer -->
    <div v-if="!report.zone" class="space-y-3">
      <p class="text-sm text-fg-muted">{{ t('boats.safetyCompliance.noZone.description') }}</p>
      <BaseButton
        v-if="canManage"
        variant="secondary"
        size="sm"
        :href="`/boats/${boatId}/edit`"
        :aria-label="t('boats.safetyCompliance.noZone.cta')"
      >
        {{ t('boats.safetyCompliance.noZone.cta') }}
      </BaseButton>
    </div>

    <template v-else>
      <p class="text-sm text-fg-muted">
        {{
          t('boats.safetyCompliance.summary', {
            satisfied: String(report.satisfiedCount),
            total: String(report.requirementCount),
          })
        }}
      </p>

      <p v-if="report.issues.length === 0" class="mt-4 text-sm text-success">
        {{ t('boats.safetyCompliance.allGood') }}
      </p>

      <ul v-else class="mt-4 space-y-3 text-sm">
        <li
          v-for="issue in report.issues"
          :key="`${issue.kind}-${issue.requirementKey ?? ''}-${issue.itemId ?? ''}`"
          class="rounded-(--radius-control) border border-border bg-surface-muted/40 p-4"
        >
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate text-sm font-semibold text-fg">{{ issueLabel(issue) }}</p>
                <BaseBadge :variant="BADGE_VARIANTS[issue.kind]">
                  {{ t(`boats.safetyCompliance.status.${issue.kind}`) }}
                </BaseBadge>
              </div>
              <p class="mt-1 text-xs text-fg-muted">{{ issueDetail(issue) }}</p>
              <p v-if="defaultLifetimeLabel(issue)" class="mt-1 text-xs text-fg-subtle">
                {{
                  t('boats.safetyCompliance.detail.defaultLifetime', {
                    lifetime: defaultLifetimeLabel(issue) ?? '',
                  })
                }}
              </p>
              <p v-if="issue.articleRef" class="mt-1 text-xs text-fg-subtle">
                {{ t('boats.safetyCompliance.articleRef', { ref: issue.articleRef }) }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 md:justify-end">
              <BaseButton
                v-if="canManage && issue.kind === 'missing'"
                variant="secondary"
                size="sm"
                type="button"
                @click="emit('addEquipment', issue.equipmentType)"
              >
                {{ t('boats.safetyCompliance.addEquipment') }}
              </BaseButton>
              <BaseButton
                v-else-if="issue.itemId !== null"
                variant="ghost"
                size="sm"
                route="boats.safetyEquipment.show"
                :params="{ boatId, itemId: issue.itemId }"
              >
                {{ t('boats.safetyEquipment.viewDetail') }}
              </BaseButton>
            </div>
          </div>
        </li>
      </ul>

      <div v-if="report.untrackedItemKeys.length > 0" class="mt-6 border-t border-border pt-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {{ t('boats.safetyCompliance.untracked.title') }}
        </p>
        <p class="mt-1 text-xs text-fg-muted">
          {{
            report.untrackedItemKeys
              .map((key) => t(`boats.safetyCompliance.untracked.${key}`))
              .join(' · ')
          }}
        </p>
      </div>
    </template>

    <p class="mt-6 border-t border-border pt-4 text-xs text-fg-subtle">
      {{ t('boats.safetyCompliance.disclaimer') }}
      {{ t('boats.safetyCompliance.textVersion', { version: report.textVersion }) }}
    </p>
  </BaseCard>
</template>
