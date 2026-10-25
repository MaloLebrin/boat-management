<script setup lang="ts">
import BaseButton from '~/components/base/BaseButton.vue'
import { useClipboard } from '~/composables/use_clipboard'
import { useT } from '~/composables/use_t'

/**
 * Bloc de code / commande à coller (#1018) : `<pre><code>` mono sur
 * `bg-surface-muted` et bouton « Copier ». `wrap` autorise le retour à la
 * ligne (sinon défilement horizontal). Le slot `caption` accueille une
 * légende sous le bloc.
 */
const props = defineProps<{
  code: string
  language?: string
  label?: string
  wrap?: boolean
}>()

const { t } = useT()
const { copied, supported, copy } = useClipboard()
</script>

<template>
  <figure class="space-y-1.5" data-testid="base-code-block">
    <div class="flex items-center justify-between gap-2">
      <figcaption v-if="label" class="text-sm font-semibold text-fg">{{ label }}</figcaption>
      <span v-else />
      <BaseButton
        size="sm"
        variant="secondary"
        type="button"
        :disabled="!supported"
        data-testid="base-code-block-button"
        @click="copy(props.code)"
      >
        <span aria-live="polite">
          {{ copied ? t('common.clipboard.copied') : t('common.clipboard.copy') }}
        </span>
      </BaseButton>
    </div>
    <pre
      class="rounded-md border border-border bg-surface-muted p-3 font-mono text-xs text-fg"
      :class="wrap ? 'whitespace-pre-wrap break-all' : 'overflow-x-auto'"
      tabindex="0"
    ><code :data-language="language">{{ code }}</code></pre>
    <p v-if="!supported" class="text-xs text-fg-subtle">{{ t('common.clipboard.unavailable') }}</p>
    <div v-if="$slots.caption" class="text-xs text-fg-muted"><slot name="caption" /></div>
  </figure>
</template>
