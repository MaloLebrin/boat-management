import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

// #971 — copilote hors-ligne : aide produit locale et questions en attente du réseau.

vi.mock('vue-sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }))

const net = vi.hoisted(() => ({ state: { value: 'offline' } as { value: string } }))
vi.mock('~/composables/use_connectivity', () => ({ connectivityState: () => net.state }))

const panel = vi.hoisted(() => ({
  canUseAI: { value: true },
  conversation: { value: null as null | { token: string; pendingAction: unknown } },
  open: vi.fn(),
}))
vi.mock('~/composables/use_assistant_panel', () => ({ useAssistantPanel: () => panel }))

const pageProps = vi.hoisted(() => ({
  appT: {} as Record<string, string>,
  locale: 'fr',
  flash: {} as Record<string, unknown>,
}))
vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({ url: '/boats/7?tab=incidents', props: pageProps }),
  router: { post: vi.fn() },
}))

import { router } from '@inertiajs/vue3'
import { toast } from 'vue-sonner'
import {
  resetAssistantOffline,
  useAssistantOffline,
} from '../../inertia/composables/use_assistant_offline'

const STORAGE_KEY = 'fleetai:assistant:pending-questions'

function mountOffline() {
  let result: ReturnType<typeof useAssistantOffline> | undefined
  mount(
    defineComponent({
      setup() {
        result = useAssistantOffline()
        return {}
      },
      template: '<div />',
    })
  )
  return result!
}

/** Le serveur répond : `onSuccess` après avoir posé (ou non) un flash. */
function routerAnswers(flash: Record<string, unknown> = {}) {
  vi.mocked(router.post).mockImplementation((_url, _data, options: any) => {
    pageProps.flash = flash
    options?.onSuccess?.()
    options?.onFinish?.()
    return undefined as any
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  net.state.value = 'offline'
  panel.canUseAI.value = true
  panel.conversation.value = null
  pageProps.flash = {}
  resetAssistantOffline()
})

describe('ask — aide produit locale', () => {
  test('répond depuis la base produit, avec son lien et la proposition de reposer la question', async () => {
    const { ask, entries, pendingQuestions } = mountOffline()

    await ask('comment déclarer un incident avec photo')

    const [question, answer] = entries.value
    expect(question.message).toEqual({
      role: 'user',
      content: 'comment déclarer un incident avec photo',
    })
    expect(answer.message.role).toBe('assistant')
    expect(answer.message.source).toBe('product')
    expect(answer.message.content.length).toBeGreaterThan(100)
    expect(answer.askLater).toEqual({
      message: 'comment déclarer un incident avec photo',
      pageUrl: '/boats/7?tab=incidents',
    })
    // Une réponse locale n'enfile rien d'office.
    expect(pendingQuestions.value).toEqual([])
  })

  test('« poser au retour du réseau » enfile la question et retire le bouton', async () => {
    const { ask, askLater, entries, pendingQuestions } = mountOffline()
    await ask('carburant plein avitaillement')

    askLater(entries.value[1])

    expect(pendingQuestions.value.map((q) => q.message)).toEqual(['carburant plein avitaillement'])
    expect(entries.value[1].askLater).toBeUndefined()
    expect(toast.info).toHaveBeenCalledWith('assistant.offline.askLaterDone')
  })

  test('sans réponse locale, la question est gardée pour le modèle et survit au rechargement', async () => {
    const { ask, entries, pendingQuestions } = mountOffline()

    await ask('xyzzy quux')

    expect(entries.value[1].message.content).toBe('assistant.offline.queued')
    expect(pendingQuestions.value).toHaveLength(1)
    expect(pendingQuestions.value[0]).toMatchObject({
      message: 'xyzzy quux',
      pageUrl: '/boats/7?tab=incidents',
    })
    expect(typeof pendingQuestions.value[0].tzOffsetMinutes).toBe('number')

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored).toHaveLength(1)
    resetAssistantOffline()
    expect(mountOffline().pendingQuestions.value.map((q) => q.message)).toEqual(['xyzzy quux'])
  })

  test('plan sans IA : aide locale seulement, rien n’est mis en attente', async () => {
    panel.canUseAI.value = false
    const { ask, entries, pendingQuestions } = mountOffline()

    await ask('xyzzy quux')
    await ask('comment déclarer un incident')

    expect(entries.value[1].message.content).toBe('assistant.offline.noAnswer')
    expect(entries.value[3].askLater).toBeUndefined()
    expect(pendingQuestions.value).toEqual([])
  })

  test('une question en attente se retire', async () => {
    const { ask, pendingQuestions, removePending } = mountOffline()
    await ask('xyzzy quux')

    removePending(pendingQuestions.value[0].id)

    expect(pendingQuestions.value).toEqual([])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([])
  })
})

