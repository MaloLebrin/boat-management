import { router, usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { connectivityState } from '~/composables/use_connectivity'
import { useAssistantPanel } from '~/composables/use_assistant_panel'
import { resetOfflineBoatAnswer, useOfflineBoatAnswer } from '~/composables/use_offline_boat_answer'
import { useT } from '~/composables/use_t'
import { tzOffsetMinutes } from '~/utils/local_datetime'
import {
  ASSISTANT_PAGE_URL_MAX_LENGTH,
  type AssistantMessage,
  type ProductHelpHit,
} from '#shared/types/assistant'
import type { AiSuggestionLocale } from '#shared/types/ai'
import { toAppLocale } from '#shared/helpers/locale_path'

/**
 * Copilote hors-ligne (#971).
 *
 * L'assistant passe par Mistral, côté serveur : en traversée il était muet.
 * Sans réseau, le panneau répond depuis la base de connaissance produit — la
 * même recherche que l'outil `search_product_help` du copilote, partagée dans
 * `shared/helpers/product_help_search.ts`. Une question qui demande le modèle
 * est mise de côté et posée d'elle-même au retour du réseau. Depuis #982, une
 * question factuelle sur le bateau (échéances, carburant…) est d'abord
 * répondue depuis la fiche en cache.
 */

const STORAGE_KEY = 'fleetai:assistant:pending-questions'

/** Une question posée hors-ligne, en attente du modèle. */
export interface PendingAssistantQuestion {
  id: string
  message: string
  /** La page d'où elle a été posée : le contexte (« ce bateau ») suit la question. */
  pageUrl: string
  /** Fuseau de la saisie, figé comme pour la file hors-ligne (#452). */
  tzOffsetMinutes: number
  askedAt: string
}

/** Une bulle du fil hors-ligne ; `askLater` propose d'envoyer la question au modèle. */
export interface OfflineAssistantEntry {
  id: number
  message: AssistantMessage
  askLater?: { message: string; pageUrl: string }
  /** Onglet de la fiche d'où vient une réponse sur le bateau (#982). */
  link?: { href: string; label: string }
}

const entries = ref<OfflineAssistantEntry[]>([])
const pendingQuestions = ref<PendingAssistantQuestion[]>(readPending())
let isDraining = false
let nextEntryId = 0

function readPending(): PendingAssistantQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as PendingAssistantQuestion[]) : []
  } catch {
    return []
  }
}

function persistPending() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingQuestions.value))
  } catch {
    // Stockage indisponible : la question reste en mémoire jusqu'au rechargement.
  }
}

function pushEntry(
  message: AssistantMessage,
  askLater?: OfflineAssistantEntry['askLater'],
  link?: OfflineAssistantEntry['link']
) {
  entries.value = [...entries.value, { id: ++nextEntryId, message, askLater, link }]
}

/**
 * La base de connaissance pèse ~160 Ko : chargée à la première question
 * hors-ligne, pas dans le bundle principal. Le service worker précache tous
 * les `.js` (`vite.config.ts`), le chunk est donc disponible sans réseau.
 */
async function searchHelp(query: string, locale: AiSuggestionLocale): Promise<ProductHelpHit[]> {
  const { searchProductHelp } = await import('#shared/helpers/product_help_search')
  return searchProductHelp(query, locale)
}

/** État remis à zéro entre deux tests. */
export function resetAssistantOffline() {
  entries.value = []
  pendingQuestions.value = readPending()
  isDraining = false
  resetOfflineBoatAnswer()
}

