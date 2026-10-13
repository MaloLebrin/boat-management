import { useDateFormat } from '~/composables/use_date_format'
import { useT } from '~/composables/use_t'
import {
  listCachedBoats,
  readOfflineBoatSnapshot,
  readPreparedBoat,
} from '~/lib/offline_boat_cache'
import {
  OFFLINE_ANSWER_MAX_ROWS,
  activeEngines,
  asksFuelLevel,
  boatIdFromPageUrl,
  detectOfflineBoatIntent,
  latestFuelLog,
  latestNavigationLog,
  mentionedBoatId,
  openIncidents,
  upcomingTasks,
  type OfflineBoatIntent,
  type OfflineBoatSnapshot,
} from '~/lib/offline_boat_context'
import type { MaintenanceTaskRow } from '~/types/boat_show'
import { engineDisplayTitle } from '~/utils/boat_enum_labels'

/**
 * Réponses factuelles sur le bateau, sans réseau (#982).
 *
 * Avant l'aide produit (#971) : une question reconnue (échéances, heures
 * moteur, carburant, incidents, journal) est répondue depuis la fiche en
 * cache, avec la date de ses données. Le reste suit le chemin de #971.
 */

export interface OfflineBoatReply {
  content: string
  /** Absent sur la question « quel bateau ? » : rien n'est encore répondu. */
  link?: { href: string; label: string }
  /** Réponse tirée des données du bateau (badge de source). */
  fromBoatData: boolean
}

/** Intention mise de côté le temps que l'utilisateur dise de quel bateau il parle. */
let awaitingBoatChoice: OfflineBoatIntent | null = null

export function resetOfflineBoatAnswer() {
  awaitingBoatChoice = null
}

/** Onglet ouvert par le lien : un des onglets pré-chargés par « Préparer la traversée ». */
const INTENT_TAB: Record<OfflineBoatIntent, string | null> = {
  maintenance: null,
  engineHours: null,
  fuel: 'fuel',
  incidents: 'incidents',
  logbook: 'navigation-logs',
}

