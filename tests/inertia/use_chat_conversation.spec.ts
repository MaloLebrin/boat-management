import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { defineComponent, nextTick, reactive } from 'vue'
import {
  useChatConversation,
  type ChatConversationLike,
  type UseChatConversationOptions,
} from '../../inertia/composables/use_chat_conversation'
import { resetInertiaMock, routerSpies } from './helpers/inertia_mock'

vi.mock('@inertiajs/vue3', async () => {
  const { inertiaMock } = await import('./helpers/inertia_mock')
  return inertiaMock()
})

interface Conversation extends ChatConversationLike {
  token: string
  status: 'active' | 'completed'
}

interface Payload {
  message: string
  brand: string | null
}

const ONLY = ['conversation', 'quota', 'errors', 'flash']

function setup(
  conversation: Conversation | null,
  options: Partial<UseChatConversationOptions<Conversation>> = {}
) {
  const state = reactive<{ conversation: Conversation | null }>({ conversation })
  let api!: ReturnType<typeof useChatConversation<Conversation, Payload>>
  mount(
    defineComponent({
      setup() {
        api = useChatConversation<Conversation, Payload>({
          conversation: () => state.conversation,
          startUrl: () => '/chat/conversations',
          replyUrl: (current) => `/chat/conversations/${current.token}/messages`,
          only: ONLY,
          ...options,
        })
        return () => null
      },
    })
  )
  return { state, api }
}

/** Options passées au dernier `router.post` — c'est là que vivent onStart/onFinish. */
function lastPostOptions(): { onStart: () => void; onFinish: () => void } {
  return routerSpies.post.mock.calls.at(-1)![2] as never
}

const ACTIVE: Conversation = { token: 'cafe0001', status: 'active' }
const COMPLETED: Conversation = { token: 'cafe0001', status: 'completed' }

beforeEach(() => {
  resetInertiaMock()
})

describe('useChatConversation — mode du composer', () => {
  test('sans conversation le composer démarre, une conversation active répond', () => {
    expect(setup(null).api.composerMode.value).toBe('start')
    expect(setup(ACTIVE).api.composerMode.value).toBe('reply')
  })

  test('une conversation terminée ferme le composer', () => {
    expect(setup(COMPLETED).api.composerMode.value).toBe(null)
  })

  test('`canStart` à false ferme le composer de départ, jamais la réponse', () => {
    expect(setup(null, { canStart: () => false }).api.composerMode.value).toBe(null)
    expect(setup(ACTIVE, { canStart: () => false }).api.composerMode.value).toBe('reply')
  })

  test('`startNew` repasse en départ et masque le fil, même sur une conversation active', () => {
    const { api } = setup(ACTIVE)
    expect(api.showThread.value).toBe(true)

    api.startNew()

    expect(api.composerMode.value).toBe('start')
    expect(api.showThread.value).toBe(false)
  })

  test('`startNew` sur un quota épuisé ne rouvre pas le composer', () => {
    const { api } = setup(COMPLETED, { canStart: () => false })

    api.startNew()

    expect(api.composerMode.value).toBe(null)
  })

  test('le fil ne s’affiche qu’avec une conversation', () => {
    expect(setup(null).api.showThread.value).toBe(false)
    expect(setup(COMPLETED).api.showThread.value).toBe(true)
  })
})

describe('useChatConversation — envoi', () => {
  test('le premier message poste la charge utile complète sur l’URL de départ', () => {
    const { api } = setup(null)

    api.submit({ message: 'Le moteur cale.', brand: 'Volvo' })

    expect(routerSpies.post).toHaveBeenCalledWith(
      '/chat/conversations',
      { message: 'Le moteur cale.', brand: 'Volvo' },
      expect.objectContaining({ preserveScroll: true, only: ONLY })
    )
    expect(api.pendingMessage.value).toBe('Le moteur cale.')
  })

  test('une réponse poste sur le token, sans les champs de contexte', () => {
    const { api } = setup(ACTIVE)

    api.submit({ message: 'Depuis hier.', brand: 'Volvo' })

    expect(routerSpies.post).toHaveBeenCalledWith(
      '/chat/conversations/cafe0001/messages',
      { message: 'Depuis hier.' },
      expect.objectContaining({ preserveScroll: true, only: ONLY })
    )
  })

  test('la visite pilote `processing` puis remet la bulle optimiste et le redémarrage à zéro', async () => {
    const { api } = setup(ACTIVE)
    api.startNew()
    api.submit({ message: 'Nouvelle question.', brand: null })
    await nextTick()

    expect(api.processing.value).toBe(false)

    lastPostOptions().onStart()
    expect(api.processing.value).toBe(true)
    expect(api.pendingMessage.value).toBe('Nouvelle question.')

    lastPostOptions().onFinish()
    expect(api.processing.value).toBe(false)
    expect(api.pendingMessage.value).toBe(null)
    expect(api.showThread.value).toBe(true)
    expect(api.composerMode.value).toBe('reply')
  })

  test('les URL sont calculées à l’envoi : une conversation arrivée du serveur est prise en compte', () => {
    const { state, api } = setup(null)

    state.conversation = { token: 'beef0002', status: 'active' }

    api.submit({ message: 'Suite.', brand: null })

    expect(routerSpies.post).toHaveBeenCalledWith(
      '/chat/conversations/beef0002/messages',
      { message: 'Suite.' },
      expect.objectContaining({ only: ONLY })
    )
  })
})