export function useAssistantOffline() {
  const { t, locale } = useT()
  const page = usePage()
  const panel = useAssistantPanel()
  const connectivity = connectivityState()
  const boatAnswer = useOfflineBoatAnswer()

  /** Hors-ligne ou serveur injoignable (#953) : Mistral ne répondrait pas. */
  const isOffline = computed(() => connectivity.value !== 'online')

  function queueQuestion(message: string, pageUrl: string) {
    pendingQuestions.value = [
      ...pendingQuestions.value,
      {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        message,
        pageUrl,
        tzOffsetMinutes: tzOffsetMinutes(),
        askedAt: new Date().toISOString(),
      },
    ]
    persistPending()
  }

  /**
   * Répond depuis la fiche du bateau en cache (#982), sinon depuis l'aide
   * produit locale ; sans réponse, met la question de côté.
   */
  async function ask(message: string) {
    const pageUrl = page.url.slice(0, ASSISTANT_PAGE_URL_MAX_LENGTH)
    pushEntry({ role: 'user', content: message })

    const fromBoat = await boatAnswer.answer(message, pageUrl)
    if (fromBoat) {
      pushEntry(
        {
          role: 'assistant',
          content: fromBoat.content,
          ...(fromBoat.fromBoatData ? { source: 'fleet_data' as const } : {}),
        },
        fromBoat.link && panel.canUseAI.value ? { message, pageUrl } : undefined,
        fromBoat.link
      )
      return
    }

    const [best, ...others] = await searchHelp(message, toAppLocale(locale.value))
    if (best) {
      const seeAlso = others.length
        ? `\n\n${t('assistant.offline.seeAlso', { titles: others.map((hit) => hit.title).join(' · ') })}`
        : ''
      pushEntry(
        {
          role: 'assistant',
          content: `${best.title}\n\n${best.body}${seeAlso}`,
          source: 'product',
          ...(best.navTarget ? { navTarget: best.navTarget } : {}),
        },
        panel.canUseAI.value ? { message, pageUrl } : undefined
      )
      return
    }

    if (!panel.canUseAI.value) {
      pushEntry({ role: 'assistant', content: t('assistant.offline.noAnswer') })
      return
    }
    queueQuestion(message, pageUrl)
    pushEntry({ role: 'assistant', content: t('assistant.offline.queued') })
  }

  /** « Poser à FleetAi au retour du réseau » sous une réponse de l'aide locale. */
  function askLater(entry: OfflineAssistantEntry) {
    if (!entry.askLater) return
    queueQuestion(entry.askLater.message, entry.askLater.pageUrl)
    entries.value = entries.value.map((candidate) =>
      candidate.id === entry.id ? { ...candidate, askLater: undefined } : candidate
    )
    toast.info(t('assistant.offline.askLaterDone'))
  }

  function removePending(id: string) {
    pendingQuestions.value = pendingQuestions.value.filter((question) => question.id !== id)
    persistPending()
  }

  function notifyAnswered(count: number) {
    if (count === 0) return
    toast.success(t('assistant.offline.answered', { count: String(count) }), {
      action: { label: t('assistant.offline.openPanel'), onClick: () => panel.open() },
    })
  }

  /**
   * Retour du réseau : les questions partent une à une, dans l'ordre, sur la
   * conversation active (ou en ouvrent une). La réponse arrive dans le fil
   * normal ; un toast la signale, le panneau peut être fermé.
   */
  function drainPendingQuestions(answered = 0) {
    if (isDraining || isOffline.value || !panel.canUseAI.value) return
    const [question] = pendingQuestions.value
    if (!question) {
      notifyAnswered(answered)
      return
    }
    // Une proposition d'action attend une confirmation : le serveur refuserait
    // la suite tant qu'elle n'est pas tranchée. Les questions restent en file.
    if (panel.conversation.value?.pendingAction) {
      notifyAnswered(answered)
      return
    }

    isDraining = true
    let settled = false
    const conversation = panel.conversation.value
    const url = conversation
      ? `/assistant/conversations/${conversation.token}/messages`
      : '/assistant/conversations'

    router.post(
      url,
      {
        message: question.message,
        pageUrl: question.pageUrl,
        tzOffsetMinutes: question.tzOffsetMinutes,
      },
      {
        preserveScroll: true,
        preserveState: true,
        only: ['assistantConversation', 'errors', 'flash'],
        onSuccess: () => {
          settled = true
          removePending(question.id)
          const flash = (page.props as Record<string, unknown>).flash as
            | Record<string, unknown>
            | undefined
          isDraining = false
          // Refus rendu en flash (quota épuisé…) : déjà affiché par les toasts
          // flash. La question est retirée pour ne pas la reposer à chaque probe.
          if (flash?.error) {
            notifyAnswered(answered)
            return
          }
          drainPendingQuestions(answered + 1)
        },
        onError: () => {
          // Validation (message trop long…) : reposer ne changerait rien.
          settled = true
          removePending(question.id)
          isDraining = false
          drainPendingQuestions(answered)
        },
        onFinish: () => {
          // Coupure ou 5xx : la question reste, la prochaine probe réussie relance.
          if (!settled) isDraining = false
        },
      }
    )
  }

  return {
    isOffline,
    entries,
    pendingQuestions,
    ask,
    askLater,
    removePending,
    drainPendingQuestions,
  }
}
