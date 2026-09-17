import { router } from '@inertiajs/vue3'
import { computed, ref, type ComputedRef, type Ref } from 'vue'

/** Ce que le composer affiche : formulaire de départ, de réponse, ou rien. */
export type ChatComposerMode = 'start' | 'reply' | null

/** Le minimum qu'une conversation de chat IA expose au panneau. */
export interface ChatConversationLike {
  token: string
  status: 'active' | 'completed'
}

export interface UseChatConversationOptions<C extends ChatConversationLike> {
  /** Conversation rendue par le serveur (getter réactif sur la prop). */
  conversation: () => C | null
  /** URL de création d'une conversation. */
  startUrl: () => string
  /** URL d'envoi d'un message dans la conversation en cours. */
  replyUrl: (conversation: C) => string
  /** Props rechargées par la visite partielle (`only`). */
  only: string[]
  /**
   * `false` ferme le composer de départ sans toucher aux réponses : c'est le
   * quota de conversations gratuites des chats publics. Ouvert par défaut —
   * le chat de l'app connectée n'a pas de plafond de conversations.
   */
  canStart?: () => boolean
}

export interface UseChatConversation<P extends { message: string }> {
  /** Visite en cours : le composer se verrouille, l'indicateur de réflexion s'affiche. */
  processing: Ref<boolean>
  /** Message affiché en optimiste pendant l'appel Mistral synchrone. */
  pendingMessage: Ref<string | null>
  /** Le fil de la conversation est affiché (masqué le temps d'en redémarrer une). */
  showThread: ComputedRef<boolean>
  composerMode: ComputedRef<ChatComposerMode>
  /** Poste le message : création si le composer est en mode départ, réponse sinon. */
  submit: (payload: P) => void
  /** Repasse le composer en mode « nouvelle conversation ». */
  startNew: () => void
}

/**
 * Socle des panneaux de chat IA (vague 3.5) : mode du composer, bulle
 * optimiste pendant l'appel Mistral synchrone, rechargement partiel et
 * redémarrage local. Remplace les mêmes trente lignes recopiées dans le
 * diagnostic public (#602), la recherche de références publique et celle de
 * l'app connectée (#634).
 */
export function useChatConversation<C extends ChatConversationLike, P extends { message: string }>(
  options: UseChatConversationOptions<C>
): UseChatConversation<P> {
  const canStart = options.canStart ?? (() => true)

  const processing = ref(false)
  const pendingMessage = ref<string | null>(null)
  /** Après une conversation terminée, le panneau en redémarre une sans visite. */
  const startingNew = ref(false)

  const showThread = computed(() => options.conversation() !== null && !startingNew.value)

  const composerMode = computed<ChatComposerMode>(() => {
    const conversation = options.conversation()
    if (conversation === null || startingNew.value) {
      return canStart() ? 'start' : null
    }
    return conversation.status === 'active' ? 'reply' : null
  })

  function submit(payload: P) {
    const isStart = composerMode.value === 'start'
    const conversation = options.conversation()
    const url =
      isStart || conversation === null ? options.startUrl() : options.replyUrl(conversation)
    const data = isStart ? { ...payload } : { message: payload.message }

    pendingMessage.value = payload.message
    router.post(url, data, {
      preserveScroll: true,
      only: options.only,
      onStart: () => {
        processing.value = true
      },
      onFinish: () => {
        processing.value = false
        pendingMessage.value = null
        startingNew.value = false
      },
    })
  }

  function startNew() {
    startingNew.value = true
  }

  return { processing, pendingMessage, showThread, composerMode, submit, startNew }
}
