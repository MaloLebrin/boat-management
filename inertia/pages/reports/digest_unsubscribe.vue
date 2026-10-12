<script lang="ts">
import AuthLayout from '~/layouts/auth.vue'
export default { layout: AuthLayout }
</script>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
import BaseButton from '~/components/base/BaseButton.vue'
import BaseCard from '~/components/base/BaseCard.vue'
import BaseHeading from '~/components/base/BaseHeading.vue'
import { useT } from '~/composables/use_t'
import type { FleetDigestKind } from '../../../shared/types/fleet_digest'

/**
 * Désinscription en un clic d'un rapport de flotte (#871). Le lien signé
 * ouvre cette page sans rien changer ; le bouton envoie le POST sur la même
 * URL signée.
 */
const props = defineProps<{
  kind: FleetDigestKind
  action: string
  done: boolean
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('reports.digest.unsubscribe.title')" />

  <div class="mx-auto w-full max-w-lg px-4 py-12">
    <BaseCard>
      <BaseHeading level="1">{{ t('reports.digest.unsubscribe.title') }}</BaseHeading>
      <p v-if="props.done" class="mt-3 text-sm text-fg-muted" data-testid="digest-unsubscribe-done">
        {{ t(`reports.digest.unsubscribe.done.${props.kind}`) }}
      </p>
      <template v-else>
        <p class="mt-3 text-sm text-fg-muted">
          {{ t(`reports.digest.unsubscribe.confirm.${props.kind}`) }}
        </p>
        <Form :action="{ url: props.action, method: 'post' }" class="mt-5">
          <template #default="{ processing }">
            <BaseButton
              type="submit"
              :disabled="processing"
              data-testid="digest-unsubscribe-submit"
            >
              {{ t('reports.digest.unsubscribe.submit') }}
            </BaseButton>
          </template>
        </Form>
      </template>
      <p class="mt-6 text-xs text-fg-subtle">
        <Link href="/settings/notifications" class="text-brand hover:underline">
          {{ t('reports.digest.manage') }}
        </Link>
      </p>
    </BaseCard>
  </div>
</template>
