<script setup lang="ts">
import { useMounted } from '@vueuse/core'
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import BaseButton from '~/components/base/BaseButton.vue'
import { useFocusTrap } from '~/composables/use_focus_trap'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    subtitle?: string
    closeLabel?: string
    size?: 'md' | 'lg' | 'xl' | '2xl'
    /**
     * Une modale bloquante (résolution de conflit hors-ligne, #734) n'a pas de
     * sortie neutre : ni croix, ni clic sur le fond, ni Échap — seule une action
     * du pied de modale la referme.
     */
    dismissible?: boolean
    /**
     * Sélecteur CSS de l'élément à focaliser à l'ouverture (#861). Par défaut,
     * le premier élément focalisable du corps de la modale.
     */
    initialFocus?: string
  }>(),
  {
    title: undefined,
    subtitle: undefined,
    closeLabel: 'Close',
    size: 'lg',
    dismissible: true,
    initialFocus: undefined,
  }
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

// `useId()` : deux modales montées sur la même page ne doivent pas partager
// l'identifiant qui porte le nom accessible du dialogue.
const titleId = useId()

// Le SSR d'Inertia n'injecte que le HTML de `#app` : ce qu'un `<Teleport
// to="body">` rend côté serveur est perdu, et à l'hydratation Vue cherchait
// la modale directement dans `<body>` → « Hydration node mismatch » sur chaque
// page portant une modale (#835). Le Teleport reste désactivé (contenu rendu
// en place, identique serveur/client) jusqu'au montage, puis déplace la modale
// dans `<body>`.
const isMounted = useMounted()

// Focus initial, piège et restauration du focus sur le déclencheur (#861).
const panel = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)
const { isTop } = useFocusTrap(panel, () => props.open, {
  initialFocus: () => props.initialFocus,
  preferredZone: () => body.value,
})

function close() {
  if (!props.dismissible) return
  emit('update:open', false)
}

function onKeyDown(e: KeyboardEvent) {
  // Une modale ouverte par-dessus une autre : Échap ne ferme que la dernière.
  if (!props.open || !props.dismissible || !isTop()) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
  { immediate: true }
)

onMounted(() => window.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  // Une modale démontée alors qu'elle est ouverte (changement d'onglet…) laissait
  // sinon le scroll du body bloqué définitivement (#358).
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body" :disabled="!isMounted">
    <Transition name="modal-overlay">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-navy-900/30 backdrop-blur-[2px]"
        @click="close"
      />
    </Transition>
    <Transition name="modal-panel">
      <div v-if="open" class="fixed inset-0 z-51 flex items-center justify-center p-6">
        <div
          ref="panel"
          tabindex="-1"
          :class="[
            'flex max-h-[90dvh] w-full outline-none flex-col rounded-(--radius-card) border border-border bg-surface-elevated shadow-(--shadow-lg)',
            size === 'md'
              ? 'max-w-md'
              : size === 'xl'
                ? 'max-w-xl'
                : size === '2xl'
                  ? 'max-w-2xl'
                  : 'max-w-lg',
          ]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-label="title ? undefined : 'Modal'"
        >
          <div class="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 v-if="title" :id="titleId" class="font-display text-base font-semibold text-fg">
                {{ title }}
              </h2>
              <p v-if="subtitle" class="mt-0.5 text-xs text-fg-muted">{{ subtitle }}</p>
            </div>
            <div v-if="dismissible" class="ml-auto">
              <BaseButton variant="ghost" size="sm" type="button" @click="close">
                {{ closeLabel }}
              </BaseButton>
            </div>
          </div>
          <div ref="body" class="overflow-y-auto px-5 py-5">
            <slot />
          </div>
          <div v-if="$slots.footer" class="border-t border-border px-5 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
