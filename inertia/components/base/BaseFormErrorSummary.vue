<script setup lang="ts">
import { computed } from 'vue'
import BaseAlert from '~/components/base/BaseAlert.vue'
import { useT } from '~/composables/use_t'
import type { FormErrors } from '~/utils/form_errors'

/**
 * Renders the validation errors that no input on the page displays (#448).
 *
 * A validator field with no matching input makes a form fail silently: the
 * server answers with errors, the page re-renders, and nothing is shown. Pass
 * the keys already rendered next to their input in `handledKeys`; whatever is
 * left is surfaced here.
 */
const props = withDefaults(
  defineProps<{
    errors?: FormErrors
    handledKeys?: readonly string[]
    title?: string
  }>(),
  {
    errors: undefined,
    handledKeys: () => [],
    title: undefined,
  }
)

const { t } = useT()

const messages = computed(() => {
  if (!props.errors) return []

  const handled = new Set(props.handledKeys)

  return Object.entries(props.errors)
    .filter(([key]) => !handled.has(key))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((message): message is string => typeof message === 'string' && message.length > 0)
})
</script>

<template>
  <BaseAlert
    v-if="messages.length > 0"
    variant="danger"
    :title="title ?? t('common.formErrors.title')"
    data-testid="form-error-summary"
  >
    <ul class="list-disc space-y-0.5 pl-4">
      <li v-for="(message, index) in messages" :key="index">{{ message }}</li>
    </ul>
  </BaseAlert>
</template>
