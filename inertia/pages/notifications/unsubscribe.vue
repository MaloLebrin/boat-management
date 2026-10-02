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
import type { NotificationFamily } from '../../../shared/types/notification'

/**
 * Désinscription en un clic depuis le pied d'un e-mail (#888). Le lien signé
 * ouvre cette page sans rien changer (les antivirus de messagerie suivent
 * les liens) ; le bouton envoie le POST sur la même URL signée.
 */
const props = defineProps<{
  family: NotificationFamily
  action: string
  done: boolean
}>()

const { t } = useT()
</script>

<template>
  <Head :title="t('notifications.unsubscribe.title')" />

  <div class="mx-auto w-full max-w-lg px-4 py-12">
    <BaseCard>
      <BaseHeading level="1">{{ t('notifications.unsubscribe.title') }}</BaseHeading>
      <template v-if="props.done">
        <p class="mt-3 text-sm text-fg-muted" data-testid="unsubscribe-done">
          {{
            t('notifications.unsubscribe.done', {
              family: t(`notifications.families.${props.family}.label`),
            })
          }}
        </p>
      </template>
      <template v-else>
        <p class="mt-3 text-sm text-fg-muted">
          {{
            t('notifications.unsubscribe.confirm', {
              family: t(`notifications.families.${props.family}.label`),
            })
          }}
        </p>
        <Form :action="{ url: props.action, method: 'post' }" class="mt-5">
          <template #default="{ processing }">
            <BaseButton type="submit" :disabled="processing" data-testid="unsubscribe-submit">
              {{ t('notifications.unsubscribe.submit') }}
            </BaseButton>
          </template>
        </Form>
      </template>
      <p class="mt-6 text-xs text-fg-subtle">
        <Link href="/settings/notifications" class="text-brand hover:underline">
          {{ t('notifications.unsubscribe.manage') }}
        </Link>
      </p>
    </BaseCard>
  </div>
</template>