export function useOfflineBoatAnswer() {
  const { t } = useT()
  const { formatDate } = useDateFormat()

  function header(snapshot: OfflineBoatSnapshot, cachedAt: Date | null): string {
    return cachedAt
      ? t('assistant.offline.boat.freshness', {
          boat: snapshot.boatName,
          date: formatDate(cachedAt),
        })
      : snapshot.boatName
  }

  function bullets(lines: string[]): string {
    return lines.map((line) => `• ${line}`).join('\n')
  }

  function maintenanceLines(tasks: readonly MaintenanceTaskRow[]): string[] {
    return tasks.map((task) => {
      if (task.dueAt)
        return t('assistant.offline.boat.taskDate', {
          title: task.title,
          date: formatDate(task.dueAt),
        })
      return t('assistant.offline.boat.taskHours', {
        title: task.title,
        hours: String(task.dueEngineHours),
      })
    })
  }

  /** Texte d'une intention ; `null` si la section n'a pas été mise en cache. */
  function body(
    intent: OfflineBoatIntent,
    snapshot: OfflineBoatSnapshot,
    question: string
  ): { text: string; cachedAt: Date | null } | null {
    switch (intent) {
      case 'maintenance': {
        if (!snapshot.maintenanceTasks) return null
        const tasks = upcomingTasks(snapshot.maintenanceTasks.rows)
        const text = tasks.length
          ? `${t('assistant.offline.boat.maintenanceTitle', { count: String(tasks.length) })}\n${bullets(maintenanceLines(tasks.slice(0, OFFLINE_ANSWER_MAX_ROWS)))}`
          : t('assistant.offline.boat.maintenanceNone')
        return { text, cachedAt: snapshot.maintenanceTasks.cachedAt }
      }
      case 'engineHours': {
        const engines = activeEngines(snapshot.engines)
        const text = engines.length
          ? bullets(
              engines.map((engine) =>
                engine.hours === null
                  ? t('assistant.offline.boat.engineNoHours', {
                      engine: engineDisplayTitle(t, engine),
                    })
                  : t('assistant.offline.boat.engineHours', {
                      engine: engineDisplayTitle(t, engine),
                      hours: String(engine.hours),
                    })
              )
            )
          : t('assistant.offline.boat.enginesNone')
        return { text, cachedAt: snapshot.cachedAt }
      }
      case 'fuel': {
        if (!snapshot.fuelLogs) return null
        const log = latestFuelLog(snapshot.fuelLogs.rows)
        const lines = [
          log
            ? t('assistant.offline.boat.fuelLast', {
                date: formatDate(log.fueledAt),
                liters: String(log.quantityLiters),
              })
            : t('assistant.offline.boat.fuelNone'),
        ]
        if (log && log.engineHoursAtFueling !== null) {
          lines.push(
            t('assistant.offline.boat.fuelHours', { hours: String(log.engineHoursAtFueling) })
          )
        }
        if (asksFuelLevel(question)) lines.push(t('assistant.offline.boat.fuelLevelUnknown'))
        return { text: lines.join('\n'), cachedAt: snapshot.fuelLogs.cachedAt }
      }
      case 'incidents': {
        if (!snapshot.incidents) return null
        const incidents = openIncidents(snapshot.incidents.rows)
        const text = incidents.length
          ? `${t('assistant.offline.boat.incidentsTitle', { count: String(incidents.length) })}\n${bullets(
              incidents.slice(0, OFFLINE_ANSWER_MAX_ROWS).map((incident) =>
                t('assistant.offline.boat.incidentLine', {
                  type: t(`incidents.type.${incident.type}`),
                  date: formatDate(incident.occurredAt),
                  description: incident.description,
                })
              )
            )}`
          : t('assistant.offline.boat.incidentsNone')
        return { text, cachedAt: snapshot.incidents.cachedAt }
      }
      case 'logbook': {
        if (!snapshot.navigationLogs) return null
        const log = latestNavigationLog(snapshot.navigationLogs.rows)
        if (!log)
          return {
            text: t('assistant.offline.boat.logbookNone'),
            cachedAt: snapshot.navigationLogs.cachedAt,
          }
        const lines = [
          t(
            log.arrivedAt
              ? 'assistant.offline.boat.logbookLast'
              : 'assistant.offline.boat.logbookOngoing',
            {
              date: formatDate(log.departedAt),
              from: log.departurePortName ?? '—',
              to: log.arrivalPortName ?? '—',
            }
          ),
        ]
        if (log.distanceNm !== null) {
          lines.push(
            t('assistant.offline.boat.logbookDistance', { distance: String(log.distanceNm) })
          )
        }
        if (log.notes) lines.push(log.notes)
        return { text: lines.join('\n'), cachedAt: snapshot.navigationLogs.cachedAt }
      }
    }
  }

  function reply(
    intent: OfflineBoatIntent,
    snapshot: OfflineBoatSnapshot,
    question: string
  ): OfflineBoatReply {
    const tab = INTENT_TAB[intent]
    const link = {
      href: `/boats/${snapshot.boatId}${tab ? `?tab=${tab}` : ''}`,
      label: t('assistant.offline.boat.openBoat', { boat: snapshot.boatName }),
    }
    const found = body(intent, snapshot, question)
    if (!found) {
      return {
        content: t('assistant.offline.boat.notPrepared', { boat: snapshot.boatName }),
        link,
        fromBoatData: false,
      }
    }
    return {
      content: `${header(snapshot, found.cachedAt)}\n\n${found.text}`,
      link,
      fromBoatData: true,
    }
  }

  /**
   * Bateau visé : celui que la question nomme, puis celui de la page, puis le
   * dernier préparé, puis le seul en cache. Sinon on demande lequel.
   */
  async function answer(question: string, pageUrl: string): Promise<OfflineBoatReply | null> {
    const awaiting = awaitingBoatChoice
    awaitingBoatChoice = null
    const detected = detectOfflineBoatIntent(question)
    const intent = detected ?? awaiting
    if (!intent) return null

    const boats = await listCachedBoats()
    const cachedIds = new Set(boats.map((boat) => boat.id))
    const named = mentionedBoatId(question, boats)
    // Réponse à « quel bateau ? » qui n'en nomme aucun : nouvelle question.
    if (!detected && named === null) return null

    // Rien en cache (pas de service worker, traversée jamais préparée) :
    // l'aide produit en dira plus que « préparez la traversée ».
    if (boats.length === 0) return null
    const pageBoat = boatIdFromPageUrl(pageUrl)
    if (named === null && pageBoat !== null && !cachedIds.has(pageBoat)) {
      return { content: t('assistant.offline.boat.pageNotPrepared'), fromBoatData: false }
    }

    const prepared = readPreparedBoat()
    const boatId =
      named ??
      pageBoat ??
      (prepared !== null && cachedIds.has(prepared) ? prepared : null) ??
      (boats.length === 1 ? boats[0].id : null)

    if (boatId === null) {
      awaitingBoatChoice = intent
      return {
        content: t('assistant.offline.boat.whichBoat', {
          boats: boats.map((boat) => boat.name).join(', '),
        }),
        fromBoatData: false,
      }
    }

    const snapshot = await readOfflineBoatSnapshot(boatId)
    return snapshot ? reply(intent, snapshot, question) : null
  }

  return { answer }
}