describe('drainPendingQuestions — retour du réseau', () => {
  async function queueTwo() {
    const offline = mountOffline()
    await offline.ask('xyzzy plugh')
    await offline.ask('xyzzy frotz')
    net.state.value = 'online'
    return offline
  }

  test('rien ne part tant que le serveur ne répond pas', async () => {
    const { ask, drainPendingQuestions } = mountOffline()
    await ask('xyzzy')

    drainPendingQuestions()

    expect(router.post).not.toHaveBeenCalled()
  })

  test('les questions partent dans l’ordre, puis un toast signale les réponses', async () => {
    routerAnswers()
    const { drainPendingQuestions, pendingQuestions } = await queueTwo()

    drainPendingQuestions()
    await flushPromises()

    expect(
      vi.mocked(router.post).mock.calls.map(([url, data]) => [url, (data as any).message])
    ).toEqual([
      ['/assistant/conversations', 'xyzzy plugh'],
      ['/assistant/conversations', 'xyzzy frotz'],
    ])
    expect(vi.mocked(router.post).mock.calls[0][1]).toMatchObject({
      pageUrl: '/boats/7?tab=incidents',
    })
    expect(pendingQuestions.value).toEqual([])
    expect(toast.success).toHaveBeenCalledWith(
      'assistant.offline.answered',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'assistant.offline.openPanel' }),
      })
    )
    const { action } = vi.mocked(toast.success).mock.calls[0][1] as any
    action.onClick()
    expect(panel.open).toHaveBeenCalled()
  })

  test('une conversation active reçoit les questions à la suite', async () => {
    routerAnswers()
    panel.conversation.value = { token: 'abc', pendingAction: null }
    const { drainPendingQuestions } = await queueTwo()

    drainPendingQuestions()

    expect(vi.mocked(router.post).mock.calls[0][0]).toBe('/assistant/conversations/abc/messages')
  })

  test('un refus en flash (quota…) retire la question et arrête la passe', async () => {
    routerAnswers({ error: 'Quota IA atteint' })
    const { drainPendingQuestions, pendingQuestions } = await queueTwo()

    drainPendingQuestions()

    expect(router.post).toHaveBeenCalledOnce()
    expect(pendingQuestions.value.map((q) => q.message)).toEqual(['xyzzy frotz'])
    expect(toast.success).not.toHaveBeenCalled()
  })

  test('une coupure garde la question pour la prochaine probe', async () => {
    vi.mocked(router.post).mockImplementation((_url, _data, options: any) => {
      options?.onFinish?.()
      return undefined as any
    })
    const { drainPendingQuestions, pendingQuestions } = await queueTwo()

    drainPendingQuestions()
    expect(pendingQuestions.value).toHaveLength(2)

    // La garde est relâchée : la probe suivante relance.
    drainPendingQuestions()
    expect(router.post).toHaveBeenCalledTimes(2)
  })

  test('une proposition d’action en attente de confirmation suspend l’envoi', async () => {
    routerAnswers()
    panel.conversation.value = { token: 'abc', pendingAction: { kind: 'create_task' } }
    const { drainPendingQuestions, pendingQuestions } = await queueTwo()

    drainPendingQuestions()

    expect(router.post).not.toHaveBeenCalled()
    expect(pendingQuestions.value).toHaveLength(2)
  })

  test('plan sans IA : rien ne part', async () => {
    const { drainPendingQuestions } = await queueTwo()
    panel.canUseAI.value = false

    drainPendingQuestions()

    expect(router.post).not.toHaveBeenCalled()
  })
})
