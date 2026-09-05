import { router, usePage } from '@inertiajs/vue3'
import { computed, ref, watch } from 'vue'
import { PLAN_LIMITS, type PlanTier } from '#shared/types/plan'
import type { AssistantConversationProps } from '#shared/types/assistant'

const STORAGE_KEY = 'fleetai:assistant:open'

/**
 * État module-level : partagé entre l'entrée sidebar, le layout et le panneau,
 * et il survit aux navigations Inertia (le layout par défaut est persistant).
 */
const isOpen = ref(false)
const conversation = ref<AssistantConversationProps | null>(null)
/** La prop `assistantConversation` a été chargée au moins une fois. */
const hasLoaded = ref(false)
let restoredFromStorage = false

function persistOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
  } catch {
    // Stockage indisponible (navigation privée…) : l'état reste en mémoire.
  }
}

function loadConversation() {
  router.reload({ only: ['assistantConversation'] })
}

/**
 * Panneau du copilote FleetAi.
 *
 * La conversation vit dans la prop partagée « optional » `assistantConversation`
 * (évaluée uniquement sur partial reload) : chaque appelant pose un watch qui
 * recopie la prop dans le ref module quand elle est présente — les visites qui
 * l'omettent ne blanchissent donc pas le panneau.
 */
export function useAssistantPanel() {
  const page = usePage()

  if (!restoredFromStorage) {
    restoredFromStorage = true
    try {
      isOpen.value = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      isOpen.value = false
    }
  }

  watch(
    () => page.props.assistantConversation,
    (value) => {
      if (value === undefined) return
      // Prop enveloppée : le serializer Inertia refuse une prop résolue à `null`.
      const wrapped = value as { conversation: AssistantConversationProps | null }
      conversation.value = wrapped.conversation
      hasLoaded.value = true
    },
    { immediate: true }
  )

  const canUseAI = computed(() => {
    const plan = (page.props.currentPlan as PlanTier | undefined) ?? 'starter'
    return PLAN_LIMITS[plan].canUseAI
  })

  function open() {
    isOpen.value = true
    persistOpen(true)
    ensureLoaded()
  }

  /**
   * Charge la conversation si elle ne l'a jamais été — appelé à l'ouverture ET
   * au montage du panneau (après un rechargement complet, le panneau peut
   * démarrer déjà ouvert via localStorage sans que `open()` soit appelé).
   */
  function ensureLoaded() {
    if (!hasLoaded.value && canUseAI.value) loadConversation()
  }

  function close() {
    isOpen.value = false
    persistOpen(false)
  }

  function toggle() {
    if (isOpen.value) {
      close()
      return
    }
    open()
  }

  return { isOpen, conversation, hasLoaded, canUseAI, open, close, toggle, ensureLoaded }
}
